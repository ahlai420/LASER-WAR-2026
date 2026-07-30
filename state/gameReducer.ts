import {
  Board, Owner, Phase, Piece, PieceType, Position, GameConfig, LogEntry, Difficulty
} from '../types';
import {
  createBoard, applyMove, applyRotation, cloneBoard, EMPTY_CELL, calculateScore
} from '../services/gameLogic';

/**
 * All mutable game state lives here.
 *
 * The original build kept ~20 `useState` values and drove the AI turn from an
 * async function. Because that function captured `board` from its render
 * closure, every move it made during a multi-AP turn was derived from the same
 * stale snapshot -- so a 3-AP turn visibly moved three pieces but only the last
 * one survived. A reducer always receives current state, which removes the
 * whole class of bug.
 *
 * Note: the mission clock deliberately does NOT live here. Ticking it once a
 * second through this reducer re-rendered all 64 board cells every second.
 */

export type InteractionMode = 'NONE' | 'MENU' | 'MOVE' | 'ROTATE';

export interface Explosion extends Position {
  type: 'generic' | 'block';
}

export interface Selection extends Position {
  type: PieceType;
}

export interface GameState {
  view: 'lobby' | 'game';
  nickname: string;
  config: GameConfig;

  board: Board;
  phase: Phase;
  turnOwner: Owner;

  diceValue: number;
  actionPoints: number;
  isRolling: boolean;

  laserPath: Position[];
  /** Index in laserPath where TIR gave way to refraction, if it did. */
  laserDispersedFrom: number | null;
  explosions: Explosion[];
  explodingKing: Owner | null;
  combo: string | null;

  selected: Selection | null;
  interactionMode: InteractionMode;
  /** Repositioning the shooter is free but limited to once per turn. */
  aimUsed: boolean;

  winner: Owner | null;
  score: number;
  rounds: number;
  logs: LogEntry[];
  logSeq: number;
  aiDialogue: string;
}

export const initialState: GameState = {
  view: 'lobby',
  nickname: '',
  config: { prismCount: 2, blockCount: 2, difficulty: 'NORMAL' },
  board: [],
  phase: Phase.ROLL,
  turnOwner: Owner.PLAYER,
  diceValue: 1,
  actionPoints: 0,
  isRolling: false,
  laserPath: [],
  laserDispersedFrom: null,
  explosions: [],
  explodingKing: null,
  combo: null,
  selected: null,
  interactionMode: 'NONE',
  aimUsed: false,
  winner: null,
  score: 0,
  rounds: 0,
  logs: [],
  logSeq: 0,
  aiDialogue: ''
};

export type Action =
  | { type: 'SET_NICKNAME'; value: string }
  | { type: 'SET_CONFIG'; value: Partial<GameConfig> }
  | { type: 'START_GAME' }
  | { type: 'GO_LOBBY' }
  | { type: 'ROLL_START' }
  | { type: 'ROLL_DONE'; value: number }
  | { type: 'SELECT'; selection: Selection | null; mode: InteractionMode }
  | { type: 'SET_MODE'; mode: InteractionMode }
  | { type: 'MOVE'; from: Position; to: Position; cost: number; note?: string }
  | { type: 'ROTATE'; at: Position; rotation: number; cost: number; note?: string }
  | { type: 'AIM'; from: Position; to: Position; note?: string }
  | { type: 'SKIP_ACTION' }
  | { type: 'SET_BOARD'; board: Board }
  | { type: 'SET_PHASE'; phase: Phase }
  | { type: 'SET_LASER'; path: Position[]; dispersedFrom?: number | null }
  | { type: 'DAMAGE_BLOCK'; at: Position }
  | { type: 'CLEAR_EXPLOSION'; at: Position }
  | { type: 'SET_COMBO'; value: string | null }
  | { type: 'WIN'; winner: Owner; loser: Owner; prismHits: number }
  | { type: 'FINALISE_WIN' }
  | { type: 'END_TURN' }
  | { type: 'LOG'; text: string }
  | { type: 'SET_DIALOGUE'; text: string };

const log = (state: GameState, text: string): GameState => ({
  ...state,
  logSeq: state.logSeq + 1,
  logs: [{ id: state.logSeq + 1, at: Date.now(), text }, ...state.logs].slice(0, 50)
});

