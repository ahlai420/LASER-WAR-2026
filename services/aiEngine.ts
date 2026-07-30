import {
  PieceType, Owner, GRID_SIZE, Board, Position, Difficulty
} from '../types';
import {
  traceLaser, findPiece, legalShooterSlots, getLegalMoves,
  isControllable, applyMove, applyRotation, opponentOf, homeRow
} from './gameLogic';

/**
 * Strategic AI.
 *
 * The previous opponent picked a random piece, nudged it in a random
 * direction and parked its shooter on a random column -- it never once looked
 * at where the beam would go. This engine scores candidate board states by
 * actually tracing the laser, so it plays toward a kill and away from being
 * killed.
 *
 * Everything here is pure. `planTurn` returns the full sequence of actions
 * plus the resulting board, which lets the UI animate the moves one at a time
 * without the stale-closure bug that made mid-turn moves overwrite each other.
 */

export type AIAction =
  | { kind: 'MOVE'; from: Position; to: Position; cost: number; label: string }
  | { kind: 'ROTATE'; at: Position; rotation: number; cost: number; label: string }
  | { kind: 'AIM'; from: Position; to: Position; cost: 0; label: string };

export interface AIPlan {
  actions: AIAction[];
  board: Board;
  intent: string;
}

interface Weights {
  defense: number;
  /** 0 = always best move, 1 = fully random */
  noise: number;
  topK: number;
  /**
   * How well the AI aims before firing. Repositioning is free, so an engine
   * that always aims optimally is dangerous no matter how badly it moves --
   * EASY has to aim sloppily too or it isn't actually easy.
   */
  aim: 'random' | 'best';
  /**
   * Chance per turn of settling for the second-best firing position. Without
   * this, NORMAL and HARD play almost identically -- the defense weight only
   * separates them against an opponent good enough to punish it.
   */
  blunder: number;
};

const WEIGHTS: Record<Difficulty, Weights> = {
  EASY:   { defense: 0.0,  noise: 1.0, topK: 1, aim: 'random', blunder: 0 },
  NORMAL: { defense: 0.55, noise: 0.0, topK: 3, aim: 'best',   blunder: 0.4 },
  HARD:   { defense: 1.0,  noise: 0.0, topK: 1, aim: 'best',   blunder: 0 }
};

const KILL_VALUE = 100_000;
const SUICIDE_VALUE = -120_000;

const manhattan = (a: Position, b: Position) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

interface ShotEval {
  value: number;
  kills: boolean;
  /** Full-power TIR bounces on this shot. */
  prismHits: number;
  from: Position | null;
}

/**
 * Best shot available to `owner` on this board, considering every legal
 * shooter placement on their home row (repositioning before firing is free).
 */
export const rankedShots = (board: Board, owner: Owner): ShotEval[] => {
  const shooter = findPiece(board, PieceType.SHOOTER, owner);
  const enemyKing = findPiece(board, PieceType.KING, opponentOf(owner));
  if (!shooter) return [];

  const out: ShotEval[] = [];

  for (const slot of legalShooterSlots(board, owner)) {
    const sim = slot.x === shooter.x && slot.y === shooter.y
      ? board
      : applyMove(board, shooter, slot);

    const { path, tirHits, hit } = traceLaser(sim, slot, owner);

    let value: number;
    if (hit && hit.piece.type === PieceType.KING) {
      value = hit.piece.owner === owner
        ? SUICIDE_VALUE
        : KILL_VALUE + tirHits * 500;
    } else {
      // No kill: reward getting the beam close to the target and using optics.
      let closest = GRID_SIZE * 2;
      if (enemyKing) {
        for (const p of path) closest = Math.min(closest, manhattan(p, enemyKing));
      }
      // Only TIR is worth chasing; a refracted beam is a dead end for the AI too.
      value = (GRID_SIZE * 2 - closest) * 30 + tirHits * 25;

      // Chipping a block opens a lane, so it is worth a little.
      if (hit && hit.piece.type === PieceType.BLOCK) value += 15;
    }

    out.push({ value, kills: value >= KILL_VALUE, prismHits: tirHits, from: slot });
  }

  return out.sort((a, b) => b.value - a.value);
};

