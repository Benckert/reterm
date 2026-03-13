import type { WindField, OrbPosition } from "./windField";

export interface AudioModulation {
  densityMod: number;    // -0.3 to 0.3
  volumeMod: number;     // -0.2 to 0.2
  effectWet: number;     // 0 to 0.5
  harmonicShift: number; // 0 to 1
}

export function sampleOrbAudio(
  windField: WindField,
  orbX: number,
  orbY: number,
  allOrbs: OrbPosition[],
): AudioModulation {
  const sample = windField.sample(orbX, orbY, allOrbs);

  // Turbulence → density modulation: more chaos = busier patterns
  const densityMod = (sample.turbulence - 0.3) * 1.0; // centered around baseline, range ~-0.3 to 0.3

  // Velocity magnitude → volume modulation: stronger flow = louder
  const speed = Math.sqrt(sample.vx * sample.vx + sample.vy * sample.vy);
  const volumeMod = (speed - 0.3) * 0.4; // range ~-0.2 to 0.2

  // Turbulence → effect wetness: chaos adds space
  const effectWet = sample.turbulence * 0.5;

  // Phase → harmonic shift: slow cycling through voicings
  const harmonicShift = sample.phase;

  return {
    densityMod: Math.max(-0.3, Math.min(0.3, densityMod)),
    volumeMod: Math.max(-0.2, Math.min(0.2, volumeMod)),
    effectWet: Math.max(0, Math.min(0.5, effectWet)),
    harmonicShift: Math.max(0, Math.min(1, harmonicShift)),
  };
}
