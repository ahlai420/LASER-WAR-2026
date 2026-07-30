# Laser War: Tactical Optics

**Created by Dr. Lai Chin Siong**

Turn-based laser strategy. Move prisms, bend the beam, destroy the enemy generator
before it destroys yours.

## Run locally

```bash
npm install
npm run dev
```

The Gemini API key is **optional** — it only powers AI taunt lines and the
"Tactical Intel" tip. Without a key the game runs fully offline on built-in
strings and never touches the network. To enable it, set `GEMINI_API_KEY` in
`.env.local`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Optics (including the TIR-vs-refraction invariants), movement, scoring, AI and reducer tests (34 assertions) |
| `npm run test:ui` | Headless jsdom playthrough: lobby → roll → rotate → fire → AI turn → unmount (20 assertions) |
| `npm run balance` | Self-play simulation reporting win rates per difficulty |

## Layout

```
types.ts                 Shared types + LASER_RULES tuning switches
services/gameLogic.ts    Pure rules: board setup, laser tracing, movement, scoring
services/aiEngine.ts     Strategic opponent (pure; returns a plan, applies nothing)
services/audio.ts        Single shared AudioContext
services/geminiService.ts Optional flavour text, SDK loaded on demand
state/gameReducer.ts     All game state in one reducer
data/flashcards.tsx      Story / briefing / physics card content (EN + BM)
components/              Presentational pieces, board, sidebar, modals
App.tsx                  Turn orchestration only
```

## Optics — and why the asymmetry is deliberate

This is a teaching tool, so the two mechanisms must NOT be equally useful:

| | Strike a flat leg | Strike the slanted hypotenuse |
| --- | --- | --- |
| Physics | Total internal reflection, 45° > 42° critical angle | Refraction: the light crosses the glass boundary twice |
| Power | 100% reflected, stays lethal | Scatters and weakens at each crossing |
| In game | Turns 90°, travels indefinitely, **can destroy a generator** | Leaks out at an angle and dies, **cannot destroy a generator** |
| Scoring | Each reflection raises the combo | Worth nothing |

A refracted beam is drawn as a dashed pale-blue tail so students can see where
the energy leaked, and the log explains why nothing happened. The top score
(SUPER COMBO, 3+ bounces) is reachable **only** by chaining total internal
reflections — `npm test` asserts both halves of this.

Optics live in one lookup table (`PRISM_OPTICS` in `services/gameLogic.ts`).
`LASER_RULES` in `types.ts` holds the switches; setting
`refractionContinues = true` makes refracted beams behave like mirrors and
**breaks the teaching model**, so leave it alone for classroom use.

## Difficulty

| Setting | In game | Behaviour |
| --- | --- | --- |
| EASY | RECRUIT | Random moves, random aim |
| NORMAL | VETERAN | Traces the beam; misjudges its aim ~40% of turns |
| HARD | ACE | Traces every shot, defends its own core, never fumbles the aim |

Measured over 300 simulated games per pairing (`npm run balance`): HARD beats
NORMAL about 66% of the time, NORMAL beats EASY about 92%, and same-level
matches sit near 50%, so neither side has a first-mover runaway.

## Sound and music

Everything is drop-in — no code changes needed. Put files here and they are used
automatically; anything missing falls back to a built-in synthesised sound, so
the game always has audio.

| File | Used for |
| --- | --- |
| `public/bgm.mp3` | Background music, loops during a match |
| `public/sfx/laser.mp3` | Firing the laser |
| `public/sfx/hit.mp3` | Beam striking a block |
| `public/sfx/explosion.mp3` | Generator destroyed |

`.wav` and `.ogg` also work for the effects. The dice roll is synthesised only.
Keep effects short — under ~1s for laser and hit, under ~2s for the explosion.

**Effects and music have separate volume sliders**, in the audio panel on the
sidebar (speaker icon). Each sound has its own preview button so you can set the
level without firing a shot, and the panel shows which sounds are coming from
your files rather than the built-in fallbacks. Levels are remembered between
sessions.

Custom files are usually mastered near full scale while the synthesised
fallbacks peak around 0.2, so every file you supply is **peak-normalised on
load** to sit at a matched loudness. That is why dropping in an MP3 no longer
makes the effects deafening. If one file is still off, nudge it with `SFX_TRIM`
at the top of `services/audio.ts`. Browsers block audio until the user
interacts with the page, so the first click anywhere unlocks it.

---


### Keeping the music small

A long, high-bitrate track is the easiest way to make this game feel broken in a
classroom: nothing plays until the whole file downloads, and thirty students
starting at once multiplies that by thirty.

The shipped `public/bgm.mp3` is a **180-second seamless loop, 128 kbps stereo,
about 2.7 MB**, cut down from a 15m26s 192 kbps original of 21.2 MB.

To swap in different music:

```bash
./scripts/make-bgm-loop.sh my-song.mp3            # 180s loop, 128 kbps stereo
./scripts/make-bgm-loop.sh my-song.mp3 240 160k   # or choose your own
```

It writes `public/bgm.mp3` directly. The script blends the seconds just after
the loop point over the opening seconds, so the moment the track wraps it is
already mid-crossfade and the join is inaudible. A plain cut clicks; a plain
fade-out dips the volume every time it loops. Requires `ffmpeg`.

Keep stereo unless the source really is mono — this track measured a phase
correlation of 0.57, meaning genuine stereo content that a mono downmix would
flatten.

## Credits

Created by **Dr. Lai Chin Siong**.

The on-screen credit is defined once in `data/credits.ts`. Edit that file and it
updates the lobby, the mission report, the browser tab title and the link
preview together. To add an institution, fill in the `affiliation` field.
