import type { ScaleName, RootNote } from "../audio/scales";

export type LayerKind = "pad" | "lead" | "melody" | "bass" | "percussion" | "arp";

export interface LayerState {
  kind: LayerKind;
  active: boolean;
  volume: number; // 0-1 normalized
  density: number; // 0-1, how busy/frequent the layer is
  color: string; // UI accent color
}

export interface SceneState {
  root: RootNote;
  scale: ScaleName;
  bpm: number;
  energy: number; // 0-1 global energy/intensity
  masterVolume: number; // 0-1 normalized master volume
  layers: Record<LayerKind, LayerState>;
  isPlaying: boolean;
}

export const LAYER_DEFAULTS: Record<LayerKind, LayerState> = {
  pad: { kind: "pad", active: true, volume: 0.6, density: 0.3, color: "#6c63ff" },
  bass: { kind: "bass", active: true, volume: 0.5, density: 0.4, color: "#ff6b6b" },
  melody: { kind: "melody", active: false, volume: 0.4, density: 0.5, color: "#ffd93d" },
  lead: { kind: "lead", active: false, volume: 0.35, density: 0.3, color: "#6bffb8" },
  arp: { kind: "arp", active: false, volume: 0.3, density: 0.5, color: "#63d5ff" },
  percussion: { kind: "percussion", active: false, volume: 0.45, density: 0.5, color: "#ff63c5" },
};

export const DEFAULT_SCENE: SceneState = {
  root: "C",
  scale: "minorPentatonic",
  bpm: 85,
  energy: 0.5,
  masterVolume: 0.8,
  layers: { ...LAYER_DEFAULTS },
  isPlaying: false,
};
