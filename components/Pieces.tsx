
import React from 'react';
import { Zap, Shield } from 'lucide-react';
import { Owner } from '../types';

export const Prism = React.memo<{ owner: Owner; rotation: number }>(({ owner, rotation }) => {
  // Neutral colors by default
  let strokeColor = "#A3A3A3";
  let fillColor = "rgba(255, 255, 255, 0.2)";

  if (owner === Owner.PLAYER) {
    strokeColor = "#10B981";
    fillColor = "rgba(16, 185, 129, 0.3)";
  } else if (owner === Owner.AI) {
    strokeColor = "#EF4444";
    fillColor = "rgba(239, 68, 68, 0.3)";
  }

  return (
    <div 
      className={`w-full h-full relative transition-transform duration-500 ease-in-out p-1`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">
        {/* Right-Angle Triangle */}
        <path 
          d="M10,90 L10,10 L90,90 Z" 
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* Tech markings */}
        <circle cx="25" cy="75" r="2" fill="white" opacity="0.5" />
        <line x1="10" y1="10" x2="90" y2="90" stroke="white" strokeWidth="1" opacity="0.3" strokeDasharray="2,2" />
      </svg>
    </div>
  );
});
Prism.displayName = 'Prism';

export const Block = React.memo<{ health?: number }>(({ health = 2 }) => (
  <div className="w-full h-full p-1">
    <div className={`w-full h-full bg-[#424242] rounded-sm border-2 border-[#616161] relative shadow-lg overflow-hidden transition-all duration-300 ${health === 1 ? 'brightness-50 border-red-900' : ''}`}>
      {/* Metal Texture */}
      <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#000_5px,#000_10px)]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 border border-[#757575] opacity-50"></div>
      <div className="absolute top-1 right-1 w-1 h-1 bg-yellow-500 rounded-full opacity-50"></div>
      
      {health === 1 && (
         <div className="absolute inset-0 w-full h-full pointer-events-none z-20 mix-blend-multiply animate-in fade-in zoom-in duration-300">
           <svg viewBox="0 0 100 100" className="w-full h-full">
             <path d="M20,80 L45,55 L40,40 L60,35 L75,15" stroke="black" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
             <path d="M45,55 L65,65 M40,40 L20,30 M60,35 L85,45" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
           </svg>
         </div>
      )}
    </div>
  </div>
));
Block.displayName = 'Block';

export const PowerSupplyPiece = React.memo<{ owner: Owner }>(({ owner }) => (
  <div className="w-full h-full p-1 flex items-center justify-center relative group">
    <div className={`absolute inset-0 rounded-sm opacity-20 ${owner === Owner.PLAYER ? 'bg-emerald-500 animate-pulse' : 'bg-red-600 animate-pulse'}`}></div>
    <div className={`relative z-10 w-3/4 h-3/4 border-2 ${owner === Owner.PLAYER ? 'border-emerald-500 bg-emerald-900/80' : 'border-red-500 bg-red-900/80'} flex items-center justify-center shadow-lg`}>
       <Zap 
        size={24} 
        className={`drop-shadow-lg ${owner === Owner.PLAYER ? 'text-emerald-400 fill-emerald-400' : 'text-red-500 fill-red-500'}`}
        strokeWidth={0}
      />
    </div>
    <div className={`absolute -bottom-1 text-[6px] font-black tracking-widest text-black ${owner === Owner.PLAYER ? 'bg-emerald-500' : 'bg-red-500'} px-1 rounded-sm`}>PWR</div>
  </div>
));
PowerSupplyPiece.displayName = 'PowerSupplyPiece';

export const ShooterPiece = React.memo<{ owner: Owner; rotation: number }>(({ owner, rotation }) => (
  <div 
    className="w-full h-full flex items-center justify-center relative transition-transform duration-300"
    style={{ transform: `rotate(${rotation}deg)` }}
  >
    {/* Turret Body */}
    <div className={`w-8 h-10 rounded-t-sm ${owner === Owner.PLAYER ? 'bg-emerald-900 border-emerald-500' : 'bg-red-900 border-red-500'} border-2 flex flex-col items-center relative z-10 shadow-lg`}>
      {/* Laser Emitter */}
      <div className="w-1 h-3 bg-white animate-pulse mt-1 shadow-[0_0_5px_white]"></div>
      {/* Barrel details */}
      <div className="w-6 h-px bg-black/50 mt-1"></div>
      <div className="w-6 h-px bg-black/50 mt-1"></div>
      <div className="w-6 h-px bg-black/50 mt-1"></div>
      <div className="mt-auto mb-1 text-[6px] text-white/80 font-bold tracking-tighter">LASER</div>
    </div>
    {/* Base glow */}
    <div className={`absolute bottom-1 w-10 h-2 ${owner === Owner.PLAYER ? 'bg-emerald-500' : 'bg-red-500'} blur-sm opacity-50`}></div>
  </div>
));
ShooterPiece.displayName = 'ShooterPiece';
