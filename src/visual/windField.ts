import { noise3D, fbm } from "./noise";

export interface OrbPosition {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  active: boolean;
}

export interface FieldSample {
  vx: number;      // velocity X component
  vy: number;      // velocity Y component
  turbulence: number; // 0-1, local chaos level
  phase: number;   // 0-1, slow-cycling value for color/harmonic variation
}

export class WindField {
  private time = 0;
  private windAngle = 0; // slowly drifting primary wind direction
  private gustPhase = 0;

  update(dt: number) {
    this.time += dt;
    // Wind direction drifts slowly
    this.windAngle = Math.sin(this.time * 0.05) * 0.8 + Math.cos(this.time * 0.03) * 0.4;
    this.gustPhase = this.time;
  }

  sample(x: number, y: number, orbs: OrbPosition[]): FieldSample {
    const t = this.time;

    // Base flow: large-scale noise field that moves with time
    // Scale coordinates so the noise has visible structure
    const nx = x * 3;
    const ny = y * 3;

    // Base wind direction
    const windCos = Math.cos(this.windAngle);
    const windSin = Math.sin(this.windAngle);

    // Multi-octave noise for organic base flow
    const baseVx = fbm(nx, ny, t * 0.15, 3) * 0.6 + windCos * 0.3;
    const baseVy = fbm(nx + 100, ny + 100, t * 0.15, 3) * 0.4 + windSin * 0.15;

    // Gust layer — periodic stronger bursts
    const gustStrength = Math.max(0, Math.sin(this.gustPhase * 0.4) * 0.5 + noise3D(nx * 0.5, ny * 0.5, t * 0.3) * 0.5);
    const gustVx = gustStrength * windCos * 0.5;
    const gustVy = gustStrength * windSin * 0.3;

    let vx = baseVx + gustVx;
    let vy = baseVy + gustVy;
    let turbulence = Math.abs(fbm(nx * 2, ny * 2, t * 0.25, 2)) * 0.3;

    // Orb disturbances — each active orb creates a vortex
    for (const orb of orbs) {
      if (!orb.active) continue;

      const dx = x - orb.x;
      const dy = y - orb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const influence = 0.15; // radius of influence in normalized coords

      if (dist < influence && dist > 0.001) {
        const strength = 1 - dist / influence;
        const s2 = strength * strength;

        // Vortex: perpendicular to displacement (rotational flow)
        const perpX = -dy / dist;
        const perpY = dx / dist;
        vx += perpX * s2 * 0.8;
        vy += perpY * s2 * 0.8;

        // Deflection: push flow around the orb
        vx += (dx / dist) * s2 * 0.3;
        vy += (dy / dist) * s2 * 0.3;

        // Wake turbulence: downstream of orb relative to wind direction
        const downstreamDot = dx * windCos + dy * windSin;
        if (downstreamDot > 0) {
          // We're downstream of the orb
          const wakeTurb = s2 * 0.7 * (1 + noise3D(nx * 4, ny * 4, t * 0.5) * 0.5);
          turbulence += wakeTurb;
        }

        // Near-orb turbulence boost
        turbulence += s2 * 0.4;
      }
    }

    turbulence = Math.min(1, turbulence);

    // Phase: slow-cycling value for color and harmonic variation
    const phase = (noise3D(nx * 0.5, ny * 0.5, t * 0.08) + 1) * 0.5;

    return { vx, vy, turbulence, phase };
  }

  getTime(): number {
    return this.time;
  }
}
