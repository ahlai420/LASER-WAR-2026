import { PieceType, Owner, GRID_SIZE, Board, Piece } from '../types';
import { traceLaser, createBoard, findPiece, EMPTY_CELL, calculateScore, isPathClear, getLegalMoves } from '../services/gameLogic';
import { planTurn, bestShot } from '../services/aiEngine';

let pass = 0, fail = 0;
const t = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

const blank = (): Board =>
  Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, EMPTY_CELL));

const put = (b: Board, x: number, y: number, p: Partial<Piece> & { type: PieceType }) => {
  b[y][x] = { owner: Owner.NONE, rotation: 0, ...p };
};

console.log('\n--- laser trace ---');
{
  // Straight shot up the column into the AI king.
  const b = blank();
  put(b, 4, 7, { type: PieceType.SHOOTER, owner: Owner.PLAYER });
  put(b, 4, 0, { type: PieceType.KING, owner: Owner.AI });
  const r = traceLaser(b, { x: 4, y: 7 }, Owner.PLAYER);
  t('straight shot reaches enemy king', r.hit?.piece.type === PieceType.KING && r.hit.piece.owner === Owner.AI);
  t('straight shot has 0 prism hits', r.prismHits === 0, `got ${r.prismHits}`);
}
{
  // Beam leaves the board when nothing is in the way.
  const b = blank();
  put(b, 2, 7, { type: PieceType.SHOOTER, owner: Owner.PLAYER });
  const r = traceLaser(b, { x: 2, y: 7 }, Owner.PLAYER);
  t('empty column exits the board', r.exited && r.hit === null);
}
{
  // TIR: beam travelling UP into a rot-0 prism turns LEFT.
  const b = blank();
  put(b, 5, 7, { type: PieceType.SHOOTER, owner: Owner.PLAYER });
  put(b, 5, 3, { type: PieceType.PRISM, rotation: 0 });
  put(b, 1, 3, { type: PieceType.KING, owner: Owner.AI });
  const r = traceLaser(b, { x: 5, y: 7 }, Owner.PLAYER);
  t('rot-0 prism reflects UP to LEFT', r.hit?.piece.owner === Owner.AI, JSON.stringify(r.hit));
  t('reflection counts one TIR hit', r.tirHits === 1, `got ${r.tirHits}`);
}
{
  // Block stops the beam and is reported as the hit.
  const b = blank();
  put(b, 3, 7, { type: PieceType.SHOOTER, owner: Owner.PLAYER });
  put(b, 3, 4, { type: PieceType.BLOCK, health: 2 });
  put(b, 3, 0, { type: PieceType.KING, owner: Owner.AI });
  const r = traceLaser(b, { x: 3, y: 7 }, Owner.PLAYER);
  t('block absorbs the beam', r.hit?.piece.type === PieceType.BLOCK);
}
{
  // PEDAGOGY: a refracted beam must never destroy a generator, even when the
  // generator sits directly in the leak path.
  const b = blank();
  put(b, 4, 7, { type: PieceType.SHOOTER, owner: Owner.PLAYER });
  put(b, 4, 4, { type: PieceType.PRISM, rotation: 180 }); // UP hits hypotenuse -> refract NE
  put(b, 5, 3, { type: PieceType.KING, owner: Owner.AI });
  const r = traceLaser(b, { x: 4, y: 7 }, Owner.PLAYER);
  t('refraction cannot destroy a generator', r.hit === null, JSON.stringify(r.hit));
  t('refraction is reported as dispersed', r.end === 'dispersed', r.end);
  t('refraction earns no TIR credit', r.tirHits === 0, `got ${r.tirHits}`);
  t('the leak is still drawn for the student',
    r.dispersedFrom !== null && r.path.length > (r.dispersedFrom ?? 0) + 1);
}
{
  // PEDAGOGY: the SUPER COMBO must be reachable through pure TIR, so mastering
  // total internal reflection is the only route to the top score.
  const b = blank();
  put(b, 6, 7, { type: PieceType.SHOOTER, owner: Owner.PLAYER });
  put(b, 6, 5, { type: PieceType.PRISM, rotation: 0 });   // UP   -> LEFT (TIR)
  put(b, 3, 5, { type: PieceType.PRISM, rotation: 180 }); // LEFT -> UP   (TIR)
  put(b, 3, 2, { type: PieceType.PRISM, rotation: 0 });   // UP   -> LEFT (TIR)
  put(b, 0, 2, { type: PieceType.KING, owner: Owner.AI });
  const r = traceLaser(b, { x: 6, y: 7 }, Owner.PLAYER);
  t('a 3-bounce TIR chain reaches the enemy generator',
    r.hit?.piece.type === PieceType.KING && r.hit.piece.owner === Owner.AI, JSON.stringify(r.hit));
  t('all three bounces are full-power TIR', r.tirHits === 3, `got ${r.tirHits}`);
  t('pure TIR earns the SUPER COMBO', calculateScore(r.tirHits) === 600, `got ${calculateScore(r.tirHits)}`);
}
{
  // Cycle guard: two prisms bouncing at each other must terminate.
  const b = blank();
  put(b, 4, 7, { type: PieceType.SHOOTER, owner: Owner.PLAYER });
  put(b, 4, 4, { type: PieceType.PRISM, rotation: 0 });   // UP -> LEFT
  put(b, 2, 4, { type: PieceType.PRISM, rotation: 90 });  // LEFT -> NW
  const start = Date.now();
  const r = traceLaser(b, { x: 4, y: 7 }, Owner.PLAYER);
  t('trace terminates quickly (no infinite loop)', Date.now() - start < 100 && r.path.length < 100, `len ${r.path.length}`);
}

