/**
 * Shared Web Audio singleton.
 *
 * The original code called `new AudioContext()` on every dice roll and every
 * block hit. Browsers cap concurrent contexts at roughly six, so sound simply
 * stopped working a few turns into a match while the console filled with
 * warnings. One lazily-created context, reused forever, fixes that.
 */

/**
 * Drop a music file at `public/bgm.mp3` and it plays automatically.
 * If the file is absent the game stays silent instead of erroring.
 */
export const BGM_SRC = '/bgm.mp3';

/**
 * Drop-in custom sound effects.
 *
 * Put a file at any of these paths and it replaces the built-in synthesised
 * sound. If none is present the synthesised fallback plays, so the game always
 * has audio. The dice roll is intentionally synth-only.
 *
 *   public/sfx/laser.mp3      - firing the laser
 *   public/sfx/hit.mp3        - beam striking a block
 *   public/sfx/explosion.mp3  - generator destroyed
 *
 * .mp3, .wav and .ogg are all tried, in that order.
 */
export type SfxName = 'laser' | 'hit' | 'explosion';

const SFX_PATHS: Record<SfxName, string[]> = {
  laser:     ['/sfx/laser.mp3', '/sfx/laser.wav', '/sfx/laser.ogg'],
  hit:       ['/sfx/hit.mp3', '/sfx/hit.wav', '/sfx/hit.ogg'],
  explosion: ['/sfx/explosion.mp3', '/sfx/explosion.wav', '/sfx/explosion.ogg']
};

interface LoadedSample {
  buffer: AudioBuffer;
  /** Normalisation factor derived from the file's own peak level. */
  normalise: number;
}

const samples: Partial<Record<SfxName, LoadedSample>> = {};
const attempted = new Set<SfxName>();

/**
 * Peak-normalisation factor for a decoded sample. Pure, so it can be tested.
 * Exported for the test suite.
 */
export const normalisationFor = (peak: number, target = SAMPLE_TARGET_PEAK): number => {
  if (!(peak > 0) || !Number.isFinite(peak)) return 1;
  return Math.min(4, target / peak);
};

const peakOf = (buffer: AudioBuffer): number => {
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    // Files can be long; a stride is plenty for a peak estimate.
    const stride = Math.max(1, Math.floor(data.length / 40000));
    for (let i = 0; i < data.length; i += stride) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
    }
  }
  return peak;
};

const persist = () => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ muted, sfxVolume, musicVolume }));
  } catch {
    /* private browsing or storage disabled */
  }
};

const restore = () => {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { muted?: boolean; sfxVolume?: number; musicVolume?: number };
    if (typeof saved.muted === 'boolean') muted = saved.muted;
    if (typeof saved.sfxVolume === 'number') sfxVolume = Math.min(1, Math.max(0, saved.sfxVolume));
    if (typeof saved.musicVolume === 'number') musicVolume = Math.min(1, Math.max(0, saved.musicVolume));
  } catch {
    /* corrupt value: fall back to defaults */
  }
};

/**
 * Loudness targets.
 *
 * A commercial sound file is usually mastered close to full scale (peak ~1.0),
 * while the synthesised fallbacks here peak around 0.2. Playing both at the
 * same gain makes custom files roughly three times louder, which is why
 * dropping in an MP3 made the effects deafening. Every custom sample is
 * therefore peak-normalised to SAMPLE_TARGET_PEAK on load, so files and
 * fallbacks sit at matched loudness whatever level they were mastered at.
 */
const SAMPLE_TARGET_PEAK = 0.45;

/** Per-sound trim, in case one file still needs nudging. 1 = no change. */
const SFX_TRIM: Record<string, number> = {
  laser: 1,
  hit: 1,
  explosion: 1
};

const STORAGE_KEY = 'laserwar.audio.v1';

let ctx: AudioContext | null = null;
let muted = false;
let sfxVolume = 0.5;
let musicVolume = 0.35;
let bgm: HTMLAudioElement | null = null;
let bgmFailed = false;
let unlockBound = false;

/*
 * Must run AFTER the declarations above, not before them.
 *
 * `restore()` was previously called higher up the file, where STORAGE_KEY,
 * `muted` and the two volume variables were still in the temporal dead zone.
 * Touching them threw a ReferenceError that the function's own catch block
 * swallowed, so saved settings silently never came back: you turned the effects
 * down, reloaded, and the slider was at 70% again.
 */
restore();

const getContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    // Autoplay policy suspends the context until a user gesture.
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

export const isMuted = () => muted;

const applyMusicVolume = () => {
  if (bgm) bgm.volume = muted ? 0 : musicVolume;
};

export const setMuted = (value: boolean) => {
  muted = value;
  applyMusicVolume();
  if (bgm) {
    if (muted) bgm.pause();
    else void bgm.play().catch(() => {});
  }
  persist();
};

export const getSfxVolume = () => sfxVolume;
export const getMusicVolume = () => musicVolume;

export const setSfxVolume = (value: number) => {
  sfxVolume = Math.min(1, Math.max(0, value));
  persist();
};

export const setMusicVolume = (value: number) => {
  musicVolume = Math.min(1, Math.max(0, value));
  applyMusicVolume();
  persist();
};

const initBgm = () => {
  if (bgm || bgmFailed || typeof Audio === 'undefined') return;
  try {
    const el = new Audio(BGM_SRC);
    el.loop = true;
    el.preload = 'auto';
    el.volume = muted ? 0 : musicVolume;
    // No music file present is a normal setup, not an error worth logging.
    el.addEventListener('error', () => { bgmFailed = true; bgm = null; }, { once: true });
    bgm = el;
  } catch {
    bgmFailed = true;
  }
};

