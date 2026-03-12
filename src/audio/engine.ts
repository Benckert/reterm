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
  private lastScene: SceneState | null = null;

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

    // Release lingering notes so new scale/root is heard immediately
    if ("releaseAll" in layer.synth) {
      (layer.synth as Tone.PolySynth).releaseAll();
    }

    layer.gain.gain.rampTo(layerState.volume * scene.energy, 0.05);

    const { root, scale } = scene;
    const density = layerState.density;
    const energy = scene.energy;

    switch (kind) {
      case "pad": {
        // Pads: sustained chords with voicing variation
        const bars = Math.max(2, Math.round(8 - density * 6));
        const interval = `${bars}m`;
        const padTick = (time: number) => {
          const synth = layer.synth as Tone.PolySynth;
          synth.releaseAll(time);
          const notes = getScaleNotes(root, scale, 3, 4);
          // Vary chord voicing: triads, 7ths, sus, inversions
          const voicing = Math.random();
          let chord: ScaleNote[];
          if (voicing < 0.4) {
            // Basic triad (root, 3rd, 5th)
            chord = [notes[0], notes[2], notes[4]].filter(Boolean);
          } else if (voicing < 0.65) {
            // 7th chord (root, 3rd, 5th, 7th)
            chord = [notes[0], notes[2], notes[4], notes[6]].filter(Boolean);
          } else if (voicing < 0.8) {
            // Sus voicing (root, 4th, 5th)
            chord = [notes[0], notes[3], notes[4]].filter(Boolean);
          } else {
            // Open voicing — spread across octaves
            chord = [notes[0], notes[4], notes.length > 7 ? notes[7] : notes[2]].filter(Boolean);
          }
          const names = chord.map((n: ScaleNote) => n.name);
          synth.triggerAttackRelease(names, `${bars}m`, time);
        };
        // Fire immediately, then loop
        Tone.getTransport().scheduleOnce(padTick, "+0");
        layer.loop = new Tone.Loop(padTick, interval);
        layer.loop.start(`+${interval}`);
        break;
      }

      case "bass": {
        const beatDiv = Math.max(1, Math.round(4 - density * 3));
        const interval = `${beatDiv}n`;
        let lastNote: ScaleNote | null = null;
        let stepCount = 0;
        const bassTick = (time: number) => {
          const synth = layer.synth as Tone.PolySynth;
          const note = weightedScaleNote(root, scale, 1, 2, [5, 1, 2, 1, 3]);
          stepCount++;
          // Occasional octave jump for movement
          const useOctaveUp = Math.random() < 0.15 * energy;
          const noteName = useOctaveUp
            ? note.name.replace(/\d/, (d) => String(Number(d) + 1))
            : note.name;
          // Ghost notes (quieter) for groove
          const isGhost = Math.random() < 0.2 * density;
          if (isGhost) {
            layer.gain.gain.setValueAtTime(layerState.volume * scene.energy * 0.4, time);
            layer.gain.gain.setValueAtTime(layerState.volume * scene.energy, time + 0.1);
          }
          // Occasional rests
          if (!lastNote || Math.random() < 0.75 + density * 0.2) {
            const durations = [`${beatDiv}n`, "8n"];
            const dur = stepCount % 4 === 0 && Math.random() < 0.5 ? durations[1] : durations[0];
            synth.triggerAttackRelease(noteName, dur, time);
            lastNote = note;
          }
        };
        Tone.getTransport().scheduleOnce(bassTick, "+0");
        layer.loop = new Tone.Loop(bassTick, interval);
        layer.loop.start(`+${interval}`);
        break;
      }

      case "melody": {
        // Melody: phrases with rests and motif repetition
        const baseInterval = Math.max(0.15, 0.8 - density * 0.6);
        let phraseNotes: string[] = [];
        let phraseIndex = 0;
        const melodyTick = (time: number) => {
          if (Math.random() > 0.35 + energy * 0.45) return; // rests
          const synth = layer.synth as Tone.PolySynth;
          // Build short phrases (3-5 notes) and sometimes repeat them
          if (phraseNotes.length === 0 || phraseIndex >= phraseNotes.length) {
            const phraseLen = 3 + Math.floor(Math.random() * 3);
            phraseNotes = [];
            for (let i = 0; i < phraseLen; i++) {
              phraseNotes.push(weightedScaleNote(root, scale, 4, 5).name);
            }
            phraseIndex = 0;
          }
          // 60% chance to follow the phrase, 40% to improvise
          const noteName = Math.random() < 0.6
            ? phraseNotes[phraseIndex]
            : weightedScaleNote(root, scale, 4, 5).name;
          phraseIndex++;
          const durations = ["16n", "8n", "8n.", "4n", "4n.", "2n"];
          const dur = durations[Math.floor(Math.random() * durations.length)];
          synth.triggerAttackRelease(noteName, dur, time);
        };
        Tone.getTransport().scheduleOnce(melodyTick, "+0");
        layer.loop = new Tone.Loop(melodyTick, baseInterval);
        layer.loop.start(`+${baseInterval}`);
        break;
      }

      case "lead": {
        // Lead: expressive, with pitch bends and varying durations
        const interval = Math.max(0.4, 1.8 - density * 1.4);
        let lastLeadNote: string | null = null;
        const leadTick = (time: number) => {
          if (Math.random() > 0.3 + energy * 0.35) return;
          const synth = layer.synth as Tone.PolySynth;
          const note = weightedScaleNote(root, scale, 4, 6);
          // Occasional double-stop (two notes)
          if (Math.random() < 0.15 * energy && lastLeadNote) {
            synth.triggerAttackRelease([note.name, lastLeadNote], "4n", time);
          } else {
            const durations = ["8n", "4n", "4n.", "2n", "2n."];
            const dur = durations[Math.floor(Math.random() * durations.length)];
            synth.triggerAttackRelease(note.name, dur, time);
          }
          lastLeadNote = note.name;
        };
        Tone.getTransport().scheduleOnce(leadTick, "+0");
        layer.loop = new Tone.Loop(leadTick, interval);
        layer.loop.start(`+${interval}`);
        break;
      }

      case "arp": {
        // Arpeggiator: multiple patterns with variation
        const speed = Math.max(0.06, 0.25 - density * 0.19);
        let notes = getScaleNotes(root, scale, 3, 5);
        let noteIndex = 0;
        let direction = 1;
        // Pick a pattern: 0=pingpong, 1=up, 2=down, 3=random
        const pattern = Math.floor(Math.random() * 4);
        const arpTick = (time: number) => {
          if (Math.random() > 0.65 + energy * 0.3) return;
          const synth = layer.synth as Tone.PolySynth;
          const note = notes[noteIndex];
          // Vary note length for texture
          const dur = Math.random() < 0.2 ? "16n" : "32n";
          synth.triggerAttackRelease(note.name, dur, time);
          switch (pattern) {
            case 0: // ping-pong
              noteIndex += direction;
              if (noteIndex >= notes.length - 1) direction = -1;
              if (noteIndex <= 0) direction = 1;
              break;
            case 1: // up
              noteIndex = (noteIndex + 1) % notes.length;
              break;
            case 2: // down
              noteIndex = noteIndex <= 0 ? notes.length - 1 : noteIndex - 1;
              break;
            case 3: // random with tendency toward neighbors
              noteIndex = Math.max(0, Math.min(notes.length - 1,
                noteIndex + Math.floor(Math.random() * 5) - 2));
              break;
          }
          // Occasional octave skip for sparkle
          if (Math.random() < 0.08) {
            noteIndex = Math.floor(Math.random() * notes.length);
          }
        };
        Tone.getTransport().scheduleOnce(arpTick, "+0");
        layer.loop = new Tone.Loop(arpTick, speed);
        layer.loop.start(`+${speed}`);
        break;
      }

      case "percussion": {
        // Percussion: varied rhythmic hits with accents
        const beatDiv = Math.max(1, Math.round(4 - density * 3));
        const interval = `${beatDiv}n`;
        let step = 0;
        const percTick = (time: number) => {
          step++;
          const synth = layer.synth as unknown as Tone.MembraneSynth;
          // Kick-like hits on downbeats
          const isDownbeat = step % 4 === 1;
          const hitChance = isDownbeat
            ? 0.85 + energy * 0.15
            : 0.3 + energy * 0.4;
          if (Math.random() < hitChance) {
            // Vary pitch: lower for downbeats, wider range for offbeats
            const basePitch = isDownbeat ? 30 : 40;
            const pitchRange = isDownbeat ? 15 : 40;
            const pitch = basePitch + Math.random() * pitchRange;
            // Accent on downbeats
            const vel = isDownbeat ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.5;
            synth.triggerAttackRelease(pitch, "8n", time, vel);
          }
        };
        Tone.getTransport().scheduleOnce(percTick, "+0");
        layer.loop = new Tone.Loop(percTick, interval);
        layer.loop.start(`+${interval}`);
        break;
      }
    }
  }

  private needsReschedule(kind: LayerKind, scene: SceneState): boolean {
    const prev = this.lastScene;
    if (!prev) return true;
    const prevLayer = prev.layers[kind];
    const currLayer = scene.layers[kind];
    return (
      prev.root !== scene.root ||
      prev.scale !== scene.scale ||
      prevLayer.density !== currLayer.density ||
      prevLayer.active !== currLayer.active
    );
  }

  applyScene(scene: SceneState): void {
    if (!this.isInitialized) return;

    Tone.getTransport().bpm.value = scene.bpm;

    if (this.masterGain) {
      this.masterGain.gain.rampTo(scene.masterVolume, 0.05);
    }

    const allKinds: LayerKind[] = ["pad", "bass", "melody", "lead", "arp", "percussion"];

    for (const kind of allKinds) {
      const layerState = scene.layers[kind];

      if (layerState.active && scene.isPlaying) {
        if (this.needsReschedule(kind, scene)) {
          this.scheduleLayer(kind, scene);
        } else {
          // Just update gain smoothly — no need to rebuild the loop
          const existing = this.layers.get(kind);
          if (existing) {
            existing.gain.gain.rampTo(layerState.volume * scene.energy, 0.05);
          }
        }
      } else {
        // Stop and clean up inactive layers
        const existing = this.layers.get(kind);
        if (existing?.loop) {
          existing.loop.dispose();
          existing.loop = null;
        }
        if (existing) {
          if ("releaseAll" in existing.synth) {
            (existing.synth as Tone.PolySynth).releaseAll();
          }
        }
      }
    }

    this.lastScene = { ...scene, layers: { ...scene.layers } };
  }

  play(scene: SceneState): void {
    if (!this.isInitialized) return;
    Tone.getTransport().start();
    this.applyScene({ ...scene, isPlaying: true });
  }

  stop(): void {
    Tone.getTransport().stop();
    this.lastScene = null;
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
