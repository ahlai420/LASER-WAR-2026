import React, { useState } from 'react';
import { Copy, CheckCircle, Download, Home, RefreshCw } from 'lucide-react';
import { Owner, GameConfig } from '../types';
import { difficultyLabels } from '../state/gameReducer';
import { CREDITS } from '../data/credits';

interface Props {
  winner: Owner;
  nickname: string;
  seconds: number;
  rounds: number;
  score: number;
  config: GameConfig;
  onMenu: () => void;
  onRetry: () => void;
}

const FIELDS = ['Date', 'Time', 'Player', 'Difficulty', 'Winner', 'Duration(s)', 'Rounds', 'Prisms', 'Blocks', 'Score'];

export const GameOverModal: React.FC<Props> = ({
  winner, nickname, seconds, rounds, score, config, onMenu, onRetry
}) => {
  const [copied, setCopied] = useState(false);
  const won = winner === Owner.PLAYER;

  const values = [
    new Date().toLocaleDateString(),
    new Date().toLocaleTimeString(),
    nickname,
    config.difficulty,
    won ? 'PLAYER' : 'AI',
    String(seconds),
    String(rounds),
    String(config.prismCount),
    String(config.blockCount),
    String(won ? score : 0)
  ];

  const copy = async () => {
    const row = values.join('\t');
    try {
      await navigator.clipboard.writeText(row);
      setCopied(true);
    } catch {
      // Clipboard API needs a secure context; fall back to the legacy path.
      const ta = document.createElement('textarea');
      ta.value = row;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
      } catch {
        /* nothing else to try */
      }
      document.body.removeChild(ta);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const csv = `${FIELDS.join(',')}\n${values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LaserWar_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-in zoom-in duration-500" role="dialog" aria-modal="true">
      <div className="text-center space-y-8 p-8 md:p-12 border-y-4 border-[#C2B280] bg-[#1a1a1a] relative max-w-2xl w-full overflow-y-auto max-h-full">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>

        <div className="relative z-10">
          <div className="text-xs font-bold tracking-[0.5em] text-[#6E7376] mb-2">MISSION REPORT</div>
          <h1 className={`text-5xl md:text-7xl font-black tracking-tighter mb-4 ${won ? 'text-emerald-500' : 'text-red-600'}`}>
            {won ? 'YOU WIN' : 'YOU LOSE'}
          </h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono text-sm text-[#C2B280] bg-black/50 p-6 border border-[#2A2A2A] mb-8">
            <div>
              <div className="text-[10px] text-[#6E7376] uppercase">Duration</div>
              <div className="text-xl">{Math.floor(seconds / 60)}m {seconds % 60}s</div>
            </div>
            <div>
              <div className="text-[10px] text-[#6E7376] uppercase">Rounds</div>
              <div className="text-xl">{rounds}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#6E7376] uppercase">AI Core</div>
              <div className="text-xl">{difficultyLabels[config.difficulty]}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#6E7376] uppercase">Score</div>
              <div className="text-xl font-bold text-yellow-500">{won ? score : 0}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={copy} className="px-6 py-3 bg-[#0f0f0f] border border-[#2A2A2A] hover:border-[#C2B280] text-[#C2B280] font-bold text-xs tracking-widest flex items-center gap-2 transition-all">
              {copied ? <CheckCircle size={16} /> : <Copy size={16} />} {copied ? 'COPIED' : 'COPY DATA'}
            </button>
            <button onClick={download} className="px-6 py-3 bg-[#0f0f0f] border border-[#2A2A2A] hover:border-[#C2B280] text-[#C2B280] font-bold text-xs tracking-widest flex items-center gap-2 transition-all">
              <Download size={16} /> DOWNLOAD LOG
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <button onClick={onMenu} className="w-full py-4 bg-[#2A2A2A] hover:bg-[#333] text-[#C2B280] border border-[#6E7376] font-bold tracking-[0.2em] text-sm transition-all flex items-center justify-center gap-2">
              <Home size={18} /> MENU
            </button>
            <button onClick={onRetry} className="w-full py-4 bg-[#C2B280] hover:bg-[#b0a070] text-black font-black tracking-[0.2em] text-lg shadow-[0_0_20px_rgba(194,178,128,0.3)] transition-all flex items-center justify-center gap-2">
              <RefreshCw size={20} /> RETRY
            </button>
          </div>

          <div className="mt-8 pt-4 border-t border-[#2A2A2A] text-[9px] text-[#6E7376] uppercase tracking-[0.25em]">
            {CREDITS.line}
            {CREDITS.affiliation && <> &middot; {CREDITS.affiliation}</>}
          </div>
        </div>
      </div>
    </div>
  );
};
