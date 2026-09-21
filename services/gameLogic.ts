import {
  PieceType, Owner, GRID_SIZE,
  Piece, Board, Position, Direction, DirKey, GameConfig, Difficulty
} from '../types';
import {
  traceBeam, cellCentre, INTENSITY_FLOOR, TraceResult, Vec
} from './optics';

/** Piece movement directions. Light no longer uses these -- see optics.ts. */
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

/**
 * How many hits a generator survives. On the teaching tiers one clean shot
 * ends it, which keeps a demonstration short. On MODERATE and HARD it takes
 * two, so a single lucky beam no longer decides the match and both sides have
 * to work an angle twice.
 */
export const coreHealthFor = (difficulty: Difficulty): number =>
  difficulty === 'NORMAL' || difficulty === 'HARD' ? 2 : 1;

/**
 * DEMO lane. In DEMO the board is seeded with one prism on the opponent's home
 * row, in the player's starting column, so a single total internal reflection
 * can reach the opponent's generator:
 *
 *   row 0:  [AI shooter] . . [AI core] <- <- <- [PRISM]
 *                                                  ^
 *   col 7:                                         ^  (rows 1-6 kept clear)
 *                                                  ^
 *   row 7:                      [your core] . . [your shooter]
 *
 * The prism starts at 90 deg, so the first shot strikes the slanted face and
 * refracts out -- the mirror misconception. Rotating it to 0 deg turns the
 * beam through one total internal reflection straight into the core.
 *
 * The lane cells are off-limits to the DEMO opponent so the set-up survives
 * its turn.
 */
export const DEMO_PRISM = { x: GRID_SIZE - 1, y: 0, rotation: 90 } as const;

export const isDemoLane = (x: number, y: number): boolean =>
  (x === GRID_SIZE - 1 && y <= GRID_SIZE - 2) || (y === 0 && x >= 3);

export const createBoard = (config: Pick<GameConfig, 'prismCount' | 'blockCount' | 'difficulty'>): Board => {
  const coreHp = coreHealthFor(config.difficulty);
  const board: Board = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, EMPTY_CELL)
  );

  board[0][0] = { type: PieceType.SHOOTER, owner: Owner.AI, rotation: 180 };
  board[GRID_SIZE - 1][GRID_SIZE - 1] = { type: PieceType.SHOOTER, owner: Owner.PLAYER, rotation: 0 };

  board[0][3] = { type: PieceType.KING, owner: Owner.AI, rotation: 180, health: coreHp };
  board[GRID_SIZE - 1][4] = { type: PieceType.KING, owner: Owner.PLAYER, rotation: 0, health: coreHp };

  const demo = config.difficulty === 'DEMO';
  if (demo) {
    board[DEMO_PRISM.y][DEMO_PRISM.x] = {
      type: PieceType.PRISM,
      owner: Owner.NONE,
      rotation: DEMO_PRISM.rotation
    };
  }

  const placeRandom = (count: number, type: PieceType, validRows: number[]) => {
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < 200) {
      const r = validRows[Math.floor(Math.random() * validRows.length)];
      const c = Math.floor(Math.random() * GRID_SIZE);
      if (demo && isDemoLane(c, r)) { attempts++; continue; }
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

// --- FIRING --------------------------------------------------------------

/**
 * Which shots may destroy a generator.
 *
 *  'physical'  — anything that arrives with power, including a lucky refracted
 *                beam. This is what real optics does, so it is the default.
 *  'classroom' — only a beam still travelling along a row or column, i.e. one
 *                carried entirely by total internal reflection. Refraction
 *                knocks the beam onto an odd angle and disqualifies it. Use
 *                this when the lesson has to be enforced for marking.
 */
export type KillRule = 'physical' | 'classroom';

export const isAxisAligned = (d: Vec, tol = 1e-6) =>
  Math.abs(d.x) < tol || Math.abs(d.y) < tol;

export interface ShotResult extends TraceResult {
  owner: Owner;
  /** Full-power reflections; drives combo scoring. */
  tir: number;
}

/** Fire the shooter belonging to `owner`. Pure. */
export const fireBeam = (
  board: Board,
  shooter: Position | null,
  owner: Owner,
  rule: KillRule = 'physical'
): ShotResult | null => {
  if (!shooter) return null;
  const direction: Vec = owner === Owner.PLAYER ? { x: 0, y: -1 } : { x: 0, y: 1 };
  const trace = traceBeam(board, cellCentre(shooter), direction, {
    ignoreCell: shooter,
    stopOnRefraction: rule === 'classroom'
  });
  return { ...trace, owner, tir: trace.tirCount };
};

export const shotDestroysCore = (shot: ShotResult | null, rule: KillRule): boolean => {
  if (!shot?.hit || shot.hit.piece.type !== PieceType.KING) return false;
  if (shot.intensity < INTENSITY_FLOOR) return false;
  if (rule === 'classroom') return isAxisAligned(shot.direction);
  return true;
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

/** Scoring counts total internal reflections only. Refraction earns nothing. */
export const calculateScore = (tirCount: number): number => {
  if (tirCount === 0) return 50;
  if (tirCount === 1) return 100;
  if (tirCount === 2) return 200;
  return tirCount * 100 * 2; // SUPER COMBO
};
