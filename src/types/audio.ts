export type OscillatorType = "sine" | "square" | "sawtooth" | "triangle";

export interface SynthParams {
  waveform: OscillatorType;
  frequency: number;
  volume: number; // in dB, -60 to 0
  attack: number;
  release: number;
}

export interface Preset {
  name: string;
  params: SynthParams;
}

export const DEFAULT_SYNTH_PARAMS: SynthParams = {
  waveform: "sine",
  frequency: 440,
  volume: -12,
  attack: 0.1,
  release: 0.5,
};

export const PRESETS: Preset[] = [
  {
    name: "Pure Tone",
    params: {
      waveform: "sine",
      frequency: 440,
      volume: -12,
      attack: 0.05,
      release: 0.3,
    },
  },
  {
    name: "Warm Pad",
    params: {
      waveform: "triangle",
      frequency: 220,
      volume: -18,
      attack: 0.8,
      release: 1.5,
    },
  },
  {
    name: "Buzz Lead",
    params: {
      waveform: "sawtooth",
      frequency: 330,
      volume: -15,
      attack: 0.02,
      release: 0.4,
    },
  },
  {
    name: "Square Blip",
    params: {
      waveform: "square",
      frequency: 523,
      volume: -20,
      attack: 0.01,
      release: 0.15,
    },
  },
  {
    name: "Deep Drone",
    params: {
      waveform: "sawtooth",
      frequency: 55,
      volume: -10,
      attack: 1.2,
      release: 2.0,
    },
  },
];
