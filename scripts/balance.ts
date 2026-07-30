import { PieceType, Owner, Board, Difficulty } from '../types';
import { traceLaser, createBoard, findPiece, cloneBoard, EMPTY_CELL } from '../services/gameLogic';
import { planTurn } from '../services/aiEngine';

type Result = 'PLAYER' | 'AI' | 'DRAW';

/** Headless game: both seats driven by the AI engine at a given difficulty. */
function playGame(playerLevel: Difficulty, aiLevel: Difficulty): Result {
  let board = createBoard({ prismCount: 2, blockCount: 2 });
  let side: Owner = Owner.PLAYER;

  for (let turn = 0; turn < 160; turn++) {
    const ap = 1 + Math.floor(Math.random() * 3);
    const level = side === Owner.AI ? aiLevel : playerLevel;

    // planTurn plans for Owner.AI, so mirror the board for the player seat.
    const mirrored = side === Owner.PLAYER ? mirror(board) : board;
    const plan = planTurn(mirrored, ap, level);
    board = side === Owner.PLAYER ? mirror(plan.board) : plan.board;

    const shooter = findPiece(board, PieceType.SHOOTER, side);
    const { hit } = traceLaser(board, shooter, side);

    if (hit?.piece.type === PieceType.KING) {
      if (hit.piece.owner !== side) return side === Owner.AI ? 'AI' : 'PLAYER';
      return side === Owner.AI ? 'PLAYER' : 'AI'; // shot own core
    }
    if (hit?.piece.type === PieceType.BLOCK) {
      const h = (hit.piece.health ?? 2) - 1;
      board = cloneBoard(board);
      board[hit.pos.y][hit.pos.x] = h <= 0 ? EMPTY_CELL() : { ...hit.piece, health: h };
    }
    side = side === Owner.PLAYER ? Owner.AI : Owner.PLAYER;
  }
  return 'DRAW';
}

/** Flip rows and swap ownership so the player seat can reuse the AI planner. */
function mirror(board: Board): Board {
  const flipOwner = (o: Owner) => (o === Owner.PLAYER ? Owner.AI : o === Owner.AI ? Owner.PLAYER : o);
  return [...board].reverse().map(row =>
    row.map(c => ({ ...c, owner: flipOwner(c.owner) }))
  );
}

const N = 300;
const levels: Difficulty[] = ['EASY', 'NORMAL', 'HARD'];

console.log('\nAI win rate vs an EASY (near-random) player over ' + N + ' games:');
for (const ai of levels) {
  const tally = { PLAYER: 0, AI: 0, DRAW: 0 };
  for (let i = 0; i < N; i++) tally[playGame('EASY', ai)]++;
  const rate = (tally.AI / N * 100).toFixed(1);
  console.log(`  ${ai.padEnd(7)} AI wins ${rate}%   (player ${(tally.PLAYER / N * 100).toFixed(1)}%, draw ${(tally.DRAW / N * 100).toFixed(1)}%)`);
}

console.log('\nMirror matches (same level both seats), ' + N + ' games:');
for (const lv of levels) {
  const tally = { PLAYER: 0, AI: 0, DRAW: 0 };
  for (let i = 0; i < N; i++) tally[playGame(lv, lv)]++;
  console.log(`  ${lv.padEnd(7)} first-mover wins ${(tally.PLAYER / N * 100).toFixed(1)}%, draws ${(tally.DRAW / N * 100).toFixed(1)}%`);
}
console.log('');

console.log('Head-to-head matrix (row = AI seat, col = opponent seat), AI win %:');
const grid: string[][] = [];
for (const ai of levels) {
  const row: string[] = [];
  for (const opp of levels) {
    let wins = 0;
    for (let i = 0; i < N; i++) if (playGame(opp, ai) === 'AI') wins++;
    row.push(((wins / N) * 100).toFixed(0).padStart(3) + '%');
  }
  grid.push(row);
}
console.log('           ' + levels.map(l => l.padStart(6)).join(' '));
levels.forEach((l, i) => console.log('  ' + l.padEnd(8) + ' ' + grid[i].map(v => v.padStart(6)).join(' ')));
console.log('');