console.log('\n--- movement ---');
{
  const b = blank();
  put(b, 3, 3, { type: PieceType.PRISM });
  put(b, 3, 5, { type: PieceType.BLOCK });
  t('blocked path rejected', !isPathClear(b, { x: 3, y: 3 }, { x: 3, y: 6 }));
  t('clear path accepted', isPathClear(b, { x: 3, y: 3 }, { x: 3, y: 4 }));
  t('diagonal move rejected', !isPathClear(b, { x: 3, y: 3 }, { x: 4, y: 4 }));
  const moves = getLegalMoves(b, { x: 3, y: 3 }, 2);
  t('legal moves stop before the block', !moves.some(m => m.x === 3 && m.y === 5));
}

console.log('\n--- scoring ---');
t('direct hit = 50', calculateScore(0) === 50);
t('1 prism = 100', calculateScore(1) === 100);
t('2 prisms = 200', calculateScore(2) === 200);
t('3 prisms = super combo 600', calculateScore(3) === 600);

console.log('\n--- ai engine ---');
{
  // AI must take a guaranteed kill when one exists.
  const b = blank();
  put(b, 2, 0, { type: PieceType.SHOOTER, owner: Owner.AI });
  put(b, 2, 7, { type: PieceType.KING, owner: Owner.PLAYER });
  put(b, 6, 0, { type: PieceType.KING, owner: Owner.AI });
  const shot = bestShot(b, Owner.AI);
  t('AI sees the winning shot', shot.kills, JSON.stringify(shot));
}
{
  // AI must slide its shooter to the killing column rather than fire blind.
  const b = blank();
  put(b, 0, 0, { type: PieceType.SHOOTER, owner: Owner.AI });
  put(b, 5, 7, { type: PieceType.KING, owner: Owner.PLAYER });
  put(b, 6, 0, { type: PieceType.KING, owner: Owner.AI });
  const plan = planTurn(b, 2, 'HARD');
  const shot = bestShot(plan.board, Owner.AI);
  t('AI aims onto the winning column', shot.kills && shot.from?.x === 5, JSON.stringify(shot.from));
}
{
  // AI should never line its own king up in front of its own shooter.
  const b = blank();
  put(b, 3, 0, { type: PieceType.SHOOTER, owner: Owner.AI });
  put(b, 3, 2, { type: PieceType.KING, owner: Owner.AI });
  put(b, 7, 7, { type: PieceType.KING, owner: Owner.PLAYER });
  const plan = planTurn(b, 3, 'HARD');
  const shot = bestShot(plan.board, Owner.AI);
  t('AI avoids shooting its own core', !shot.from || shot.value > -1000, `value ${shot.value}`);
}
{
  // Performance guard on a realistic board.
  const b = createBoard({ prismCount: 3, blockCount: 3 });
  const start = Date.now();
  for (let i = 0; i < 20; i++) planTurn(b, 3, 'HARD');
  const ms = (Date.now() - start) / 20;
  t(`HARD plan averages under 60ms (${ms.toFixed(1)}ms)`, ms < 60);
}
{
  // Determinism/robustness sweep: no crashes over many random boards.
  let crashed = 0;
  for (let i = 0; i < 200; i++) {
    try {
      const b = createBoard({ prismCount: 3, blockCount: 3 });
      const plan = planTurn(b, 1 + (i % 3), (['EASY', 'NORMAL', 'HARD'] as const)[i % 3]);
      const s = findPiece(plan.board, PieceType.SHOOTER, Owner.AI);
      if (!s) crashed++;
      traceLaser(plan.board, s, Owner.AI);
    } catch { crashed++; }
  }
  t('200 random turns without a crash or lost shooter', crashed === 0, `${crashed} failures`);
}