export const startBgm = () => {
  if (muted) return;
  initBgm();
  if (bgm && bgm.paused) void bgm.play().catch(() => { /* still waiting for a gesture */ });
};

export const stopBgm = () => {
  bgm?.pause();
};

/**
 * Fetches and decodes a custom sample. Failure is expected and silent -- no
 * file simply means the synthesised fallback is used.
 */
const loadSample = async (name: SfxName): Promise<void> => {
  if (attempted.has(name)) return;
  attempted.add(name);
  const c = getContext();
  if (!c) return;

  for (const url of SFX_PATHS[name]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const bytes = await res.arrayBuffer();
      const buffer = await c.decodeAudioData(bytes);
      samples[name] = { buffer, normalise: normalisationFor(peakOf(buffer)) };
      return;
    } catch {
      /* try the next extension */
    }
  }
};

export const preloadSfx = () => {
  void loadSample('laser');
  void loadSample('hit');
  void loadSample('explosion');
};

/** True when a custom sample handled the sound; false means fall back to synth. */
const playSample = (name: SfxName): boolean => {
  const loaded = samples[name];
  const c = ctx;
  if (!loaded || !c) return false;
  try {
    const src = c.createBufferSource();
    const gain = c.createGain();
    src.buffer = loaded.buffer;
    gain.gain.value = sfxVolume * loaded.normalise * (SFX_TRIM[name] ?? 1);
    src.connect(gain);
    gain.connect(c.destination);
    src.start();
    src.onended = () => { src.disconnect(); gain.disconnect(); };
    return true;
  } catch {
    return false;
  }
};

/** Which sounds are currently coming from custom files, for the settings UI. */
export const customSfxLoaded = (): SfxName[] =>
  (Object.keys(samples) as SfxName[]).filter(n => !!samples[n]);

/** Call from any user gesture to unlock audio before the first sound is needed. */
export const unlockAudio = () => {
  getContext();
  preloadSfx();
  startBgm();
};

/**
 * Browsers refuse to start audio until the user interacts with the page, and
 * which gesture counts varies between them. Unlocking only on the START button
 * left some browsers muted for the whole match, so listen for the first
 * interaction anywhere and detach once sound is actually running.
 */
export const bindAutoUnlock = () => {
  if (unlockBound || typeof window === 'undefined') return () => {};
  unlockBound = true;

  const handler = () => {
    const c = getContext();
    preloadSfx();
    startBgm();
    if (c && c.state === 'running') detach();
  };
  const detach = () => {
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
    window.removeEventListener('touchstart', handler);
    unlockBound = false;
  };

  window.addEventListener('pointerdown', handler);
  window.addEventListener('keydown', handler);
  window.addEventListener('touchstart', handler);
  return detach;
};

export const playCrackle = () => {
  if (muted) return;
  if (playSample('hit')) return;
  const c = getContext();
  if (!c) return;
  try {
    const bufferSize = Math.floor(c.sampleRate * 0.1);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.45 * sfxVolume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.1);

    noise.connect(gain);
    gain.connect(c.destination);
    noise.start();
    noise.onended = () => {
      noise.disconnect();
      gain.disconnect();
    };
  } catch {
    /* audio is optional */
  }
};

export const playDice = () => {
  if (muted) return;
  const c = getContext();
  if (!c) return;
  try {
    const now = c.currentTime;
    for (let i = 0; i < 6; i++) {
      const t = now + i * 0.06 + Math.random() * 0.02;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.frequency.setValueAtTime(400 + Math.random() * 300, t);
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22 * sfxVolume, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.06);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    }
  } catch {
    /* audio is optional */
  }
};

export const playLaser = () => {
  if (muted) return;
  if (playSample('laser')) return;
  const c = getContext();
  if (!c) return;
  try {
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.35);
    gain.gain.setValueAtTime(0.28 * sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.36);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  } catch {
    /* audio is optional */
  }
};

/**
 * Generator destruction. There was no explosion sound at all before -- the
 * screen flashed and shook in silence.
 */
export const playExplosion = () => {
  if (muted) return;
  if (playSample('explosion')) return;
  const c = getContext();
  if (!c) return;
  try {
    const now = c.currentTime;

    // Body: filtered noise burst with a long tail.
    const length = Math.floor(c.sampleRate * 1.4);
    const buffer = c.createBuffer(1, length, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2.2);
      data[i] = (Math.random() * 2 - 1) * decay;
    }
    const noise = c.createBufferSource();
    noise.buffer = buffer;

    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800, now);
    lp.frequency.exponentialRampToValueAtTime(120, now + 1.2);

    const noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime(0.7 * sfxVolume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    noise.connect(lp);
    lp.connect(noiseGain);
    noiseGain.connect(c.destination);

    // Thump: sub-bass drop underneath the blast.
    const sub = c.createOscillator();
    const subGain = c.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.7);
    subGain.gain.setValueAtTime(0.6 * sfxVolume, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    sub.connect(subGain);
    subGain.connect(c.destination);

    noise.start(now);
    sub.start(now);
    sub.stop(now + 0.85);

    noise.onended = () => { noise.disconnect(); lp.disconnect(); noiseGain.disconnect(); };
    sub.onended = () => { sub.disconnect(); subGain.disconnect(); };
  } catch {
    /* audio is optional */
  }
};
