import React from 'react';
import { MessageSquare, BrainCircuit, Sparkles, Flame, Crosshair, SkipForward } from 'lucide-react';
import { AudioPanel } from './AudioPanel';
import { Owner, Phase, LogEntry } from '../types';
import { Dice } from './Dice';
import { LogTerminal } from './LogTerminal';

interface Props {
  phase: Phase;
  turnOwner: Owner;
  diceValue: number;
  isRolling: boolean;
  actionPoints: number;
  aimUsed: boolean;
  aiDialogue: string;
  logs: LogEntry[];
  advisorLoading: boolean;
  muted: boolean;
  sfxVolume: number;
  musicVolume: number;
  onRoll: () => void;
  onFire: () => void;
  onSkip: () => void;
  onAdvice: () => void;
  onToggleMute: () => void;
  onSfxVolume: (v: number) => void;
  onMusicVolume: (v: number) => void;
}

const STATUS_COPY: Record<Phase, string> = {
  [Phase.ROLL]: 'ROLL',
  [Phase.ACTION]: 'ACTION',
  [Phase.SHOOT]: 'SHOOT',
  [Phase.ANIMATING]: 'FIRING'
};

export const Sidebar: React.FC<Props> = ({
  phase, turnOwner, diceValue, isRolling, actionPoints, aimUsed,
  aiDialogue, logs, advisorLoading, muted, sfxVolume, musicVolume,
  onRoll, onFire, onSkip, onAdvice, onToggleMute, onSfxVolume, onMusicVolume
}) => {
  const isPlayerTurn = turnOwner === Owner.PLAYER;

  return (
    <div className="w-full landscape:w-72 md:w-72 h-36 landscape:h-full md:h-full shrink-0 bg-[#111] border-t landscape:border-t-0 landscape:border-r md:border-t-0 md:border-r border-[#2A2A2A] p-3 md:p-6 flex flex-row landscape:flex-col md:flex-col items-center landscape:items-stretch md:items-stretch gap-4 z-20 shadow-2xl relative overflow-y-auto">
      {aiDialogue && (
        <div className="absolute bottom-full left-0 w-full mb-2 md:mb-0 md:top-4 md:bottom-auto md:left-full md:w-64 bg-red-900/90 border-t-2 md:border-t-0 md:border-l-4 border-red-500 text-red-100 p-4 text-xs font-mono shadow-[0_0_20px_rgba(220,38,38,0.3)] animate-in slide-in-from-bottom-2 md:slide-in-from-left-4 z-50">
          <div className="flex items-center gap-2 mb-2 text-red-400 font-bold border-b border-red-700/50 pb-1 uppercase tracking-wider">
            <MessageSquare size={12} /> AI Transmission
          </div>
          <p className="italic">"{aiDialogue}"</p>
        </div>
      )}

      <div className="shrink-0 text-center border-r landscape:border-r-0 landscape:border-b md:border-r-0 md:border-b border-[#2A2A2A] pr-4 landscape:pr-0 landscape:pb-6 landscape:mb-8 md:pr-0 md:pb-6 md:mb-8 flex flex-col justify-center">
        <div className="text-[8px] md:text-[10px] text-[#6E7376] tracking-[0.3em] uppercase mb-1 md:mb-2">Mission Status</div>
        <div className={`text-xl md:text-3xl font-black uppercase tracking-tighter ${phase === Phase.SHOOT ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          {STATUS_COPY[phase]}
        </div>
        <div className="text-[9px] md:text-[10px] text-[#6E7376] mt-1 uppercase tracking-widest">
          {isPlayerTurn ? 'Your move' : 'AI thinking'}
        </div>
      </div>

      <div className="flex-1 flex flex-row landscape:flex-col md:flex-col items-center justify-center gap-4 landscape:space-y-8 md:space-y-8 relative">
        {phase === Phase.ROLL && (
          <div className="shrink-0 flex flex-col items-center space-y-2 md:space-y-4 animate-in zoom-in">
            <div className="scale-90 md:scale-110 origin-center">
              <Dice value={diceValue} rolling={isRolling} onClick={isPlayerTurn ? onRoll : () => {}} />
            </div>
            <div className="text-[8px] md:text-[10px] text-[#6E7376] uppercase tracking-widest whitespace-nowrap">
              {isPlayerTurn ? 'Tap to roll' : 'AI rolling'}
            </div>
          </div>
        )}

        {phase === Phase.ACTION && (
          <div className="shrink-0 text-center space-y-2 md:space-y-4 animate-in fade-in">
            <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-dashed border-[#4B5320] flex items-center justify-center mx-auto bg-[#1a1a1a]">
              <div className="text-3xl md:text-6xl font-black text-[#C2B280]">{actionPoints}</div>
            </div>
            <div className="text-[10px] md:text-sm text-[#C2B280] font-bold tracking-widest uppercase leading-none">AP Left</div>
            {isPlayerTurn && (
              <button
                onClick={onSkip}
                className="text-[9px] md:text-[10px] text-[#6E7376] hover:text-[#C2B280] border border-[#2A2A2A] hover:border-[#6E7376] px-3 py-1 uppercase tracking-widest flex items-center gap-1 mx-auto transition-colors"
              >
                <SkipForward size={11} /> Skip to fire
              </button>
            )}
          </div>
        )}

        {phase === Phase.SHOOT && isPlayerTurn && (
          <div className="shrink-0 text-center space-y-2 md:space-y-4 animate-in slide-in-from-bottom-10 flex flex-col items-center">
            <button
              onClick={onFire}
              aria-label="Fire laser"
              className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-red-600 to-red-800 border-4 border-red-950 shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            >
              <Flame className="text-white drop-shadow-lg scale-90 md:scale-125 w-6 h-6 md:w-10 md:h-10" fill="currentColor" />
            </button>
            <div className="text-[8px] md:text-[10px] text-red-500 tracking-[0.2em] font-bold uppercase hidden md:block">Execute fire</div>
            {!aimUsed && (
              <div className="text-[9px] text-[#C2B280] flex items-center gap-1 uppercase tracking-wider">
                <Crosshair size={11} /> Free aim available
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 flex landscape:flex-col md:flex-col gap-2 mt-auto landscape:pt-6 landscape:border-t md:pt-6 md:border-t border-[#2A2A2A] landscape:space-y-3 md:space-y-3 w-auto landscape:w-full md:w-full items-center">
        <button
          onClick={onAdvice}
          disabled={advisorLoading}
          className="w-10 h-10 md:w-full md:h-auto md:py-3 bg-[#1a1a1a] hover:bg-[#252525] border border-[#4B5320]/50 rounded-sm flex items-center justify-center md:gap-2 text-[10px] text-[#C2B280] transition-colors uppercase tracking-widest disabled:opacity-50"
        >
          {advisorLoading ? <Sparkles className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
          <span className="hidden md:inline">Tactical Intel</span>
        </button>
        <AudioPanel
          muted={muted}
          sfxVolume={sfxVolume}
          musicVolume={musicVolume}
          onToggleMute={onToggleMute}
          onSfxVolume={onSfxVolume}
          onMusicVolume={onMusicVolume}
        />
      </div>

      <div className="hidden landscape:block md:block w-full mt-0 md:mt-4">
        <LogTerminal logs={logs} />
      </div>
    </div>
  );
};
