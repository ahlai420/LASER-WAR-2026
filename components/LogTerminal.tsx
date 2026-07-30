import React from 'react';
import { Terminal } from 'lucide-react';
import { LogEntry } from '../types';
import { Scanline } from './Atmosphere';

const stamp = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour12: false });

interface Props {
  logs: LogEntry[];
  rows?: number;
  variant?: 'panel' | 'hud';
}

/**
 * Log rows render their own stored timestamp. The previous version called
 * `new Date()` during render, so all four rows always showed the same
 * "now" rather than when each event actually happened.
 */
export const LogTerminal: React.FC<Props> = React.memo(({ logs, rows = 4, variant = 'panel' }) => {
  const slots = Array.from({ length: rows }, (_, i) => logs[i]);

  if (variant === 'hud') {
    return (
      <div className="bg-[#050a05]/90 border border-[#4B5320] p-1 relative overflow-hidden shadow-lg backdrop-blur-sm">
        <Scanline />
        <div className="font-mono text-[9px] space-y-0.5 h-16 overflow-hidden relative z-10">
          {slots.map((entry, i) => (
            <div key={entry?.id ?? `empty-${i}`} className="truncate flex items-center text-emerald-400">
              <span className="opacity-50 mr-1 text-[#4B5320]">&gt;</span>
              {entry ? entry.text : <span className="opacity-20">...</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#050a05] rounded-sm border border-[#4B5320] p-1 relative shadow-[0_0_10px_rgba(75,83,32,0.2)] shrink-0 overflow-hidden">
      <div className="absolute inset-0 bg-emerald-500/10 animate-pulse pointer-events-none z-0"></div>
      <div className="relative z-10">
        <Scanline />
        <div className="flex items-center justify-between px-2 py-1 bg-[#4B5320]/20 border-b border-[#4B5320] mb-1">
          <span className="text-[9px] text-[#4B5320] font-bold tracking-widest flex items-center gap-1">
            <Terminal size={10} /> LOG_TERMINAL
          </span>
          <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
        </div>
        <div className="font-mono p-2 space-y-1">
          {slots.map((entry, i) => (
            <div
              key={entry?.id ?? `empty-${i}`}
              className="h-4 text-[10px] truncate flex items-center border-b border-white/5 last:border-0"
            >
              {entry ? (
                <>
                  <span className="opacity-50 mr-1 text-[#4B5320]">{stamp(entry.at)}</span>
                  <span className={`uppercase ${i === 0 ? 'text-emerald-400 font-bold' : 'text-emerald-900'}`}>
                    {entry.text}
                  </span>
                </>
              ) : (
                <span className="opacity-10 text-emerald-900 tracking-widest">-- EMPTY --</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
LogTerminal.displayName = 'LogTerminal';