console.log('\n--- audio loudness matching ---');
{
  const { normalisationFor } = require('../services/audio');
  // A file mastered near full scale must be pulled down hard; that is the
  // "my MP3 is deafening" case.
  const hot = normalisationFor(1.0);
  const quiet = normalisationFor(0.2);
  t('a full-scale file is attenuated', hot < 0.5, `got ${hot}`);
  t('a quiet file is boosted', quiet > 1, `got ${quiet}`);
  t('both land on the same peak',
    Math.abs(1.0 * hot - 0.2 * quiet) < 1e-9, `${1.0 * hot} vs ${0.2 * quiet}`);
  // The boost is capped, so a very quiet file stays quieter rather than
  // amplifying its own noise floor to the target.
  t('boost is capped at 4x', normalisationFor(0.0001) === 4);
  t('a capped file lands below target, not above', 0.05 * normalisationFor(0.05) <= 0.45);
  t('a silent or broken file is left alone', normalisationFor(0) === 1 && normalisationFor(NaN) === 1);
}

console.log('\n--- reducer: the stale-closure regression ---');
{
  const { gameReducer, initialState } = require('../state/gameReducer');
  const { PieceType: PT, Owner: OW, Phase: PH } = require('../types');

  let s = gameReducer(initialState, { type: 'SET_NICKNAME', value: 'TEST' });
  s = gameReducer(s, { type: 'START_GAME' });
  s = gameReducer(s, { type: 'ROLL_DONE', value: 3 });

  // Find three empty tiles in a row we can shuffle a piece across.
  const board = s.board;
  let src: any = null;
  for (let y = 1; y < 7 && !src; y++)
    for (let x = 0; x < 6; x++)
      if (board[y][x].type === PT.PRISM &&
          board[y][x + 1].type === PT.EMPTY &&
          board[y][x + 2].type === PT.EMPTY) { src = { x, y }; break; }

  if (!src) {
    console.log('  skip (no suitable prism on this random board)');
  } else {
    const step1 = { x: src.x + 1, y: src.y };
    const step2 = { x: src.x + 2, y: src.y };

    // Two moves in one turn. The old implementation derived both from the same
    // stale board snapshot, so the second silently undid the first.
    s = gameReducer(s, { type: 'MOVE', from: src, to: step1, cost: 1 });
    s = gameReducer(s, { type: 'MOVE', from: step1, to: step2, cost: 1 });

    t('sequential moves compose instead of overwriting',
      s.board[step2.y][step2.x].type === PT.PRISM &&
      s.board[src.y][src.x].type === PT.EMPTY &&
      s.board[step1.y][step1.x].type === PT.EMPTY,
      JSON.stringify({ src: s.board[src.y][src.x].type, mid: s.board[step1.y][step1.x].type, end: s.board[step2.y][step2.x].type }));

    t('AP is deducted across both moves', s.actionPoints === 1, `got ${s.actionPoints}`);
  }

  // Spending the last AP must open the shot.
  let s2 = gameReducer(initialState, { type: 'SET_NICKNAME', value: 'T' });
  s2 = gameReducer(s2, { type: 'START_GAME' });
  s2 = gameReducer(s2, { type: 'ROLL_DONE', value: 1 });
  s2 = gameReducer(s2, { type: 'SKIP_ACTION' });
  t('skip advances to the shoot phase', s2.phase === PH.SHOOT);

  // Logs must carry their own timestamps rather than rendering "now".
  t('log entries store a timestamp', typeof s2.logs[0]?.at === 'number' && s2.logs[0].at > 0);
  t('log entries have stable ids', new Set(s2.logs.map((l: any) => l.id)).size === s2.logs.length);

  // A round is both sides acting, not each individual shot.
  let s3 = gameReducer(s2, { type: 'END_TURN' });
  t('AI turn does not increment the round counter', s3.rounds === 0, `got ${s3.rounds}`);
  s3 = gameReducer(s3, { type: 'END_TURN' });
  t('a full round counts once', s3.rounds === 1, `got ${s3.rounds}`);
}

console.log(`\nFINAL: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
