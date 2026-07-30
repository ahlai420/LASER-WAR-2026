import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/', pretendToBeVisual: true
});
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.navigator = dom.window.navigator;
g.HTMLElement = dom.window.HTMLElement;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.MouseEvent = dom.window.MouseEvent;
g.getComputedStyle = dom.window.getComputedStyle;
g.requestAnimationFrame = (cb: any) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = (id: any) => clearTimeout(id);
g.localStorage = dom.window.localStorage;
g.IS_REACT_ACT_ENVIRONMENT = true;

// Pretend the player turned the effects down on a previous visit. Modules read
// this at import time, so it has to be in place before anything loads.
g.localStorage.setItem('laserwar.audio.v1', JSON.stringify({
  muted: false, sfxVolume: 0.15, musicVolume: 0.1
}));

const errors: string[] = [];
const origError = console.error;
console.error = (...args: any[]) => { errors.push(args.map(String).join(' ')); origError(...args); };

async function main() {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { act } = React as any;
  const audio = await import('../services/audio');
  const App = (await import('../App')).default;

  const container = document.getElementById('root')!;
  const root = createRoot(container);

  let pass = 0, fail = 0;
  const t = (name: string, cond: boolean, extra = '') => {
    if (cond) { pass++; console.log(`  ok   ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${extra}`); }
  };
  const tick = async (ms: number) => {
    await act(async () => { await new Promise(r => setTimeout(r, ms)); });
  };
  const $ = (sel: string) => container.querySelector(sel) as HTMLElement | null;
  const $$ = (sel: string) => Array.from(container.querySelectorAll(sel)) as HTMLElement[];
  const click = async (el: HTMLElement | null) => {
    if (!el) throw new Error('element not found');
    await act(async () => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
  };

  await act(async () => { root.render(React.createElement(App)); });
  console.log('\n--- saved audio settings ---');
  // Regression: restore() used to run before its own variables were declared,
  // so the ReferenceError was swallowed and saved levels never came back --
  // you turned the effects down, reloaded, and the slider was back at default.
  t('saved effects volume is restored', audio.getSfxVolume() === 0.15, `got ${audio.getSfxVolume()}`);
  t('saved music volume is restored', audio.getMusicVolume() === 0.1, `got ${audio.getMusicVolume()}`);
  audio.setSfxVolume(0.42);
  t('changing effects volume is written back',
    JSON.parse(localStorage.getItem('laserwar.audio.v1')!).sfxVolume === 0.42);
  audio.setSfxVolume(5);
  t('volume clamps at 100%', audio.getSfxVolume() === 1, `got ${audio.getSfxVolume()}`);
  audio.setSfxVolume(-3);
  t('volume clamps at 0%', audio.getSfxVolume() === 0, `got ${audio.getSfxVolume()}`);
  audio.setSfxVolume(0.5);

  console.log('\n--- mount & lobby ---');
  t('lobby renders', !!$('#callsign'));

  // Empty callsign must be rejected with a visible message, not an alert().
  await click($$('button').find(b => b.textContent?.includes('START')) ?? null);
  t('empty callsign is rejected inline', !!container.textContent?.includes('Enter a callsign'));
  t('lobby shows the author credit', !!container.textContent?.includes('Dr. Lai Chin Siong'));

  const input = $('#callsign') as any;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, 'CMDR');
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });

  // Pick the hardest AI so the smoke test exercises the full planner.
  await click($$('button').find(b => b.textContent?.trim() === 'ACE') ?? null);
  await click($$('button').find(b => b.textContent?.includes('START')) ?? null);

  console.log('\n--- game start ---');
  const cells = $$('[role="gridcell"]');
  t('board renders 64 cells', cells.length === 64, `got ${cells.length}`);
  t('phase starts at ROLL', !!container.textContent?.includes('ROLL'));

  console.log('\n--- player turn ---');
  await click($('.perspective-1000'));           // dice
  await tick(900);
  t('roll grants AP and enters ACTION', !!container.textContent?.includes('AP Left'), container.textContent?.slice(0, 80));

  console.log('\n--- rotation picker ---');
  {
    // Select a prism and open the rotate picker, then check the geometry.
    const prismCell = $$('[role="gridcell"]').find(c => c.querySelector('svg path[d="M10,90 L10,10 L90,90 Z"]'));
    if (!prismCell) {
      console.log('  skip (no prism reachable this board)');
    } else {
      await click(prismCell);
      await tick(80);
      const rotateBtn = $$('button').find(b => b.textContent?.includes('ROTATE'));
      if (rotateBtn) {
        await click(rotateBtn);
        await tick(80);
      }
      const picker = container.querySelector('[aria-label^="Rotate to"]')?.parentElement as HTMLElement | null;
      t('rotate picker opens', !!picker);
      if (picker) {
        const style = picker.getAttribute('style') ?? '';
        t('picker no longer shifted half a cell', !style.includes('translateY(50%)'), style);
        t('picker sits on the piece plane, not lifted 60px', !style.includes('translateZ(60px)'), style);
        t('picker spans exactly three squares', style.includes('300%'), style);
        const options = $$('[aria-label^="Rotate to"]');
        t('four orientations offered', options.length === 4, `got ${options.length}`);
        const disabled = options.filter(o => (o as HTMLButtonElement).disabled);
        t('current orientation is marked and not re-selectable', disabled.length === 1, `got ${disabled.length}`);
      }
    }
  }

  // A player who does not want to spend AP must still be able to reach the shot.
  const skip = $$('button').find(b => b.textContent?.includes('Skip to fire'));
  t('skip-to-fire escape hatch exists', !!skip);
  if (skip) { await click(skip); await tick(150); }
  const fire = $('[aria-label="Fire laser"]');
  t('fire control appears in SHOOT phase', !!fire);

  if (fire) {
    await click(fire);
    await tick(2500);
  }

  console.log('\n--- audio settings ---');
  {
    const trigger = $$('button').find(b => b.textContent?.trim() === 'Audio');
    t('audio settings button present', !!trigger);
    if (trigger) {
      await click(trigger);
      await tick(80);
      const sfx = container.querySelector('#vol-sfx') as HTMLInputElement | null;
      const music = container.querySelector('#vol-music') as HTMLInputElement | null;
      t('effects and music have separate sliders', !!sfx && !!music);
      t('they are independent values', !!sfx && !!music && sfx.value !== music.value,
        `${sfx?.value} / ${music?.value}`);
      const previews = $$('button').filter(b => /Laser|Block hit|Explosion|Dice/.test(b.textContent ?? ''));
      t('every sound can be previewed', previews.length >= 4, `got ${previews.length}`);
      const mute = $$('button').find(b => /Sound is (on|off)/.test(b.textContent ?? ''));
      t('mute toggle present', !!mute);
      if (mute) {
        await click(mute);
        await tick(60);
        const sfx2 = container.querySelector('#vol-sfx') as HTMLInputElement;
        t('muting disables both sliders', sfx2.disabled);
        await click(mute);
        await tick(60);
      }
    }
  }

  console.log('\n--- ai turn ---');
  await tick(9000);
  const stillAlive = $$('[role="gridcell"]').length === 64;
  t('board intact after AI turn', stillAlive);
  t('AI produced log output', !!container.textContent?.match(/AI/i));

  console.log('\n--- teardown ---');
  await act(async () => { root.unmount(); });
  t('unmounts cleanly', true);

  const real = errors.filter(e =>
    !e.includes('not wrapped in act') &&
    !e.includes('Warning: ReactDOM.render')
  );
  t('no React errors logged', real.length === 0, real.slice(0, 2).join(' | '));

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('SMOKE CRASH', e); process.exit(1); });
