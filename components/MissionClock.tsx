import React, { useEffect, useRef, useState } from 'react';

/**
 * Self-contained mission timer.
 *
 * The clock used to live in the app's top-level state, so every tick
 * re-rendered all 64 board cells, the piece SVGs and the particle field once a
 * second. Isolating it here means the per-second update repaints four
 * characters of text and nothing else.
 */
export const MissionClock: React.FC<{ running: boolean; onTick?: (s: number) => void }> = ({ running, onTick }) => {
  const [seconds, setSeconds] = useState(0);
  const cb = useRef(onTick);
  cb.current = onTick;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds(s => {
        const next = s + 1;
        cb.current?.(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return <span className="tabular-nums">{mm}:{ss}</span>;
};