/** Spending AP down to zero ends the action phase and opens the shot. */
const afterSpend = (state: GameState, ap: number): GameState => ({
  ...state,
  actionPoints: ap,
  selected: null,
  interactionMode: 'NONE',
  phase: ap <= 0 ? Phase.SHOOT : Phase.ACTION
});

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_NICKNAME':
      return { ...state, nickname: action.value };

    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.value } };

    case 'START_GAME':
      return log(
        {
          ...initialState,
          view: 'game',
          nickname: state.nickname,
          config: state.config,
          board: createBoard(state.config),
          logSeq: 0,
          logs: []
        },
        `Mission start. Cmdr ${state.nickname} vs AI Core [${state.config.difficulty}].`
      );

    case 'GO_LOBBY':
      return { ...state, view: 'lobby', winner: null, laserPath: [] };

    case 'ROLL_START':
      return { ...state, isRolling: true };

    case 'ROLL_DONE':
      return log(
        { ...state, isRolling: false, diceValue: action.value, actionPoints: action.value, phase: Phase.ACTION },
        `${state.turnOwner === Owner.PLAYER ? 'You' : 'AI'} rolled ${action.value} AP`
      );

    case 'SELECT':
      return { ...state, selected: action.selection, interactionMode: action.mode };

    case 'SET_MODE':
      return { ...state, interactionMode: action.mode };

    case 'MOVE': {
      const board = applyMove(state.board, action.from, action.to);
      const ap = state.actionPoints - action.cost;
      return log(afterSpend({ ...state, board }, ap), action.note ?? `Moved ${action.cost} — ${Math.max(0, ap)} AP left`);
    }

    case 'ROTATE': {
      const board = applyRotation(state.board, action.at, action.rotation);
      const ap = state.actionPoints - action.cost;
      return log(afterSpend({ ...state, board }, ap), action.note ?? `Rotated to ${action.rotation}° — ${Math.max(0, ap)} AP left`);
    }

    case 'AIM': {
      const board = applyMove(state.board, action.from, action.to);
      return log(
        { ...state, board, aimUsed: true, selected: null, interactionMode: 'NONE' },
        action.note ?? `Aimed at column ${action.to.x + 1}`
      );
    }

    case 'SKIP_ACTION':
      // Rolling AP with no worthwhile (or no legal) move used to strand the
      // player in the ACTION phase with no way to reach the shot.
      return log(
        { ...state, phase: Phase.SHOOT, selected: null, interactionMode: 'NONE' },
        `Held position with ${state.actionPoints} AP unspent`
      );

    case 'SET_BOARD':
      return { ...state, board: action.board };

    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'SET_LASER':
      return { ...state, laserPath: action.path, laserDispersedFrom: action.dispersedFrom ?? null };

    case 'DAMAGE_BLOCK': {
      const board = cloneBoard(state.board);
      const cell = board[action.at.y][action.at.x];
      const health = (cell.health ?? 2) - 1;
      if (health <= 0) {
        board[action.at.y][action.at.x] = EMPTY_CELL();
        return log(
          { ...state, board, explosions: [...state.explosions, { ...action.at, type: 'block' }] },
          'Block destroyed'
        );
      }
      board[action.at.y][action.at.x] = { ...cell, health } as Piece;
      return log({ ...state, board }, 'Block cracked');
    }

    case 'CLEAR_EXPLOSION':
      return {
        ...state,
        explosions: state.explosions.filter(e => e.x !== action.at.x || e.y !== action.at.y)
      };

    case 'SET_COMBO':
      return { ...state, combo: action.value };

    case 'WIN': {
      const combo =
        action.prismHits >= 3
          ? `SUPER COMBO ${action.prismHits}!`
          : action.prismHits > 0
            ? `COMBO ${action.prismHits}!`
            : null;
      return {
        ...state,
        explodingKing: action.loser,
        combo,
        score: action.winner === Owner.PLAYER ? calculateScore(action.prismHits) : 0,
        phase: Phase.ANIMATING
      };
    }

    case 'FINALISE_WIN':
      return { ...state, winner: state.explodingKing === Owner.PLAYER ? Owner.AI : Owner.PLAYER };

    case 'END_TURN': {
      const next = state.turnOwner === Owner.PLAYER ? Owner.AI : Owner.PLAYER;
      return log(
        {
          ...state,
          turnOwner: next,
          phase: Phase.ROLL,
          laserPath: [],
          laserDispersedFrom: null,
          actionPoints: 0,
          selected: null,
          interactionMode: 'NONE',
          aimUsed: false,
          combo: null,
          aiDialogue: next === Owner.PLAYER ? '' : state.aiDialogue,
          // One round = both sides have acted.
          rounds: next === Owner.PLAYER ? state.rounds + 1 : state.rounds
        },
        next === Owner.PLAYER ? 'Your turn' : 'AI turn'
      );
    }

    case 'LOG':
      return log(state, action.text);

    case 'SET_DIALOGUE':
      return { ...state, aiDialogue: action.text };

    default:
      return state;
  }
}

export const difficultyLabels: Record<Difficulty, string> = {
  EASY: 'RECRUIT',
  NORMAL: 'VETERAN',
  HARD: 'ACE'
};
