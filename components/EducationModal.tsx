import React, { useEffect, useState } from 'react';
import { BookOpen, Atom, FileText } from 'lucide-react';
import { FLASHCARDS } from '../data/flashcards';

type ModalType = 'RULES' | 'PHYSICS' | 'STORY';

const META: Record<ModalType, { title: string; icon: React.ReactNode }> = {
  RULES: { title: 'BRIEFING', icon: <BookOpen size={20} /> },
  PHYSICS: { title: 'TACTICAL INTEL', icon: <Atom size={20} /> },
  STORY: { title: 'OPERATION BACKSTORY', icon: <FileText size={20} /> }
};

export const EducationModal: React.FC<{ type: ModalType; onClose: () => void }> = ({ type, onClose }) => {
  const [lang, setLang] = useState<'en' | 'bm'>('en');
  const [index, setIndex] = useState(0);

  const data = FLASHCARDS[type];
  const current = data[index];
  const { title, icon } = META[type];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex(i => Math.min(data.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data.length, onClose]);

  return (
    <div
      className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#2A2A2A] border-2 border-[#4B5320] rounded-sm shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] aspect-[3/4] md:aspect-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[#4B5320] p-4 flex justify-between items-center border-b border-[#6E7376] shrink-0 z-20 relative shadow-md">
          <h2 className="text-[#C2B280] font-black tracking-widest text-xl flex items-center gap-2">
            {icon} {title}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-[#C2B280] hover:text-white font-bold px-2">
            X
          </button>
        </div>

        <div className="flex-1 relative flex flex-col overflow-hidden">
          {current.visual && (
            <div className="absolute inset-0 z-0 pointer-events-none">
              {current.visual}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60"></div>
            </div>
          )}

          <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center overflow-y-auto p-8">
            <div className="absolute top-2 right-2 flex gap-2">
              {(['en', 'bm'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={`text-xs px-2 py-1 border ${
                    lang === l
                      ? 'bg-[#C2B280] text-black border-[#C2B280]'
                      : 'text-[#6E7376] border-[#6E7376] bg-black/50'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="mb-6 mt-8">
              <h3 className="text-2xl text-white font-bold mb-4 uppercase decoration-2 underline-offset-4 decoration-[#E25822] underline drop-shadow-md">
                {current[lang].title}
              </h3>
              <p className="text-[#C2B280] text-lg leading-relaxed drop-shadow-sm font-medium">
                {current[lang].text}
              </p>
            </div>

            {type === 'PHYSICS' && index === 0 && (
              <div className="mt-4 border border-white/20 p-2 bg-black/50">
                <svg width="100" height="100" viewBox="0 0 100 100" role="img" aria-label="Critical angle diagram">
                  <path d="M10,90 L10,10 L90,90 Z" fill="rgba(255,255,255,0.1)" stroke="#22d3ee" strokeWidth="2" />
                  <line x1="50" y1="50" x2="20" y2="80" stroke="white" strokeWidth="1" strokeDasharray="2" />
                  <text x="50" y="45" fill="yellow" fontSize="10" textAnchor="middle">42° (Crit)</text>
                </svg>
              </div>
            )}
            {type === 'PHYSICS' && index === 1 && (
              <div className="mt-4 border border-white/20 p-2 bg-black/50">
                <svg width="100" height="100" viewBox="0 0 100 100" role="img" aria-label="Total internal reflection diagram">
                  <path d="M10,90 L10,10 L90,90 Z" fill="rgba(255,255,255,0.1)" stroke="#22d3ee" strokeWidth="2" />
                  <path d="M50,90 L50,50 L10,50" fill="none" stroke="red" strokeWidth="2" strokeDasharray="4" />
                  <circle cx="50" cy="50" r="2" fill="white" />
                  <text x="55" y="40" fill="yellow" fontSize="8" textAnchor="start">45° &gt; 42°</text>
                  <text x="50" y="20" fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">TIR</text>
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#1a1a1a] p-4 flex justify-between items-center border-t border-[#6E7376] shrink-0 z-20 relative">
          <button
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
            className="px-4 py-2 bg-[#6E7376] disabled:opacity-30 text-white font-mono text-sm"
          >
            PREV
          </button>
          <div className="flex gap-1">
            {data.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i === index ? 'bg-[#E25822]' : 'bg-[#6E7376]'}`}></div>
            ))}
          </div>
          <button
            onClick={() => setIndex(i => Math.min(data.length - 1, i + 1))}
            disabled={index === data.length - 1}
            className="px-4 py-2 bg-[#6E7376] disabled:opacity-30 text-white font-mono text-sm"
          >
            NEXT
          </button>
        </div>
      </div>
    </div>
  );
};
