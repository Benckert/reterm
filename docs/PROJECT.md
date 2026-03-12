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

### Phase 1.5 — Interactive Playground UI ✅

- [x] Full-screen canvas playground replacing traditional UI controls
- [x] Draggable glowing orbs — each layer is a physical object in the space
- [x] Orb position maps to params: X = density, Y (inverted) = volume
- [x] Click orbs to toggle active/inactive (with ripple feedback)
- [x] Active orbs glow, pulse with audio amplitude, emit particles
- [x] Connection lines between active orbs
- [x] Background breathing glow reactive to audio
- [x] Subtle grid dots, ambient waveform trace at bottom
- [x] Minimal sidebar for scale/root/BPM/energy/play controls
- [x] Click empty space to spawn decorative ripples

### Phase 2 — Deeper Interactions

- [ ] Touch/multi-touch support (mobile)
- [ ] Scroll wheel for energy or zoom
- [ ] Orb trails that leave temporary visual marks
- [ ] Gravity/physics — orbs drift and attract/repel
- [ ] "Zones" on the canvas that affect sound (e.g., reverb zone, distortion zone)
- [ ] Per-layer visual identity (different shapes, particle styles)
- [ ] WebGL upgrade for particle performance

### Phase 3 — Advanced Features

- [ ] Scene presets (save/load full configurations)
- [ ] Shareable URLs encoding scene state
- [ ] More layer types (noise, texture, vocal chops)
- [ ] Effects exposed as spatial zones (drag orb into "reverb pool")
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
| 2026-03-12 | Full-screen canvas playground          | User wants "magical musical forest" feel. Traditional UI killed the vibe. |
| 2026-03-12 | Layers as draggable orbs               | Physical objects in space > sliders. Position = params. Tangible.   |
| 2026-03-12 | Sidebar for "boring" controls          | Scale/BPM/play are configuration, not creative interaction.         |
| 2026-03-12 | X=density, Y=volume mapping            | Intuitive spatial mapping: higher = louder, wider = busier.         |

## Project Structure

```
src/
├── audio/
│   ├── engine.ts          # Audio engine — layer synths, scheduling, transport
│   └── scales.ts          # Music theory — scales, notes, weighted selection
├── components/
│   ├── Playground/        # Full-screen interactive canvas with draggable orbs
│   └── Sidebar/           # Minimal sidebar: scale, root, BPM, energy, play
├── hooks/
│   └── useAudioEngine.ts  # React hook wrapping the engine
├── types/
│   └── audio.ts           # SceneState, LayerState, defaults
├── App.tsx                # Wires sidebar + playground + audio engine
├── index.css              # Global styles
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
- User wants it to feel like a "magical musical forest" / playground
- Traditional UI (sliders, buttons) kills the vibe — interaction should BE the art
- Each layer orb has a unique color for visual identity
- Clicking empty canvas space spawns decorative ripples (satisfying, no-op)
- Active orbs emit ambient particles and pulse with audio amplitude
- Subtle connection lines between active orbs suggest they're "linked"
- Waveform trace runs along the bottom edge — ambient, not central
