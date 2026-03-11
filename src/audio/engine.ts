import * as Tone from "tone";
import type { SynthParams } from "../types/audio";

export class AudioEngine {
  private synth: Tone.Synth | null = null;
  private analyser: Tone.Analyser | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    await Tone.start();
    this.analyser = new Tone.Analyser("waveform", 256);
    this.synth = new Tone.Synth().connect(this.analyser).toDestination();
    this.isInitialized = true;
  }

  updateParams(params: SynthParams): void {
    if (!this.synth) return;

    this.synth.oscillator.type = params.waveform;
    this.synth.volume.value = params.volume;
    this.synth.envelope.attack = params.attack;
    this.synth.envelope.release = params.release;
  }

  triggerAttack(frequency: number): void {
    if (!this.synth) return;
    this.synth.triggerAttack(frequency);
  }

  triggerRelease(): void {
    if (!this.synth) return;
    this.synth.triggerRelease();
  }

  triggerAttackRelease(frequency: number, duration: string | number): void {
    if (!this.synth) return;
    this.synth.triggerAttackRelease(frequency, duration);
  }

  getWaveformData(): Float32Array {
    if (!this.analyser) return new Float32Array(256);
    return this.analyser.getValue() as Float32Array;
  }

  dispose(): void {
    this.synth?.dispose();
    this.analyser?.dispose();
    this.synth = null;
    this.analyser = null;
    this.isInitialized = false;
  }
}
