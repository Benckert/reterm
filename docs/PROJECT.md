# Reterm — Audio Generator with Reactive Visuals

## Overview

A web-based audio/music generator with visual reactive animations and particles. Built as a creative tool where users can generate sounds/music and see them come alive through real-time visualizations.

## Product Requirements (PRD)

### Vision

An interactive audio playground where users can:

1. **Generate audio** — synthesize sounds, melodies, beats, and ambient textures
2. **See reactive visuals** — particles, waveforms, and animations that respond to the audio in real-time
3. **Control and experiment** — tweak parameters, layer sounds, and explore generative music

### MVP (Phase 1 — Audio Generation)

- [ ] Basic synthesizer with oscillator controls (waveform, frequency, volume)
- [ ] Preset sound patterns (ambient pads, simple melodies, beats)
- [ ] Play/stop controls
- [ ] Basic audio waveform visualization (simple canvas-based)
- [ ] Responsive UI

### Phase 2 — Visual Reactive System

- [ ] Particle system driven by audio frequency data
- [ ] Multiple visualization modes (waveform, frequency bars, particles)
- [ ] Color themes / palettes
- [ ] Smooth animations with requestAnimationFrame / WebGL

### Phase 3 — Advanced Features

- [ ] Sequencer / step sequencer for beat creation
- [ ] Effects chain (reverb, delay, distortion, filter)
- [ ] Export audio
- [ ] Shareable presets / URLs
- [ ] AI-assisted generation (optional, future)

## Tech Stack

| Layer          | Choice          | Rationale                                                  |
| -------------- | --------------- | ---------------------------------------------------------- |
| Framework      | React 18+       | Component model fits modular audio/visual controls         |
| Build tool     | Vite            | Fast HMR, lightweight — no SSR needed for this project     |
| Language       | TypeScript      | Type safety for complex audio parameter types              |
| Audio engine   | Tone.js         | High-level Web Audio API wrapper, great for music apps     |
| Styling        | CSS Modules     | Simple, scoped, no extra dependency                        |
| Visualization  | Canvas 2D / WebGL (future) | Direct pixel control for reactive animations    |
| State          | React state + Context | Simple enough for MVP, upgrade if needed             |

## Key Decisions Log

| Date       | Decision                         | Reasoning                                                        |
| ---------- | -------------------------------- | ---------------------------------------------------------------- |
| 2026-03-11 | Vite over Next.js                | Client-heavy app, no SSR/SSG needed. Vite is faster and lighter. |
| 2026-03-11 | Tone.js for audio                | Mature Web Audio API wrapper with synths, effects, scheduling.   |
| 2026-03-11 | CSS Modules over Tailwind/styled | Minimal footprint, no build plugin needed, scoped by default.    |
| 2026-03-11 | Canvas 2D for MVP visuals        | Simpler than WebGL, sufficient for waveform display. Upgrade later. |
| 2026-03-11 | Start with audio, visuals later  | Per user request — nail the audio generation first.              |

## Project Structure

```
src/
├── components/       # React UI components
│   ├── Synth/        # Synthesizer controls
│   └── Visualizer/   # Audio visualization (basic for MVP)
├── audio/            # Audio engine logic (Tone.js wrappers)
├── hooks/            # Custom React hooks (useAudioEngine, useAnalyzer)
├── types/            # TypeScript types
├── App.tsx
├── main.tsx
└── index.css
```

## Memory / Notes

- User wants to start small with music generation, visuals come later
- Keep it modular so the visual system can plug into audio analysis data
- Tone.js provides `Tone.Analyser` for FFT/waveform data — will feed into visuals later
- The `AudioContext` must be started by a user gesture (browser policy) — need a "start" button
