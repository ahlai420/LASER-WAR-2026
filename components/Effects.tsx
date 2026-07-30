
import React from 'react';
import { Position, GRID_SIZE } from '../types';

export const ExplosionEffect = React.memo(() => (
  <div className="absolute inset-[-50%] flex items-center justify-center pointer-events-none z-[100]">
    <style>{`
      @keyframes big-boom {
        0% { transform: scale(0.1); opacity: 1; }
        40% { transform: scale(1.2); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
      }
      @keyframes debris {
        0% { transform: translate(0,0) rotate(0deg); opacity: 1; }
        100% { transform: translate(var(--tx), var(--ty)) rotate(var(--r)); opacity: 0; }
      }
      @keyframes flash {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
    `}</style>
    
    <div className="absolute inset-0 bg-white/80 rounded-full animate-[flash_0.2s_ease-out_forwards]"></div>
    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-red-600 rounded-full animate-[big-boom_0.5s_ease-out_forwards] blur-sm"></div>
    {[...Array(12)].map((_, i) => (
      <div 
        key={i}
        className="absolute w-2 h-2 bg-orange-400 rounded-sm shadow-[0_0_5px_orange]"
        style={{
          //@ts-ignore custom property
          '--tx': `${Math.cos(i * 30 * Math.PI / 180) * 80}px`,
          '--ty': `${Math.sin(i * 30 * Math.PI / 180) * 80}px`,
          '--r': `${Math.random() * 720}deg`,
          animation: `debris 0.6s ease-out forwards`
        }}
      />
    ))}
  </div>
));
ExplosionEffect.displayName = 'ExplosionEffect';

export const BlockExplosionEffect = React.memo(() => (
  <div className="absolute inset-[-50%] flex items-center justify-center pointer-events-none z-[50]">
    <style>{`
      @keyframes splinter {
        0% { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
        100% { transform: translate(var(--tx), var(--ty)) rotate(var(--r)) scale(0.8); opacity: 0; }
      }
      @keyframes dust {
        0% { transform: scale(0.5); opacity: 0.8; }
        100% { transform: scale(2); opacity: 0; }
      }
    `}</style>
    
    <div className="absolute w-full h-full bg-[#5d4037] opacity-20 rounded-full animate-[dust_0.4s_ease-out_forwards] blur-md"></div>
    
    {[...Array(8)].map((_, i) => (
      <div 
        key={`s-${i}`}
        className="absolute w-2 h-1 bg-[#3e2723] border border-[#5d4037]"
        style={{
          //@ts-ignore custom property
          '--tx': `${(Math.random() - 0.5) * 120}px`,
          '--ty': `${(Math.random() - 0.5) * 120}px`,
          '--r': `${Math.random() * 720}deg`,
          animation: `splinter 0.5s ease-out forwards`
        }}
      />
    ))}
    {[...Array(6)].map((_, i) => (
      <div 
        key={`p-${i}`}
        className="absolute w-1 h-1 bg-[#8d6e63]"
        style={{
          //@ts-ignore custom property
          '--tx': `${(Math.random() - 0.5) * 80}px`,
          '--ty': `${(Math.random() - 0.5) * 80}px`,
          '--r': `${Math.random() * 360}deg`,
          animation: `splinter 0.6s ease-out forwards`
        }}
      />
    ))}
  </div>
));
BlockExplosionEffect.displayName = 'BlockExplosionEffect';

/**
 * `dispersedFrom` is the index where total internal reflection stopped and
 * refraction took over. Everything before it is the lethal, full-power beam;
 * everything after is light that leaked out of the prism. Drawing the two
 * differently is the point -- a student needs to SEE that the refracted part
 * is weak, not just watch the beam vanish for no visible reason.
 */
export const LaserOverlay = React.memo<{ path: Position[]; dispersedFrom?: number | null }>(({ path, dispersedFrom }) => {
  if (path.length < 2) return null;

  const toPoint = (p: Position) => {
    const cx = (p.x * 100 / GRID_SIZE) + (50 / GRID_SIZE);
    const cy = (p.y * 100 / GRID_SIZE) + (50 / GRID_SIZE);
    return `${cx} ${cy}`;
  };

  const split = typeof dispersedFrom === 'number' && dispersedFrom >= 0 && dispersedFrom < path.length - 1
    ? dispersedFrom
    : null;

  const strong = (split === null ? path : path.slice(0, split + 1)).map(toPoint).join(', ');
  const leaked = split === null ? null : path.slice(split).map(toPoint).join(', ');

  return (
    <svg 
      className="absolute inset-0 pointer-events-none z-30 w-full h-full overflow-visible"
      viewBox="0 0 100 100" 
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <polyline points={strong} fill="none" stroke="#ff0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" filter="url(#laserGlow)" />
      <polyline points={strong} fill="none" stroke="#ff4444" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
      {leaked && (
        <>
          {/* Refracted light: scattered, weak, harmless. */}
          <polyline
            points={leaked} fill="none" stroke="#7dd3fc" strokeWidth="1.2"
            strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.45"
            strokeDasharray="1.5 1.8"
          />
          <circle
            cx={path[split!].x * 100 / GRID_SIZE + 50 / GRID_SIZE}
            cy={path[split!].y * 100 / GRID_SIZE + 50 / GRID_SIZE}
            r="1.6" fill="none" stroke="#7dd3fc" strokeWidth="0.5" strokeOpacity="0.6"
          />
        </>
      )}
    </svg>
  );
});
LaserOverlay.displayName = 'LaserOverlay';
