
import React from 'react';

interface DiceProps {
  value: number;
  rolling: boolean;
  onClick: () => void;
}

export const Dice = React.memo<DiceProps>(({ value, rolling, onClick }) => {
  const getTransform = (val: number) => {
    const idleTilt = 'rotateX(-20deg) rotateY(20deg)';
    if (rolling) return 'rotateX(720deg) rotateY(720deg)';
    switch(val) {
      case 1: return idleTilt;
      case 2: return 'rotateY(-90deg) rotateX(-10deg)';
      case 3: return 'rotateY(180deg) rotateX(10deg)';
      default: return idleTilt;
    }
  };

  return (
    <div className="relative w-24 h-24 perspective-1000 cursor-pointer group mx-auto" onClick={onClick}>
      <div 
        className={`w-full h-full relative preserve-3d transition-transform duration-1000 ease-out ${rolling ? 'animate-spin-3d' : ''}`}
        style={{ transform: getTransform(value) }}
      >
        {/* FACE 1 */}
        <div className="absolute w-full h-full bg-[#1e1e1e] border-2 border-[#4B5320] flex items-center justify-center translate-z-12 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] rounded-sm">
           <div className="w-4 h-4 rounded-full bg-[#C2B280] shadow-[0_0_5px_#C2B280]"></div>
        </div>
        
        {/* FACE 2 */}
        <div className="absolute w-full h-full bg-[#1e1e1e] border-2 border-[#4B5320] flex items-center justify-center rotate-y-90 translate-z-12 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] rounded-sm gap-4">
           <div className="w-4 h-4 rounded-full bg-[#C2B280] shadow-[0_0_5px_#C2B280] mb-8"></div>
           <div className="w-4 h-4 rounded-full bg-[#C2B280] shadow-[0_0_5px_#C2B280] mt-8"></div>
        </div>

        {/* FACE 3 */}
        <div className="absolute w-full h-full bg-[#1e1e1e] border-2 border-[#4B5320] flex items-center justify-center rotate-y-180 translate-z-12 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] rounded-sm">
           <div className="w-4 h-4 rounded-full bg-[#C2B280] shadow-[0_0_5px_#C2B280] absolute top-3 left-3"></div>
           <div className="w-4 h-4 rounded-full bg-[#C2B280] shadow-[0_0_5px_#C2B280]"></div>
           <div className="w-4 h-4 rounded-full bg-[#C2B280] shadow-[0_0_5px_#C2B280] absolute bottom-3 right-3"></div>
        </div>

        {/* REPEAT FACES FOR CUBE COMPLETENESS (Mapped 4,5,6 to 1,2,3 logic for visual simplicity in this variation or random fill) */}
        <div className="absolute w-full h-full bg-[#1e1e1e] border-2 border-[#4B5320] flex items-center justify-center rotate-y-m90 translate-z-12 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] rounded-sm">
           <div className="w-4 h-4 rounded-full bg-[#C2B280] shadow-[0_0_5px_#C2B280]"></div>
        </div>
        <div className="absolute w-full h-full bg-[#1e1e1e] border-2 border-[#4B5320] flex items-center justify-center rotate-x-90 translate-z-12 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] rounded-sm gap-4">
           <div className="w-4 h-4 rounded-full bg-[#C2B280] shadow-[0_0_5px_#C2B280] mb-8"></div>
           <div className="w-4 h-4 rounded-full bg-[#C2B280] shadow-[0_0_5px_#C2B280] mt-8"></div>
        </div>
        <div className="absolute w-full h-full bg-[#1e1e1e] border-2 border-[#4B5320] flex items-center justify-center rotate-x-m90 translate-z-12 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] rounded-sm">
           <div className="w-4 h-4 rounded-full bg-[#C2B280] shadow-[0_0_5px_#C2B280] absolute top-3 left-3"></div>
           <div className="w-4 h-4 rounded-full bg-[#C2B280] shadow-[0_0_5px_#C2B280]"></div>
           <div className="w-4 h-4 rounded-full bg-[#C2B280] shadow-[0_0_5px_#C2B280] absolute bottom-3 right-3"></div>
        </div>
      </div>
    </div>
  );
});
Dice.displayName = 'Dice';
