import React, { useMemo } from 'react';

export const Scanline: React.FC = React.memo(() => (
  <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-30">
    <div className="w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
  </div>
));
Scanline.displayName = 'Scanline';

/**
 * Ambient dust.
 *
 * Previously these were generated with bare `Math.random()` calls inside the
 * app's render body, so every re-render -- including the once-per-second clock
 * tick -- teleported all twenty particles to new positions. Seeding once and
 * memoising the component keeps them drifting the way they were meant to.
 */
export const Particles: React.FC<{ count?: number }> = React.memo(({ count = 20 }) => {
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5}s`,
        size: `${2 + Math.random() * 4}px`
      })),
    [count]
  );

  return (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#2A2A2A] via-slate-950 to-black"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
      {seeds.map((s, i) => (
        <div
          key={i}
          className="particle"
          style={{ left: s.left, top: s.top, animationDelay: s.delay, width: s.size, height: s.size }}
        />
      ))}
    </div>
  );
});
Particles.displayName = 'Particles';
