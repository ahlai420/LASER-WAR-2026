import React from 'react';
import { Owner } from '../types';
import { Prism, Block, PowerSupplyPiece } from '../components/Pieces';
import { ExplosionEffect } from '../components/Effects';
import { Dice } from '../components/Dice';

export interface FlashCard {
  en: { title: string; text: string };
  bm: { title: string; text: string };
  visual?: React.ReactNode;
}

export const FLASHCARDS: Record<'STORY' | 'RULES' | 'PHYSICS', FlashCard[]> = {
  STORY: [
    {
      en: { title: "BACKGROUND", text: "In the year 2050, World War III breaks out. As a frontline soldier piloting a tank equipped with a high-performance laser cannon, you have achieved many victories." },
      bm: { title: "LATAR BELAKANG", text: "Pada tahun 2050, Perang Dunia Ketiga tercetus. Sebagai seorang askar barisan hadapan yang mengendalikan kereta kebal yang dipasang dengan meriam laser berprestasi tinggi, anda telah meraih banyak kemenangan." },
      visual: (
        <div className="absolute inset-0 bg-red-950 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,100,0,0.3),transparent)] animate-pulse"></div>
          <div className="absolute inset-0 opacity-40"><ExplosionEffect /></div>
          <div className="absolute top-1/2 left-1/4 scale-[2] opacity-30 delay-100"><ExplosionEffect /></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.8)_10px,rgba(0,0,0,0.8)_20px)] opacity-30"></div>
        </div>
      )
    },
    {
      en: { title: "THE AMBUSH", text: "However, in a fierce battle near a prism factory, your squad was annihilated, leaving you as the sole survivor. You must rely on your wits and use the many triangular prisms scattered around the factory to outsmart the enemy." },
      bm: { title: "SERANGAN HENDAP", text: "Namun, dalam pertempuran sengit berhampiran sebuah kilang prisma, skuad anda telah dimusnahkan, menjadikan anda satu-satunya yang masih hidup. Anda mesti bergantung pada kebijaksanaan anda dan menggunakan banyak prisma tiga sisi yang berselerak di kawasan kilang untuk menewaskan musuh." },
      visual: (
        <div className="absolute inset-0 bg-slate-900 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,255,255,0.1),transparent)]"></div>
          <div className="absolute top-10 left-10 w-32 h-32 rotate-12 opacity-40 animate-[spin_20s_linear_infinite]"><Prism owner={Owner.NONE} rotation={0} /></div>
          <div className="absolute bottom-10 right-10 w-48 h-48 -rotate-12 opacity-30 animate-[spin_15s_linear_infinite_reverse]"><Prism owner={Owner.AI} rotation={90} /></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-900/10 backdrop-blur-[1px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.8))]"></div>
        </div>
      )
    },
    {
      en: { title: "THE MISSION", text: "You must ensure that your power generator is not destroyed. The only way to win is to strike first and destroy the enemy's power generator." },
      bm: { title: "MISI", text: "Anda juga mesti memastikan alat penjana kuasa anda tidak dimusnahkan. Satu-satunya cara untuk menang ialah bertindak dahulu dan memusnahkan penjana kuasa musuh." },
      visual: (
        <div className="absolute inset-0 bg-emerald-950 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,rgba(16,185,129,0.2),transparent)] animate-[spin_4s_linear_infinite]"></div>
          <div className="w-48 h-48 scale-125 opacity-60"><PowerSupplyPiece owner={Owner.PLAYER} /></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,black_100%)]"></div>
        </div>
      )
    }
  ],
  RULES: [
    {
      en: { title: "OBJECTIVE", text: "Protect your Generator (Power Supply). Destroy the Enemy Generator." },
      bm: { title: "OBJEKTIF", text: "Lindungi Penjana Kuasa anda. Hancurkan Penjana Kuasa Musuh." },
      visual: (
        <div className="absolute inset-0 bg-black overflow-hidden flex items-center justify-center gap-8">
          <div className="w-32 h-32 opacity-80"><PowerSupplyPiece owner={Owner.PLAYER} /></div>
          <div className="w-1 h-32 bg-white/20 rotate-12"></div>
          <div className="w-32 h-32 opacity-80 grayscale"><PowerSupplyPiece owner={Owner.AI} /></div>
        </div>
      )
    },
    {
      en: { title: "ACTION POINTS", text: "Roll 1-3 AP. Use AP to MOVE (up to AP distance) or ROTATE (90°)." },
      bm: { title: "MATA TINDAKAN", text: "Baling 1-3 AP. Guna AP untuk GERAK (sehingga jarak AP) atau PUTAR (90°)." },
      visual: (
        <div className="absolute inset-0 bg-[#1a1a1a] overflow-hidden flex items-center justify-center">
          <div className="scale-150 animate-pulse"><Dice value={3} rolling={false} onClick={() => {}} /></div>
        </div>
      )
    },
    {
      en: { title: "AIMING", text: "Before firing you may slide your Laser along your home row once per turn. It is free — it costs no AP." },
      bm: { title: "MEMBIDIK", text: "Sebelum menembak, anda boleh menggerakkan Laser di barisan pangkalan anda sekali setiap pusingan. Ia percuma — tiada AP digunakan." },
      visual: (
        <div className="absolute inset-0 bg-[#101010] overflow-hidden flex items-center justify-center">
          <div className="w-full h-16 border-y border-dashed border-[#4B5320] relative">
            <div className="absolute inset-y-0 left-1/4 w-px bg-red-500/60"></div>
            <div className="absolute inset-y-0 left-1/2 w-px bg-red-500/60"></div>
            <div className="absolute inset-y-0 left-3/4 w-px bg-red-500/60"></div>
          </div>
        </div>
      )
    },
    {
      en: { title: "NEUTRAL PIECES", text: "Prisms and Blocks are neutral. Both players can Move or Rotate Prisms, and Move Blocks." },
      bm: { title: "KEPINGAN NEUTRAL", text: "Prisma dan Blok adalah neutral. Kedua-dua pemain boleh Gerak atau Putar Prisma, dan Gerak Blok." },
      visual: (
        <div className="absolute inset-0 bg-slate-800 overflow-hidden flex items-center justify-center gap-12">
          <div className="w-32 h-32 animate-[bounce_3s_infinite]"><Prism owner={Owner.NONE} rotation={0} /></div>
          <div className="w-32 h-32 animate-[bounce_3s_infinite_reverse]"><Block health={2} /></div>
        </div>
      )
    },
    {
      en: { title: "BLOCKS", text: "Blocks absorb 2 hits. They crack after the first hit." },
      bm: { title: "BLOK", text: "Blok menyerap 2 tembakan. Ia retak selepas tembakan pertama." },
      visual: (
        <div className="absolute inset-0 bg-[#2d1b1b] overflow-hidden flex items-center justify-center">
          <div className="w-40 h-40 relative">
            <Block health={1} />
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/20 blur-xl animate-pulse"></div>
          </div>
        </div>
      )
    },
    {
      en: { title: "SCORING & COMBOS", text: "Direct Hit: 50pts. Each REFLECTION on the way in raises the score. 1 reflection: 100pts. 2: 200pts. 3+ grants a SUPER COMBO (Score x2)! Refractions count for nothing." },
      bm: { title: "SKOR & KOMBO", text: "Tembakan Tepat: 50 mata. Setiap PANTULAN menaikkan skor. 1 pantulan: 100 mata. 2: 200 mata. 3+ memberikan KOMBO HEBAT (Skor x2)! Pembiasan tidak dikira." },
      visual: (
        <div className="absolute inset-0 bg-indigo-950 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-20 bg-[repeating-conic-gradient(#000_0_15deg,transparent_15deg_30deg)] animate-[spin_10s_linear_infinite]"></div>
          <div className="text-6xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] rotate-[-10deg] animate-pulse">X2 COMBO</div>
        </div>
      )
    }
  ],
  PHYSICS: [
    {
      en: { title: "CRITICAL ANGLE (~42°)", text: "Glass has a 'Critical Angle' of ~42°. This is the tipping point. If light inside hits the edge at an angle steeper than 42°, it is trapped and must reflect." },
      bm: { title: "SUDUT KRITIKAL (~42°)", text: "Kaca mempunyai 'Sudut Kritikal' ~42°. Ini adalah titik peralihan. Jika cahaya di dalam melanggar tepi pada sudut lebih curam daripada 42°, ia terperangkap dan mesti memantul." }
    },
    {
      en: { title: "TOTAL INTERNAL REFLECTION", text: "In a 45-45-90 prism, light hits the long side at 45°. Since 45° > 42°, it acts as a perfect mirror (TIR). No light escapes; 100% is reflected." },
      bm: { title: "PANTULAN DALAM PENUH", text: "Dalam prisma 45-45-90, cahaya melanggar sisi panjang pada 45°. Oleh kerana 45° > 42°, ia bertindak sebagai cermin sempurna (TIR). Tiada cahaya keluar; 100% dipantulkan." }
    },
    {
      en: { title: "REFRACTION", text: "If light enters the slanted side from outside, TIR fails. The light must cross the glass boundary TWICE — bending once on the way in and again on the way out — scattering and losing power each time. It leaks away at an angle and dies." },
      bm: { title: "PEMBIASAN", text: "Jika cahaya masuk melalui sisi condong dari luar, TIR gagal. Cahaya mesti melintasi sempadan kaca DUA KALI — membengkok sekali ketika masuk dan sekali lagi ketika keluar — bertaburan dan hilang kuasa setiap kali. Ia terbocor pada satu sudut dan mati." }
    },
    {
      en: { title: "WHY TIR WINS", text: "This is the whole lesson. TIR reflects 100% of the light, so the beam stays lethal and can be chained. A refracted beam is scattered and weak — it CANNOT destroy a generator, no matter how well you aim it. Only reflections score combo points." },
      bm: { title: "MENGAPA TIR MENANG", text: "Inilah intipati pelajaran ini. TIR memantulkan 100% cahaya, jadi pancaran kekal maut dan boleh dirangkai. Pancaran terbias bertaburan dan lemah — ia TIDAK BOLEH memusnahkan penjana kuasa, walau sebaik mana anda membidik. Hanya pantulan memberi mata kombo." }
    }
  ]
};
