# Reterm — Generative Audio with Reactive Visuals

## Overview

An interactive art piece — a web-based generative audio engine with reactive visuals. Users shape music at a high level (mood, energy, layers) rather than tweaking individual parameters. All sounds are constrained to a shared musical scale so every combination sounds harmonious.

## Design Philosophy

- **Organic, alive** — the system generates evolving patterns, not static loops
- **High-level control** — users pick root/scale/energy, toggle layers on/off, adjust density
- **Always harmonious** — all notes are constrained to the selected scale
- **Layers, not knobs** — pad, bass, melody, lead, arp, percussion as toggleable channels
- **Minimal UI** — the interface should feel like part of the art piece

## Product Requirements (PRD)

### MVP (Phase 1 — Generative Audio) ✅

- [x] Scale-constrained music theory system (7 scales, 7 roots)
- [x] 6 layer/channel types: pad, bass, melody, lead, arp, percussion
- [x] Generative patterns per layer (auto-evolving, not static loops)
- [x] High-level controls: root, scale, tempo, energy
- [x] Per-layer controls: active toggle, volume, density
- [x] Effects chain per layer (reverb, delay, chorus, filters)
- [x] Play/stop with real-time waveform visualization
- [x] Responsive, minimal dark UI

### Phase 2 — Visual Reactive System

- [ ] Particle system driven by audio frequency/amplitude data
- [ ] Multiple visualization modes (waveform, frequency bars, particles, geometry)
- [ ] Per-layer visual representation (each layer has distinct visual character)
- [ ] Color themes / palettes that shift with the music
- [ ] WebGL for smooth, high-performance rendering

### Phase 3 — Advanced Features

- [ ] Scene presets (save/load full configurations)
- [ ] Shareable URLs encoding scene state
- [ ] More layer types (noise, texture, vocal chops)
- [ ] Effects exposed as high-level controls (space, warmth, grit)
- [ ] Export audio / record session
- [ ] AI-assisted generation (optional, future)

## Tech Stack

| Layer          | Choice                   | Rationale                                                   |
| -------------- | ------------------------ | ----------------------------------------------------------- |
| Framework      | React 19                 | Component model fits modular layer controls                 |
| Build tool     | Vite                     | Fast HMR, lightweight — no SSR needed                       |
| Language       | TypeScript               | Type safety for complex audio/scene state types             |
| Audio engine   | Tone.js                  | Scheduling, synths, effects, transport — all built in       |
| Styling        | CSS Modules              | Scoped, zero runtime, no extra dependency                   |
| Visualization  | Canvas 2D (WebGL future) | Direct pixel control for reactive animations                |
| State          | React useState + refs    | Simple enough for current scope, upgrade if needed          |

## Architecture

### Scale System (`src/audio/scales.ts`)
- Defines 7 scales (major, minor, dorian, pentatonic, minorPentatonic, mixolydian, phrygian)
- 7 root notes (C through B)
- Generates constrained note pools across octave ranges
- Weighted note selection (biases toward root, 3rd, 5th for consonance)

### Layer Engine (`src/audio/engine.ts`)
Each layer type has its own synth voice, effects chain, and generative pattern:

| Layer      | Voice           | Effects              | Pattern Style                       |
| ---------- | --------------- | -------------------- | ----------------------------------- |
| Pad        | PolySynth sine  | Chorus + Reverb      | Sustained chords, slow changes      |
| Bass       | PolySynth tri   | Lowpass filter       | Root/5th emphasis, rhythmic         |
| Melody     | PolySynth tri   | Delay + Reverb       | Phrases with rests, medium register |
| Lead       | PolySynth saw   | Delay + Reverb       | Sparse, expressive, high register   |
| Arp        | PolySynth sq    | Delay + Reverb       | Fast sequential scale runs          |
| Percussion | MembraneSynth   | Reverb               | Rhythmic hits, variable pitch       |

### Scene State (`src/types/audio.ts`)
Central state object controls the entire experience:
- `root` / `scale` — musical key (constrains all layers)
- `bpm` — tempo (40–180)
- `energy` — global intensity multiplier (0–1)
- `layers` — per-layer active/volume/density

## Key Decisions Log

| Date       | Decision                               | Reasoning                                                           |
| ---------- | -------------------------------------- | ------------------------------------------------------------------- |
| 2026-03-11 | Vite over Next.js                      | Client-heavy app, no SSR/SSG needed. Vite is faster and lighter.    |
| 2026-03-11 | Tone.js for audio                      | Mature Web Audio API wrapper with synths, effects, scheduling.      |
| 2026-03-11 | CSS Modules over Tailwind/styled       | Minimal footprint, no build plugin needed, scoped by default.       |
| 2026-03-11 | Canvas 2D for MVP visuals              | Simpler than WebGL, sufficient for waveform. Upgrade later.         |
| 2026-03-12 | Scale-constrained generative system    | User wants organic, always-harmonious output. No wrong notes.       |
| 2026-03-12 | Layer architecture over manual synth   | High-level control: toggle layers, adjust density vs tweak params.  |
| 2026-03-12 | 6 layers (pad/bass/melody/lead/arp/perc) | Covers full musical spectrum, each with distinct role.           |
| 2026-03-12 | Weighted note selection                | Biases toward consonant intervals (root, 3rd, 5th) for pleasant output. |
| 2026-03-12 | Energy as global multiplier            | Single knob to scale intensity across all layers simultaneously.    |

## Project Structure

```
src/
├── audio/
│   ├── engine.ts        # Main audio engine — layer creation, scheduling, transport
│   └── scales.ts        # Music theory — scales, note generation, weighted selection
├── components/
│   ├── LayerControl/    # Toggle + volume/density per layer
│   ├── SceneControls/   # Root, scale, tempo, energy
│   └── Visualizer/      # Waveform canvas visualization
├── hooks/
│   └── useAudioEngine.ts  # React hook wrapping the engine
├── types/
│   └── audio.ts         # SceneState, LayerState, defaults
├── App.tsx              # Main app — scene state, layout
├── App.module.css
├── index.css            # Global styles, range input styling
├── main.tsx
└── vite-env.d.ts
```

## Memory / Notes

- User wants it to feel alive and organic — like an interactive art piece
- High-level control is the priority — no exposed synth parameters
- All sounds must be in a matching scale — every combination should work
- Channels/layers approach: pad, percussion, rhythm, lead, melody, etc.
- `AudioContext` must be started by user gesture (browser policy) — play button handles this
- Tone.js `Analyser` provides waveform/FFT data — will feed into visual reactive system in Phase 2
- Energy + density work together: energy is global intensity, density is per-layer busyness
- Generative patterns use randomness with musical constraints (rests, weighted notes, directional arps)
- Default scene starts with pad + bass active, others off — lets user build up layers
