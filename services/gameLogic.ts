import {
  PieceType, Owner, GRID_SIZE, LASER_RULES,
  Piece, Board, Position, Direction, DirKey, LaserResult, GameConfig
} from '../types';

export const DIRS: Record<DirKey, Direction> = {
  UP:    { x: 0,  y: -1, label: 'UP' },
  RIGHT: { x: 1,  y: 0,  label: 'RIGHT' },
  DOWN:  { x: 0,  y: 1,  label: 'DOWN' },
  LEFT:  { x: -1, y: 0,  label: 'LEFT' },
  NE:    { x: 1,  y: -1, label: 'NE' },
  SE:    { x: 1,  y: 1,  label: 'SE' },
  SW:    { x: -1, y: 1,  label: 'SW' },
  NW:    { x: -1, y: -1, label: 'NW' }
};

export const ORTHOGONAL: Direction[] = [DIRS.UP, DIRS.RIGHT, DIRS.DOWN, DIRS.LEFT];

/**
 * Prism optics as a lookup table instead of an if/else ladder.
 *
 * Mapping is identical to the original implementation: hitting a leg (flat
 * face) reflects the beam 90 degrees (TIR), hitting the hypotenuse refracts it
 * onto the matching diagonal. Diagonal input along the prism's own refraction
 * axis passes straight through, which is what allows multi-prism chains.
 * Anything not listed is absorbed and the beam dies.
 */
const PRISM_OPTICS: Record<number, Partial<Record<DirKey, { out: DirKey; kind: 'reflect' | 'refract' }>>> = {
  0: {
    UP:    { out: 'LEFT', kind: 'reflect' },
    RIGHT: { out: 'DOWN', kind: 'reflect' },
    DOWN:  { out: 'SW',   kind: 'refract' },
    LEFT:  { out: 'SW',   kind: 'refract' },
    SW:    { out: 'SW',   kind: 'refract' }
  },
  90: {
    DOWN:  { out: 'LEFT', kind: 'reflect' },
    RIGHT: { out: 'UP',   kind: 'reflect' },
    UP:    { out: 'NW',   kind: 'refract' },
    LEFT:  { out: 'NW',   kind: 'refract' },
    NW:    { out: 'NW',   kind: 'refract' }
  },
  180: {
    DOWN:  { out: 'RIGHT', kind: 'reflect' },
    LEFT:  { out: 'UP',    kind: 'reflect' },
    UP:    { out: 'NE',    kind: 'refract' },
    RIGHT: { out: 'NE',    kind: 'refract' },
    NE:    { out: 'NE',    kind: 'refract' }
  },
  270: {
    UP:    { out: 'RIGHT', kind: 'reflect' },
    LEFT:  { out: 'DOWN',  kind: 'reflect' },
    DOWN:  { out: 'SE',    kind: 'refract' },
    RIGHT: { out: 'SE',    kind: 'refract' },
    SE:    { out: 'SE',    kind: 'refract' }
  }
};

export const EMPTY_CELL = (): Piece => ({ type: PieceType.EMPTY, owner: Owner.NONE, rotation: 0 });

export const inBounds = (x: number, y: number) =>
  x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;

/** Deep-enough clone: rows and cells are both copied, so callers never mutate shared state. */
export const cloneBoard = (board: Board): Board =>
  board.map(row => row.map(cell => ({ ...cell })));

/** Home row a shooter may be positioned on. */
export const homeRow = (owner: Owner) => (owner === Owner.PLAYER ? GRID_SIZE - 1 : 0);

export const opponentOf = (owner: Owner) => (owner === Owner.PLAYER ? Owner.AI : Owner.PLAYER);

// --- BOARD SETUP -------------------------------------------------------------

export const createBoard = (config: Pick<GameConfig, 'prismCount' | 'blockCount'>): Board => {
  const board: Board = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, EMPTY_CELL)
  );

  board[0][0] = { type: PieceType.SHOOTER, owner: Owner.AI, rotation: 180 };
  board[GRID_SIZE - 1][GRID_SIZE - 1] = { type: PieceType.SHOOTER, owner: Owner.PLAYER, rotation: 0 };

  board[0][3] = { type: PieceType.KING, owner: Owner.AI, rotation: 180 };
  board[GRID_SIZE - 1][4] = { type: PieceType.KING, owner: Owner.PLAYER, rotation: 0 };

  const placeRandom = (count: number, type: PieceType, validRows: number[]) => {
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < 200) {
      const r = validRows[Math.floor(Math.random() * validRows.length)];
      const c = Math.floor(Math.random() * GRID_SIZE);
      if (board[r][c].type === PieceType.EMPTY) {
        board[r][c] = {
          type,
          owner: Owner.NONE,
          rotation: type === PieceType.PRISM ? Math.floor(Math.random() * 4) * 90 : 0,
          health: type === PieceType.BLOCK ? 2 : undefined
        };
        placed++;
      }
      attempts++;
    }
  };

  // Counts are per half, so the board stays symmetric.
  placeRandom(config.prismCount, PieceType.PRISM, [4, 5, 6]);
  placeRandom(config.blockCount, PieceType.BLOCK, [4, 5, 6]);
  placeRandom(config.prismCount, PieceType.PRISM, [1, 2, 3]);
  placeRandom(config.blockCount, PieceType.BLOCK, [1, 2, 3]);

  return board;
};

export const findPiece = (board: Board, type: PieceType, owner: Owner): Position | null => {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (board[y][x].type === type && board[y][x].owner === owner) return { x, y };
    }
  }
  return null;
};

// --- LASER -------------------------------------------------------------------

