export enum PieceType {
  EMPTY = 0,
  KING = 1,
  PRISM = 2,
  BLOCK = 3,
  SHOOTER = 4
}

export enum Owner {
  NONE = 0,
  PLAYER = 1,
  AI = 2
}

export enum Phase {
  ROLL = 'ROLL',
  ACTION = 'ACTION',
  SHOOT = 'SHOOT',
  ANIMATING = 'ANIMATING'
}

export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  type: PieceType;
  owner: Owner;
  rotation: number;
  health?: number;
}

export type Board = Piece[][];

export interface BoardCell extends Piece, Position {}

export interface GameConfig {
  prismCount: number;
  blockCount: number;
  difficulty: Difficulty;
}

/**
 * Logs carry their own timestamp. Rendering `new Date()` inside the log list
 * made every row show the current time instead of when the event happened.
 */
export interface LogEntry {
  id: number;
  at: number;
  text: string;
}

export type DirKey = 'UP' | 'RIGHT' | 'DOWN' | 'LEFT' | 'NE' | 'SE' | 'SW' | 'NW';

export interface Direction {
  x: number;
  y: number;
  label: DirKey;
}

export type LaserEventKind = 'reflect' | 'refract';

/** Why the beam stopped. Drives both the log copy and how the beam is drawn. */
export type LaserEnd = 'hit' | 'exit' | 'absorbed' | 'dispersed' | 'loop';

export interface LaserResult {
  /** Cell centres the beam travels through, including the shooter tile. */
  path: Position[];
  /** Every prism the beam touched, reflecting or refracting. */
  prismHits: number;
  /**
   * Total internal reflections only. Scoring uses this, not `prismHits`:
   * a refracted beam has already lost power, so it must not earn combo points.
   */
  tirHits: number;
  /** The piece the beam terminated on, if any. */
  hit: { pos: Position; piece: Piece } | null;
  /** True when the beam left the board without hitting anything. */
  exited: boolean;
  end: LaserEnd;
  /**
   * Index into `path` where the beam stopped being at full power, so the
   * overlay can draw the leaked tail differently from the live beam.
   */
  dispersedFrom: number | null;
}

export interface LeaderboardEntry {
  id?: string;
  player: string;
  score: number;
  date: string;
}

export const GRID_SIZE = 8;

/**
 * Laser rule switches, kept in one place so behaviour can be tuned without
 * hunting through the trace loop.
 *
 * `refractionContinues` is deliberately FALSE. This game teaches the
 * difference between total internal reflection and refraction, so the two
 * mechanisms must not be equally useful:
 *
 *   - Strike a flat leg  -> TIR. 100% of the light turns 90 degrees. Full
 *     power, travels indefinitely, can destroy a generator.
 *   - Strike the slanted hypotenuse -> refraction. The light crosses a
 *     glass/air boundary twice (once entering, once leaving), scattering and
 *     losing power each time. It leaks out at an angle and dies.
 *
 * A refracted beam therefore CANNOT destroy a generator and earns no combo
 * points. That asymmetry is the lesson: only TIR is a usable weapon.
 *
 * `refractionLeakTiles` is how far the leaked light is drawn before it fades,
 * purely so students can see where the energy went.
 *
 * Setting `refractionContinues` to true makes refracted beams behave like
 * mirrors that travel forever. It breaks the teaching model — it is here only
 * as an escape hatch for non-educational play.
 */
export const LASER_RULES = {
  refractionContinues: false,
  refractionLeakTiles: 1,
  maxSteps: 64
};
