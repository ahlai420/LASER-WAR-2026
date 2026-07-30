import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play, X } from 'lucide-react';
import {
  playLaser, playCrackle, playExplosion, playDice, customSfxLoaded, SfxName
} from '../services/audio';

interface Props {
  muted: boolean;
  sfxVolume: number;
  musicVolume: number;
  onToggleMute: () => void;
  onSfxVolume: (v: number) => void;
  onMusicVolume: (v: number) => void;
}

const PREVIEWS: { name: SfxName | 'dice'; label: string; play: () => void }[] = [
  { name: 'laser',     label: 'Laser',     play: playLaser },
  { name: 'hit',       label: 'Block hit', play: playCrackle },
  { name: 'explosion', label: 'Explosion', play: playExplosion },
  { name: 'dice',      label: 'Dice',      play: playDice }
];

const Slider: React.FC<{
  id: string; label: string; value: number; disabled: boolean; onChange: (v: number) => void;
}> = ({ id, label, value, disabled, onChange }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-baseline">
      <label htmlFor={id} className="text-[9px] text-[#6E7376] uppercase tracking-widest">{label}</label>
      <span className="text-[10px] text-[#C2B280] tabular-nums">{Math.round(value * 100)}%</span>
    </div>
    <input
      id={id}
      type="range"
      min={0}
      max={100}
      value={Math.round(value * 100)}
      disabled={disabled}
      onChange={e => onChange(Number(e.target.value) / 100)}
      className="w-full accent-[#C2B280] disabled:opacity-30 cursor-pointer"
    />
  </div>
);

export const AudioPanel: React.FC<Props> = ({
  muted, sfxVolume, musicVolume, onToggleMute, onSfxVolume, onMusicVolume
}) => {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<SfxName[]>([]);
  const wrap = useRef<HTMLDivElement>(null);

  // Samples load asynchronously, so re-check while the panel is open.
  useEffect(() => {
    if (!open) return;
    setCustom(customSfxLoaded());
    const id = setInterval(() => setCustom(customSfxLoaded()), 500);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative w-auto landscape:w-full md:w-full">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-10 h-10 md:w-full md:h-auto md:py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#4B5320]/50 rounded-sm flex items-center justify-center md:gap-2 text-[10px] text-[#6E7376] hover:text-[#C2B280] transition-colors uppercase tracking-widest"
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        <span className="hidden md:inline">Audio</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Audio settings"
          className="absolute z-[120] bottom-full mb-2 left-0 landscape:left-full landscape:bottom-0 landscape:ml-2 md:left-full md:bottom-0 md:ml-2 w-60 bg-[#0f0f0f] border-2 border-[#4B5320] shadow-[0_0_30px_rgba(0,0,0,0.9)] p-4 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-2">
            <span className="text-[10px] text-[#C2B280] font-bold uppercase tracking-widest">Audio</span>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-[#6E7376] hover:text-white">
              <X size={14} />
            </button>
          </div>

          <button
            onClick={onToggleMute}
            aria-pressed={muted}
            className={`w-full py-2 text-[10px] font-bold uppercase tracking-widest border transition-colors ${
              muted
                ? 'bg-red-900/30 border-red-500/50 text-red-400'
                : 'bg-[#1a1a1a] border-[#2A2A2A] text-[#6E7376] hover:text-[#C2B280]'
            }`}
          >
            {muted ? 'Sound is off' : 'Sound is on'}
          </button>

          <Slider id="vol-sfx" label="Effects" value={sfxVolume} disabled={muted} onChange={onSfxVolume} />
          <Slider id="vol-music" label="Music" value={musicVolume} disabled={muted} onChange={onMusicVolume} />

          <div className="space-y-1 border-t border-[#2A2A2A] pt-3">
            <div className="text-[9px] text-[#6E7376] uppercase tracking-widest mb-2">Test</div>
            {PREVIEWS.map(({ name, label, play }) => (
              <button
                key={name}
                onClick={play}
                disabled={muted}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] text-[#C2B280] bg-[#1a1a1a] hover:bg-[#252525] border border-[#2A2A2A] disabled:opacity-30 transition-colors"
              >
                <span className="flex items-center gap-2"><Play size={10} /> {label}</span>
                <span className="text-[8px] uppercase tracking-wider text-[#6E7376]">
                  {name === 'dice'
                    ? 'built-in'
                    : custom.includes(name as SfxName) ? 'your file' : 'built-in'}
                </span>
              </button>
            ))}
            <p className="text-[9px] text-[#6E7376] leading-snug pt-2">
              Your files are level-matched to the built-in sounds automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
