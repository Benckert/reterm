import * as Tone from "tone";
import type { LayerKind, SceneState } from "../types/audio";
import { getScaleNotes, weightedScaleNote } from "./scales";
import type { ScaleNote } from "./scales";

type LayerSynth = {
  synth: Tone.PolySynth | Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth;
  gain: Tone.Gain;
  effects: Tone.ToneAudioNode[];
  loop: Tone.Loop | null;
};

export class AudioEngine {
  private layers = new Map<LayerKind, LayerSynth>();
  private analyser: Tone.Analyser | null = null;
  private masterGain: Tone.Gain | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    await Tone.start();
    this.analyser = new Tone.Analyser("waveform", 256);
    this.masterGain = new Tone.Gain(0.8);
    this.masterGain.chain(this.analyser, Tone.getDestination());
    this.isInitialized = true;
  }

  private createPad(): LayerSynth {
    const reverb = new Tone.Reverb({ decay: 4, wet: 0.6 });
    const chorus = new Tone.Chorus({ frequency: 0.5, depth: 0.7, wet: 0.3 }).start();
    const gain = new Tone.Gain(0.4);
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine4" as OscillatorType },
      envelope: { attack: 1.5, decay: 0.5, sustain: 0.8, release: 3 },
    });
    synth.chain(chorus, reverb, gain, this.masterGain!);
    return { synth, gain, effects: [reverb, chorus], loop: null };
  }

  private createBass(): LayerSynth {
    const gain = new Tone.Gain(0.35);
    const filter = new Tone.Filter(200, "lowpass");
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle2" as OscillatorType },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.6, release: 0.8 },
    });
    synth.chain(filter, gain, this.masterGain!);
    return { synth, gain, effects: [filter], loop: null };
  }

  private createMelody(): LayerSynth {
    const delay = new Tone.FeedbackDelay("8n", 0.25);
    const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 });
    const gain = new Tone.Gain(0.3);
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.3, release: 0.8 },
    });
    synth.chain(delay, reverb, gain, this.masterGain!);
    return { synth, gain, effects: [delay, reverb], loop: null };
  }

  private createLead(): LayerSynth {
    const delay = new Tone.FeedbackDelay("4n.", 0.3);
    const reverb = new Tone.Reverb({ decay: 3, wet: 0.4 });
    const gain = new Tone.Gain(0.25);
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth8" as OscillatorType },
      envelope: { attack: 0.1, decay: 0.4, sustain: 0.5, release: 1.2 },
    });
    synth.chain(delay, reverb, gain, this.masterGain!);
    return { synth, gain, effects: [delay, reverb], loop: null };
  }

  private createArp(): LayerSynth {
    const delay = new Tone.FeedbackDelay("16n", 0.2);
    const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.25 });
    const gain = new Tone.Gain(0.2);
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "square4" as OscillatorType },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0.1, release: 0.3 },
    });
    synth.chain(delay, reverb, gain, this.masterGain!);
    return { synth, gain, effects: [delay, reverb], loop: null };
  }

  private createPercussion(): LayerSynth {
    const gain = new Tone.Gain(0.3);
    const reverb = new Tone.Reverb({ decay: 0.8, wet: 0.15 });
    const synth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
    });
    synth.chain(reverb, gain, this.masterGain!);
    return { synth: synth as unknown as Tone.MembraneSynth, gain, effects: [reverb], loop: null };
  }

  private getOrCreateLayer(kind: LayerKind): LayerSynth {
    if (!this.layers.has(kind)) {
      const creators: Record<LayerKind, () => LayerSynth> = {
        pad: () => this.createPad(),
        bass: () => this.createBass(),
        melody: () => this.createMelody(),
        lead: () => this.createLead(),
        arp: () => this.createArp(),
        percussion: () => this.createPercussion(),
      };
      this.layers.set(kind, creators[kind]());
    }
    return this.layers.get(kind)!;
  }

  private scheduleLayer(kind: LayerKind, scene: SceneState): void {
    const layer = this.getOrCreateLayer(kind);
    const layerState = scene.layers[kind];

    // Clear any existing loop
    if (layer.loop) {
      layer.loop.dispose();
      layer.loop = null;
    }

    layer.gain.gain.value = layerState.volume * scene.energy;

    const { root, scale } = scene;
    const density = layerState.density;
    const energy = scene.energy;

    switch (kind) {
      case "pad": {
        // Pads: long sustained chords, change every few bars
        const interval = `${Math.max(2, Math.round(8 - density * 6))}m`;
        layer.loop = new Tone.Loop((time) => {
          const synth = layer.synth as Tone.PolySynth;
          synth.releaseAll(time);
          const notes = getScaleNotes(root, scale, 3, 4);
          // Pick 2-3 note chord from root, 3rd, 5th
          const chord = [notes[0], notes[2], notes[4]].filter(Boolean);
          const names = chord.map((n: ScaleNote) => n.name);
          synth.triggerAttackRelease(names, `${Math.max(2, Math.round(8 - density * 6))}m`, time);
        }, interval);
        layer.loop.start(0);
        break;
      }

      case "bass": {
        const interval = `${Math.max(1, Math.round(4 - density * 3))}n`;
        let lastNote: ScaleNote | null = null;
        layer.loop = new Tone.Loop((time) => {
          const synth = layer.synth as Tone.PolySynth;
          // Prefer root and 5th for bass
          const note = weightedScaleNote(root, scale, 1, 2, [5, 1, 2, 1, 3, 1, 1]);
          if (!lastNote || Math.random() < 0.7) {
            synth.triggerAttackRelease(note.name, `${Math.max(1, Math.round(4 - density * 3))}n`, time);
            lastNote = note;
          }
        }, interval);
        layer.loop.start(0);
        break;
      }

      case "melody": {
        // Melody: phrases with rests, medium register
        const baseInterval = Math.max(0.2, 1 - density * 0.7);
        layer.loop = new Tone.Loop((time) => {
          if (Math.random() > 0.3 + energy * 0.4) return; // rests
          const synth = layer.synth as Tone.PolySynth;
          const note = weightedScaleNote(root, scale, 4, 5);
          const durations = ["8n", "4n", "4n.", "2n"];
          const dur = durations[Math.floor(Math.random() * durations.length)];
          synth.triggerAttackRelease(note.name, dur, time);
        }, baseInterval);
        layer.loop.start(0);
        break;
      }

      case "lead": {
        // Lead: sparse, expressive, higher register
        const interval = Math.max(0.5, 2 - density * 1.5);
        layer.loop = new Tone.Loop((time) => {
          if (Math.random() > 0.25 + energy * 0.3) return;
          const synth = layer.synth as Tone.PolySynth;
          const note = weightedScaleNote(root, scale, 4, 6);
          const dur = Math.random() > 0.5 ? "2n" : "4n.";
          synth.triggerAttackRelease(note.name, dur, time);
        }, interval);
        layer.loop.start(0);
        break;
      }

      case "arp": {
        // Arpeggiator: fast sequential notes through scale
        const speed = Math.max(0.08, 0.3 - density * 0.22);
        const notes = getScaleNotes(root, scale, 3, 5);
        let noteIndex = 0;
        let direction = 1;
        layer.loop = new Tone.Loop((time) => {
          if (Math.random() > 0.6 + energy * 0.35) return;
          const synth = layer.synth as Tone.PolySynth;
          const note = notes[noteIndex];
          synth.triggerAttackRelease(note.name, "32n", time);
          noteIndex += direction;
          if (noteIndex >= notes.length - 1) direction = -1;
          if (noteIndex <= 0) direction = 1;
        }, speed);
        layer.loop.start(0);
        break;
      }

      case "percussion": {
        // Percussion: rhythmic hits
        const interval = `${Math.max(1, Math.round(4 - density * 3))}n`;
        layer.loop = new Tone.Loop((time) => {
          const kick = Math.random() < 0.6 + energy * 0.3;
          if (kick) {
            const synth = layer.synth as unknown as Tone.MembraneSynth;
            const pitch = 30 + Math.random() * 30;
            synth.triggerAttackRelease(pitch, "8n", time);
          }
        }, interval);
        layer.loop.start(0);
        break;
      }
    }
  }

  applyScene(scene: SceneState): void {
    if (!this.isInitialized) return;


    Tone.getTransport().bpm.value = scene.bpm;

    if (this.masterGain) {
      this.masterGain.gain.value = scene.masterVolume;
    }

    const allKinds: LayerKind[] = ["pad", "bass", "melody", "lead", "arp", "percussion"];

    for (const kind of allKinds) {
      const layerState = scene.layers[kind];

      if (layerState.active && scene.isPlaying) {
        this.scheduleLayer(kind, scene);
      } else {
        // Stop and clean up inactive layers
        const existing = this.layers.get(kind);
        if (existing?.loop) {
          existing.loop.dispose();
          existing.loop = null;
        }
        if (existing) {
          // Release all notes for PolySynth layers
          if ("releaseAll" in existing.synth) {
            (existing.synth as Tone.PolySynth).releaseAll();
          }
        }
      }
    }
  }

  play(scene: SceneState): void {
    if (!this.isInitialized) return;
    Tone.getTransport().start();
    this.applyScene({ ...scene, isPlaying: true });
  }

  stop(): void {
    Tone.getTransport().stop();
    for (const [, layer] of this.layers) {
      if (layer.loop) {
        layer.loop.dispose();
        layer.loop = null;
      }
      if ("releaseAll" in layer.synth) {
        (layer.synth as Tone.PolySynth).releaseAll();
      }
    }
  }

  getWaveformData(): Float32Array {
    if (!this.analyser) return new Float32Array(256);
    return this.analyser.getValue() as Float32Array;
  }

  dispose(): void {
    this.stop();
    for (const [, layer] of this.layers) {
      layer.synth.dispose();
      layer.gain.dispose();
      layer.effects.forEach((e) => e.dispose());
    }
    this.layers.clear();
    this.analyser?.dispose();
    this.analyser = null;
    this.masterGain?.dispose();
    this.masterGain = null;
    this.isInitialized = false;

  }
}
