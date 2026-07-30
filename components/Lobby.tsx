import React from 'react';
import { Crown, Play, FileText, BookOpen, Atom } from 'lucide-react';
import { Difficulty, GameConfig } from '../types';
import { difficultyLabels } from '../state/gameReducer';
import { CREDITS } from '../data/credits';

interface Props {
  nickname: string;
  config: GameConfig;
  onNickname: (v: string) => void;
  onConfig: (v: Partial<GameConfig>) => void;
  onStart: () => void;
  onOpenModal: (type: 'STORY' | 'RULES' | 'PHYSICS') => void;
  error: string | null;
}

const DIFFICULTY_HINT: Record<Difficulty, string> = {
  EASY: 'Moves at random and aims blind.',
  NORMAL: 'Traces the beam, but misjudges its aim about 4 turns in 10.',
  HARD: 'Traces every shot, defends its core, and never fumbles the aim.'
};

export const Lobby: React.FC<Props> = ({
  nickname, config, onNickname, onConfig, onStart, onOpenModal, error
}) => (
  <div className="w-full flex items-center justify-center p-4 overflow-y-auto">
    <div className="relative z-10 max-w-md w-full bg-[#1a1a1a]/90 border-2 border-[#4B5320] p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-sm my-auto">
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#C2B280]"></div>
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#C2B280]"></div>
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#C2B280]"></div>
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#C2B280]"></div>

      <div className="text-center mb-8">
        <Crown className="w-16 h-16 mx-auto text-[#C2B280] mb-4 drop-shadow-[0_0_10px_rgba(194,178,128,0.5)]" strokeWidth={1.5} />
        <h2 className="text-3xl font-black text-white tracking-widest">LASER WAR</h2>
        <div className="text-xs text-[#4B5320] font-bold tracking-[0.5em] mt-1">TACTICAL DEPLOYMENT</div>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="callsign" className="text-[10px] font-bold text-[#6E7376] uppercase tracking-widest mb-1 block">
            NICKNAME
          </label>
          <input
            id="callsign"
            value={nickname}
            onChange={e => onNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onStart()}
            maxLength={16}
            aria-invalid={!!error}
            className="w-full bg-black border border-[#2A2A2A] py-3 px-4 text-[#C2B280] text-lg focus:border-[#C2B280] focus:outline-none transition-all font-mono placeholder-[#2A2A2A]"
            placeholder="ENTER CALLSIGN"
          />
          {error && <p className="text-red-500 text-[11px] mt-2 tracking-wide">{error}</p>}
        </div>

        <div>
          <span className="text-[10px] font-bold text-[#6E7376] uppercase tracking-widest mb-2 block">
            AI CORE
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map(level => (
              <button
                key={level}
                onClick={() => onConfig({ difficulty: level })}
                aria-pressed={config.difficulty === level}
                className={`py-2 text-xs font-bold tracking-widest border transition-all ${
                  config.difficulty === level
                    ? 'bg-[#4B5320] text-white border-[#C2B280]'
                    : 'bg-black text-[#6E7376] border-[#2A2A2A] hover:border-[#6E7376]'
                }`}
              >
                {difficultyLabels[level]}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#6E7376] mt-2 leading-relaxed min-h-[2.5em]">
            {DIFFICULTY_HINT[config.difficulty]}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="prisms" className="text-[10px] font-bold text-[#6E7376] uppercase tracking-widest mb-1 block">
              PRISMS <span className="normal-case tracking-normal">(per side)</span>
            </label>
            <select
              id="prisms"
              value={config.prismCount}
              onChange={e => onConfig({ prismCount: +e.target.value })}
              className="w-full bg-black border border-[#2A2A2A] text-[#C2B280] p-2 font-mono"
            >
              {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="blocks" className="text-[10px] font-bold text-[#6E7376] uppercase tracking-widest mb-1 block">
              BLOCKS <span className="normal-case tracking-normal">(per side)</span>
            </label>
            <select
              id="blocks"
              value={config.blockCount}
              onChange={e => onConfig({ blockCount: +e.target.value })}
              className="w-full bg-black border border-[#2A2A2A] text-[#C2B280] p-2 font-mono"
            >
              {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={onStart}
          className="w-full py-4 bg-[#4B5320] hover:bg-[#3a4019] text-white font-black tracking-widest text-lg border border-[#6E7376] shadow-lg transition-all flex items-center justify-center gap-2 group mt-4"
        >
          <Play size={20} className="group-hover:scale-110 transition-transform" /> START
        </button>

        <div className="flex gap-2 pt-4 border-t border-[#2A2A2A]">
          <button onClick={() => onOpenModal('STORY')} className="flex-1 py-2 bg-[#1a1a1a] border border-[#2A2A2A] hover:border-[#C2B280] text-[#6E7376] hover:text-[#C2B280] text-xs font-bold flex items-center justify-center gap-2 transition-all">
            <FileText size={14} /> STORY
          </button>
          <button onClick={() => onOpenModal('RULES')} className="flex-1 py-2 bg-[#1a1a1a] border border-[#2A2A2A] hover:border-[#C2B280] text-[#6E7376] hover:text-[#C2B280] text-xs font-bold flex items-center justify-center gap-2 transition-all">
            <BookOpen size={14} /> BRIEFING
          </button>
          <button onClick={() => onOpenModal('PHYSICS')} className="flex-1 py-2 bg-[#1a1a1a] border border-[#2A2A2A] hover:border-[#C2B280] text-[#6E7376] hover:text-[#C2B280] text-xs font-bold flex items-center justify-center gap-2 transition-all">
            <Atom size={14} /> INTEL
          </button>
        </div>

        <div className="pt-5 mt-1 border-t border-[#2A2A2A] text-center">
          <div className="text-[10px] text-[#C2B280]/70 uppercase tracking-[0.25em]">
            {CREDITS.line}
          </div>
          {CREDITS.affiliation && (
            <div className="text-[9px] text-[#6E7376] tracking-[0.15em] mt-1">
              {CREDITS.affiliation}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
