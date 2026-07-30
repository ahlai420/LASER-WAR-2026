import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Crosshair, User, Cpu, Flag, Clock } from 'lucide-react';

import { Owner, Phase, PieceType, Difficulty, GameConfig } from './types';
import {
  findPiece, traceLaser, isPathClear, isControllable, homeRow, opponentOf
} from './services/gameLogic';
import { planTurn } from './services/aiEngine';
import { geminiService } from './services/geminiService';
import {
  playDice, playCrackle, playLaser, playExplosion,
  setMuted, setSfxVolume, setMusicVolume, getSfxVolume, getMusicVolume, isMuted,
  unlockAudio, bindAutoUnlock, startBgm, stopBgm
} from './services/audio';
import { gameReducer, initialState } from './state/gameReducer';

import { Particles } from './components/Atmosphere';
import { LogTerminal } from './components/LogTerminal';
import { MissionClock } from './components/MissionClock';
import { GameBoard } from './components/GameBoard';
import { Sidebar } from './components/Sidebar';
import { Lobby } from './components/Lobby';
import { GameOverModal } from './components/GameOverModal';
import { EducationModal } from './components/EducationModal';

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export default function LaserWarApp() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  /**
   * Async turn sequences read the board through a ref rather than through the
   * render closure. Closure capture is exactly what made the old AI turn
   * overwrite its own moves.
   */
  const stateRef = useRef(state);
  stateRef.current = state;

  /** Bumped whenever a game starts or ends, to cancel in-flight animations. */
  const epochRef = useRef(0);
  const aiBusyRef = useRef(false);
  const secondsRef = useRef(0);

  const [eduModal, setEduModal] = useState<'RULES' | 'PHYSICS' | 'STORY' | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  // Seeded from the saved preferences the audio module restored on load.
  const [muted, setMutedState] = useState(isMuted);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  const { view, board, phase, turnOwner, winner, config, logs } = state;

  const [sfxVolume, setSfxVolumeState] = useState(getSfxVolume);
  const [musicVolume, setMusicVolumeState] = useState(getMusicVolume);

  useEffect(() => () => { epochRef.current++; }, []);

  // Unlock audio on the first interaction anywhere on the page.
  useEffect(() => bindAutoUnlock(), []);

  // Music plays during matches only.
  useEffect(() => {
    if (view === 'game' && !winner) startBgm();
    else stopBgm();
  }, [view, winner]);

  // --- shared sequences ------------------------------------------------------

  const fireLaser = useCallback(async (owner: Owner, epoch: number) => {
    const alive = () => epochRef.current === epoch;

    dispatch({ type: 'SET_PHASE', phase: Phase.ANIMATING });

    const current = stateRef.current.board;
    const shooter = findPiece(current, PieceType.SHOOTER, owner);
    const { path, tirHits, hit, end, dispersedFrom } = traceLaser(current, shooter, owner);

    playLaser();
    for (let i = 1; i <= path.length; i++) {
      if (!alive()) return;
      dispatch({
        type: 'SET_LASER',
        path: path.slice(0, i),
        // Only mark the leak once the beam has actually reached the prism.
        dispersedFrom: dispersedFrom !== null && i > dispersedFrom ? dispersedFrom : null
      });
      await sleep(55);
    }
    if (!alive()) return;

    if (hit && hit.piece.type === PieceType.KING) {
      const loser = hit.piece.owner;
      const victor = loser === owner ? opponentOf(owner) : owner;
      dispatch({
        type: 'LOG',
        text: loser === owner ? 'Core breach — self inflicted' : 'Enemy generator destroyed'
      });
      playExplosion();
      dispatch({ type: 'WIN', winner: victor, loser, prismHits: tirHits });
      await sleep(1500);
      if (!alive()) return;
      dispatch({ type: 'FINALISE_WIN' });
      const line = victor === Owner.PLAYER
        ? 'Critical failure. System shutdown.'
        : 'Target eliminated. Superiority confirmed.';
      geminiService.getTaunt(line).then(text => {
        if (alive()) dispatch({ type: 'SET_DIALOGUE', text });
      });
      return;
    }

    if (end === 'dispersed') {
      // The teaching moment: say why nothing happened.
      dispatch({
        type: 'LOG',
        text: 'Refracted at the slanted face — light leaked out and dispersed. No damage.'
      });
      await sleep(700);
      if (!alive()) return;
      dispatch({ type: 'END_TURN' });
      return;
    }

    if (hit && hit.piece.type === PieceType.BLOCK) {
      playCrackle();
      dispatch({ type: 'DAMAGE_BLOCK', at: hit.pos });
      await sleep(600);
      if (!alive()) return;
      dispatch({ type: 'CLEAR_EXPLOSION', at: hit.pos });
    } else {
      await sleep(400);
    }

    if (!alive()) return;
    dispatch({ type: 'END_TURN' });
  }, []);

  // --- AI turn ---------------------------------------------------------------

  const runAITurn = useCallback(async (epoch: number) => {
    const alive = () => epochRef.current === epoch;

    dispatch({ type: 'ROLL_START' });
    playDice();
    await sleep(700);
    if (!alive()) return;

    const roll = 1 + Math.floor(Math.random() * 3);
    dispatch({ type: 'ROLL_DONE', value: roll });
    await sleep(450);
    if (!alive()) return;

    // Planned once, up front, against the live board — then replayed action by
    // action so each dispatch lands on fresh reducer state.
    const plan = planTurn(stateRef.current.board, roll, stateRef.current.config.difficulty);

    for (const action of plan.actions) {
      if (!alive()) return;
      if (action.kind === 'MOVE') {
        dispatch({ type: 'MOVE', from: action.from, to: action.to, cost: action.cost, note: `AI ${action.label}` });
      } else if (action.kind === 'ROTATE') {
        dispatch({ type: 'ROTATE', at: action.at, rotation: action.rotation, cost: action.cost, note: `AI ${action.label}` });
      } else {
        dispatch({ type: 'AIM', from: action.from, to: action.to, note: `AI ${action.label}` });
      }
      await sleep(450);
    }

    if (!alive()) return;
    dispatch({ type: 'SET_PHASE', phase: Phase.SHOOT });
    dispatch({ type: 'LOG', text: `AI: ${plan.intent}` });
    await sleep(500);
    if (!alive()) return;

    await fireLaser(Owner.AI, epoch);
  }, [fireLaser]);

  useEffect(() => {
    if (view !== 'game' || winner || turnOwner !== Owner.AI || phase !== Phase.ROLL) return;
    // Guards against React StrictMode's double effect invocation and against
    // a second turn starting while the first is still animating.
    if (aiBusyRef.current) return;

    aiBusyRef.current = true;
    const epoch = epochRef.current;
    void runAITurn(epoch).finally(() => {
      aiBusyRef.current = false;
    });
  }, [view, winner, turnOwner, phase, runAITurn]);

  // --- player actions --------------------------------------------------------

  const startGame = useCallback(() => {
    const name = stateRef.current.nickname.trim();
    if (!name) {
      setLobbyError('Enter a callsign to deploy.');
      return;
    }
    setLobbyError(null);
    epochRef.current++;
    aiBusyRef.current = false;
    secondsRef.current = 0;
    unlockAudio();
    dispatch({ type: 'START_GAME' });
  }, []);

  const rollDice = useCallback(async () => {
    const s = stateRef.current;
    if (s.isRolling || s.phase !== Phase.ROLL || s.turnOwner !== Owner.PLAYER || s.winner) return;
    const epoch = epochRef.current;
    dispatch({ type: 'ROLL_START' });
    playDice();
    await sleep(600);
    if (epochRef.current !== epoch) return;
    dispatch({ type: 'ROLL_DONE', value: 1 + Math.floor(Math.random() * 3) });
  }, []);

  const handleSelect = useCallback((x: number, y: number) => {
    const s = stateRef.current;
    if (s.winner || s.turnOwner !== Owner.PLAYER) return;
    const cell = s.board[y][x];

    if (s.phase === Phase.SHOOT) {
      if (!s.aimUsed && y === homeRow(Owner.PLAYER) && cell.type === PieceType.EMPTY) {
        const shooter = findPiece(s.board, PieceType.SHOOTER, Owner.PLAYER);
        if (shooter) dispatch({ type: 'AIM', from: shooter, to: { x, y } });
      }
      return;
    }

    if (s.phase !== Phase.ACTION) return;

    if (s.interactionMode === 'MOVE' && s.selected) {
      const dist = Math.abs(x - s.selected.x) + Math.abs(y - s.selected.y);
      const linear = x === s.selected.x || y === s.selected.y;
      if (
        cell.type === PieceType.EMPTY &&
        linear && dist > 0 && dist <= s.actionPoints &&
        isPathClear(s.board, s.selected, { x, y })
      ) {
        dispatch({ type: 'MOVE', from: s.selected, to: { x, y }, cost: dist });
      } else {
        dispatch({ type: 'SELECT', selection: null, mode: 'NONE' });
      }
      return;
    }

    if (isControllable(cell, Owner.PLAYER)) {
      dispatch({
        type: 'SELECT',
        selection: { x, y, type: cell.type },
        mode: cell.type === PieceType.PRISM ? 'MENU' : 'MOVE'
      });
    } else {
      dispatch({ type: 'SELECT', selection: null, mode: 'NONE' });
    }
  }, []);

  const handlePrismAction = useCallback((action: 'MOVE' | 'ROTATE') => {
    dispatch({ type: 'SET_MODE', mode: action });
  }, []);

  const handleRotate = useCallback((deg: number) => {
    const s = stateRef.current;
    if (!s.selected || s.interactionMode !== 'ROTATE' || s.actionPoints < 1) return;
    dispatch({ type: 'ROTATE', at: s.selected, rotation: deg, cost: 1 });
  }, []);

  const handleSkip = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== Phase.ACTION || s.turnOwner !== Owner.PLAYER || s.winner) return;
    dispatch({ type: 'SKIP_ACTION' });
  }, []);

  const handleFire = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== Phase.SHOOT || s.turnOwner !== Owner.PLAYER || s.winner) return;
    void fireLaser(Owner.PLAYER, epochRef.current);
  }, [fireLaser]);

  const handleSurrender = useCallback(async () => {
    const s = stateRef.current;
    if (s.winner) return;
    const epoch = epochRef.current;
    dispatch({ type: 'LOG', text: 'Player surrendered' });
    dispatch({ type: 'WIN', winner: Owner.AI, loser: Owner.PLAYER, prismHits: 0 });
    await sleep(1200);
    if (epochRef.current !== epoch) return;
    dispatch({ type: 'FINALISE_WIN' });
  }, []);

  const getAdvice = useCallback(async () => {
    if (advisorLoading) return;
    setAdvisorLoading(true);
    try {
      const advice = await geminiService.getTacticalAdvice();
      dispatch({ type: 'LOG', text: `ADVISOR: ${advice}` });
    } finally {
      setAdvisorLoading(false);
    }
  }, [advisorLoading]);

  const toggleMute = useCallback(() => {
    setMutedState(prev => {
      setMuted(!prev);
      return !prev;
    });
  }, []);

  const changeSfxVolume = useCallback((v: number) => {
    setSfxVolume(v);
    setSfxVolumeState(v);
  }, []);

  const changeMusicVolume = useCallback((v: number) => {
    setMusicVolume(v);
    setMusicVolumeState(v);
  }, []);

  const goLobby = useCallback(() => {
    epochRef.current++;
    aiBusyRef.current = false;
    dispatch({ type: 'GO_LOBBY' });
  }, []);

  // --- render ----------------------------------------------------------------

  return (
    <div className="h-[100dvh] bg-slate-950 text-[#C2B280] font-mono flex flex-col relative overflow-hidden">
      <Particles />

      <header className="h-14 md:h-16 shrink-0 bg-[#1a1a1a] border-b-2 border-[#4B5320] flex items-center justify-between px-4 md:px-6 z-40 shadow-lg relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-[#2A2A2A] rounded border border-[#4B5320] flex items-center justify-center shadow-[0_0_10px_rgba(75,83,32,0.5)]">
            <Crosshair className="text-[#C2B280]" size={20} />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-black tracking-[0.2em] text-[#C2B280] drop-shadow-md">LASER WAR</h1>
            <div className="text-[8px] text-[#6E7376] uppercase tracking-widest hidden md:block">Tactical Optics Simulation</div>
          </div>
        </div>

        {view === 'game' && (
          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden sm:flex items-center gap-2 text-xs md:text-sm text-[#6E7376]">
              <Clock size={14} />
              <MissionClock
                running={!winner}
                onTick={s => { secondsRef.current = s; }}
              />
            </div>
            <div className="flex items-center gap-4 md:gap-8 bg-[#0f0f0f] px-3 py-1 md:px-6 md:py-2 rounded border border-[#2A2A2A] text-xs md:text-base">
              <div className={`flex items-center gap-2 ${turnOwner === Owner.PLAYER ? 'text-emerald-500 animate-pulse' : 'text-[#6E7376]'}`}>
                <User size={16} /> {state.nickname.toUpperCase().substring(0, 8)}
              </div>
              <div className="h-4 w-px bg-[#2A2A2A]"></div>
              <div className={`flex items-center gap-2 ${turnOwner === Owner.AI ? 'text-red-500 animate-pulse' : 'text-[#6E7376]'}`}>
                AI CORE <Cpu size={16} />
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 relative flex z-10 overflow-hidden">
        {view === 'lobby' ? (
          <Lobby
            nickname={state.nickname}
            config={config}
            error={lobbyError}
            onNickname={v => dispatch({ type: 'SET_NICKNAME', value: v })}
            onConfig={(v: Partial<GameConfig>) => dispatch({ type: 'SET_CONFIG', value: v })}
            onStart={startGame}
            onOpenModal={setEduModal}
          />
        ) : (
          <div className="w-full h-full flex flex-col-reverse landscape:flex-row md:flex-row items-stretch">
            <Sidebar
              phase={phase}
              turnOwner={turnOwner}
              diceValue={state.diceValue}
              isRolling={state.isRolling}
              actionPoints={state.actionPoints}
              aimUsed={state.aimUsed}
              aiDialogue={state.aiDialogue}
              logs={logs}
              advisorLoading={advisorLoading}
              muted={muted}
              sfxVolume={sfxVolume}
              musicVolume={musicVolume}
              onRoll={rollDice}
              onFire={handleFire}
              onSkip={handleSkip}
              onAdvice={getAdvice}
              onToggleMute={toggleMute}
              onSfxVolume={changeSfxVolume}
              onMusicVolume={changeMusicVolume}
            />

            <div className="flex-1 bg-[#050505] relative flex flex-col items-center justify-center p-2 md:p-10 perspective-[1200px] overflow-visible">
              <div className="md:hidden landscape:hidden w-full max-w-[95vw] absolute top-2 z-30 pointer-events-none">
                <LogTerminal logs={logs} variant="hud" />
              </div>

              <button
                onClick={handleSurrender}
                type="button"
                title="Surrender"
                aria-label="Surrender"
                className="absolute bottom-4 right-4 md:top-4 md:right-4 z-[100] bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-500 p-2 rounded-sm backdrop-blur-sm transition-all cursor-pointer"
              >
                <Flag size={20} />
              </button>

              {state.combo && (
                <div className="absolute top-[15%] left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-[popIn_0.5s_ease-out_forwards]">
                  <div className="text-4xl md:text-6xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] tracking-tighter skew-x-12 border-4 border-black bg-white/10 px-6 py-2 rotate-[-5deg]">
                    {state.combo}
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-[linear-gradient(rgba(20,20,20,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,0.5)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none"></div>

              {board.length > 0 && (
                <GameBoard
                  board={board}
                  selected={state.selected}
                  interactionMode={state.interactionMode}
                  actionPoints={state.actionPoints}
                  phase={phase}
                  turnOwner={turnOwner}
                  aimUsed={state.aimUsed}
                  laserPath={state.laserPath}
                  laserDispersedFrom={state.laserDispersedFrom}
                  explosions={state.explosions}
                  explodingKing={state.explodingKing}
                  onSelect={handleSelect}
                  onPrismAction={handlePrismAction}
                  onRotate={handleRotate}
                />
              )}
            </div>

            {winner && (
              <GameOverModal
                winner={winner}
                nickname={state.nickname}
                seconds={secondsRef.current}
                rounds={state.rounds}
                score={state.score}
                config={config}
                onMenu={goLobby}
                onRetry={startGame}
              />
            )}
          </div>
        )}

        {eduModal && <EducationModal type={eduModal} onClose={() => setEduModal(null)} />}
      </main>
    </div>
  );
}