/**
 * Traces the beam from a shooter. Pure: never touches React state.
 *
 * Cycle detection on (x, y, direction) is required now that refracted beams
 * keep travelling -- two facing prisms would otherwise loop forever.
 */
export const traceLaser = (board: Board, shooterPos: Position | null, owner: Owner): LaserResult => {
  const empty: LaserResult = {
    path: [], prismHits: 0, tirHits: 0, hit: null,
    exited: false, end: 'absorbed', dispersedFrom: null
  };
  if (!shooterPos) return empty;

  const path: Position[] = [{ x: shooterPos.x, y: shooterPos.y }];
  let dir: Direction = owner === Owner.PLAYER ? DIRS.UP : DIRS.DOWN;
  let x = shooterPos.x + dir.x;
  let y = shooterPos.y + dir.y;

  let prismHits = 0;
  let tirHits = 0;
  let steps = 0;
  const seen = new Set<string>();

  const done = (
    end: LaserResult['end'],
    hit: LaserResult['hit'] = null,
    dispersedFrom: number | null = null
  ): LaserResult => ({
    path, prismHits, tirHits, hit,
    exited: end === 'exit', end, dispersedFrom
  });

  while (steps < LASER_RULES.maxSteps) {
    if (!inBounds(x, y)) {
      path.push({ x, y });
      return done('exit');
    }

    const key = `${x},${y},${dir.label}`;
    if (seen.has(key)) {
      // Beam is looping; treat it as dissipated rather than hanging the trace.
      return done('loop');
    }
    seen.add(key);

    path.push({ x, y });
    const cell = board[y][x];

    if (
      cell.type === PieceType.BLOCK ||
      cell.type === PieceType.SHOOTER ||
      cell.type === PieceType.KING
    ) {
      return done('hit', { pos: { x, y }, piece: cell });
    }

    if (cell.type === PieceType.PRISM) {
      const rule = PRISM_OPTICS[((cell.rotation % 360) + 360) % 360]?.[dir.label];
      if (!rule) {
        return done('absorbed', { pos: { x, y }, piece: cell });
      }
      dir = DIRS[rule.out];
      prismHits++;

      if (rule.kind === 'reflect') {
        // Total internal reflection: no loss, beam stays lethal.
        tirHits++;
      } else if (!LASER_RULES.refractionContinues) {
        /*
         * Refraction: the light crosses the glass boundary twice and leaves
         * scattered and weakened. Draw the leak so the loss is visible, then
         * stop. Returning no `hit` is what makes a refracted beam harmless --
         * it cannot destroy a generator even if one is right there.
         */
        const dispersedFrom = path.length - 1;
        for (let leak = 1; leak <= LASER_RULES.refractionLeakTiles; leak++) {
          const nx = x + dir.x * leak;
          const ny = y + dir.y * leak;
          if (!inBounds(nx, ny)) break;
          path.push({ x: nx, y: ny });
        }
        return done('dispersed', null, dispersedFrom);
      }
    }

    x += dir.x;
    y += dir.y;
    steps++;
  }

  return done('absorbed');
};

// --- MOVEMENT ----------------------------------------------------------------

export const isPathClear = (board: Board, from: Position, to: Position): boolean => {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  if (dx !== 0 && dy !== 0) return false; // orthogonal moves only

  let x = from.x + dx;
  let y = from.y + dy;
  while (x !== to.x || y !== to.y) {
    if (!inBounds(x, y) || board[y][x].type !== PieceType.EMPTY) return false;
    x += dx;
    y += dy;
  }
  return inBounds(to.x, to.y) && board[to.y][to.x].type === PieceType.EMPTY;
};

/** Every empty tile the piece at `from` can legally reach with `ap` points. */
export const getLegalMoves = (board: Board, from: Position, ap: number): Position[] => {
  const out: Position[] = [];
  for (const dir of ORTHOGONAL) {
    for (let step = 1; step <= ap; step++) {
      const x = from.x + dir.x * step;
      const y = from.y + dir.y * step;
      if (!inBounds(x, y) || board[y][x].type !== PieceType.EMPTY) break;
      out.push({ x, y });
    }
  }
  return out;
};

/** A piece is interactive if it belongs to `owner` or is neutral scenery. */
export const isControllable = (cell: Piece, owner: Owner): boolean => {
  if (cell.type === PieceType.SHOOTER || cell.type === PieceType.EMPTY) return false;
  if (cell.type === PieceType.KING) return cell.owner === owner;
  return cell.type === PieceType.PRISM || cell.type === PieceType.BLOCK || cell.owner === owner;
};

export const applyMove = (board: Board, from: Position, to: Position): Board => {
  const next = cloneBoard(board);
  next[to.y][to.x] = next[from.y][from.x];
  next[from.y][from.x] = EMPTY_CELL();
  return next;
};

export const applyRotation = (board: Board, at: Position, rotation: number): Board => {
  const next = cloneBoard(board);
  next[at.y][at.x] = { ...next[at.y][at.x], rotation };
  return next;
};

/** Empty tiles on `owner`'s home row that the shooter can slide to, plus its current tile. */
export const legalShooterSlots = (board: Board, owner: Owner): Position[] => {
  const row = homeRow(owner);
  const current = findPiece(board, PieceType.SHOOTER, owner);
  const slots: Position[] = [];
  for (let x = 0; x < GRID_SIZE; x++) {
    if (board[row][x].type === PieceType.EMPTY) slots.push({ x, y: row });
  }
  if (current) slots.push(current);
  return slots;
};

// --- SCORING -----------------------------------------------------------------

export const calculateScore = (prismHits: number): number => {
  if (prismHits === 0) return 50;
  if (prismHits === 1) return 100;
  if (prismHits === 2) return 200;
  return prismHits * 100 * 2; // SUPER COMBO
};