export const bestShot = (board: Board, owner: Owner): ShotEval => {
  const ranked = rankedShots(board, owner);
  if (ranked.length) return ranked[0];
  return {
    value: 0,
    kills: false,
    prismHits: 0,
    from: findPiece(board, PieceType.SHOOTER, owner)
  };
};

const evaluate = (board: Board, me: Owner, w: Weights): number => {
  const mine = bestShot(board, me);
  const theirs = bestShot(board, opponentOf(me));
  return mine.value - theirs.value * w.defense;
};

const enumerateActions = (board: Board, me: Owner, ap: number): AIAction[] => {
  const actions: AIAction[] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = board[y][x];
      if (!isControllable(cell, me)) continue;
      const from = { x, y };

      for (const to of getLegalMoves(board, from, ap)) {
        actions.push({
          kind: 'MOVE',
          from,
          to,
          cost: manhattan(from, to),
          label: `moved ${cell.type === PieceType.PRISM ? 'a prism' : cell.type === PieceType.BLOCK ? 'a block' : 'its core'}`
        });
      }

      if (cell.type === PieceType.PRISM && ap >= 1) {
        for (const rotation of [0, 90, 180, 270]) {
          if (rotation === ((cell.rotation % 360) + 360) % 360) continue;
          actions.push({
            kind: 'ROTATE',
            at: from,
            rotation,
            cost: 1,
            label: `rotated a prism to ${rotation}°`
          });
        }
      }
    }
  }

  return actions;
};

const applyAction = (board: Board, action: AIAction): Board => {
  if (action.kind === 'ROTATE') return applyRotation(board, action.at, action.rotation);
  return applyMove(board, action.from, action.to);
};

export const planTurn = (board: Board, ap: number, difficulty: Difficulty): AIPlan => {
  const w = WEIGHTS[difficulty];
  const me = Owner.AI;

  let current = board;
  let remaining = ap;
  const actions: AIAction[] = [];

  while (remaining > 0) {
    const candidates = enumerateActions(current, me, remaining).filter(a => a.cost <= remaining);
    if (candidates.length === 0) break;

    const baseline = evaluate(current, me, w);
    const scored = candidates
      .map(action => ({ action, value: evaluate(applyAction(current, action), me, w) }))
      .sort((a, b) => b.value - a.value);

    let chosen: typeof scored[number];
    if (w.noise >= 1) {
      chosen = scored[Math.floor(Math.random() * scored.length)];
    } else {
      const pool = scored.slice(0, Math.max(1, Math.min(w.topK, scored.length)));
      chosen = pool[Math.floor(Math.random() * pool.length)];
    }

    // Passing beats actively worsening our own position.
    if (w.noise < 1 && chosen.value <= baseline) break;

    current = applyAction(current, chosen.action);
    remaining -= chosen.action.cost;
    actions.push(chosen.action);

    // A guaranteed kill is on the board; stop spending and take the shot.
    if (bestShot(current, me).kills && Math.random() >= w.blunder) break;
  }

  // Free aim step: slide the shooter into its firing position.
  const shooter = findPiece(current, PieceType.SHOOTER, me);
  let target: Position | null = null;
  if (shooter) {
    if (w.aim === 'best') {
      const ranked = rankedShots(current, me);
      const idx = w.blunder > 0 && ranked.length > 1 && Math.random() < w.blunder ? 1 : 0;
      target = ranked[idx]?.from ?? null;
    } else {
      const slots = legalShooterSlots(current, me);
      target = slots.length ? slots[Math.floor(Math.random() * slots.length)] : null;
    }
  }

  if (shooter && target && (target.x !== shooter.x || target.y !== shooter.y)) {
    current = applyMove(current, shooter, target);
    actions.push({
      kind: 'AIM',
      from: shooter,
      to: target,
      cost: 0,
      label: `repositioned to column ${target.x + 1}`
    });
  }

  const shot = bestShot(current, me);
  const intent = shot.kills
    ? 'firing solution locked'
    : shot.prismHits > 0
      ? `routing through ${shot.prismHits} reflection${shot.prismHits > 1 ? 's' : ''}`
      : 'repositioning';

  return { actions, board: current, intent };
};

/** Used by the hint button so the player can see the same analysis the AI runs. */
export const suggestPlayerShot = (board: Board): ShotEval => bestShot(board, Owner.PLAYER);

export const playerHomeRow = () => homeRow(Owner.PLAYER);
