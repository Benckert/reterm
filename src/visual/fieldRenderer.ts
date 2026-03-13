import type { WindField, OrbPosition } from "./windField";

// Vibrant but limited palette
const PALETTE = {
  calmA: [13, 79, 79] as const,     // deep teal
  calmB: [45, 27, 105] as const,    // indigo
  activeA: [232, 67, 147] as const, // magenta
  activeB: [253, 114, 114] as const,// coral
  peakA: [253, 203, 110] as const,  // gold
  peakB: [0, 206, 201] as const,    // electric cyan
};

function lerpColor(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function getFieldColor(turbulence: number, phase: number): [number, number, number] {
  if (turbulence < 0.3) {
    const calm = lerpColor(PALETTE.calmA, PALETTE.calmB, phase);
    const active = lerpColor(PALETTE.activeA, PALETTE.activeB, phase);
    return lerpColor(calm, active, turbulence / 0.3 * 0.3);
  } else if (turbulence < 0.6) {
    const active = lerpColor(PALETTE.activeA, PALETTE.activeB, phase);
    const peak = lerpColor(PALETTE.peakA, PALETTE.peakB, phase);
    return lerpColor(active, peak, (turbulence - 0.3) / 0.3 * 0.5);
  } else {
    const active = lerpColor(PALETTE.activeA, PALETTE.activeB, phase);
    const peak = lerpColor(PALETTE.peakA, PALETTE.peakB, phase);
    return lerpColor(active, peak, 0.5 + Math.min(1, (turbulence - 0.6) / 0.4) * 0.5);
  }
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  r: number; g: number; b: number;
}

const FIELD_W = 120;
const FIELD_H = 70;
const MAX_PARTICLES = 30;

export class FieldRenderer {
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private imgData: ImageData;
  private particles: Particle[] = [];
  private spawnTimer = 0;

  constructor() {
    this.offscreen = document.createElement("canvas");
    this.offscreen.width = FIELD_W;
    this.offscreen.height = FIELD_H;
    this.offCtx = this.offscreen.getContext("2d")!;
    this.imgData = this.offCtx.createImageData(FIELD_W, FIELD_H);
  }

  render(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    windField: WindField,
    orbs: (OrbPosition & { color: string; label: string })[],
    _time: number,
  ) {
    this.renderColorField(ctx, w, h, windField, orbs);
    this.updateAndRenderParticles(ctx, w, h, windField, orbs);
    this.renderOrbs(ctx, w, h, orbs);
  }

  private renderColorField(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    windField: WindField,
    orbs: OrbPosition[],
  ) {
    const data = this.imgData.data;

    for (let py = 0; py < FIELD_H; py++) {
      const ny = py / FIELD_H;
      for (let px = 0; px < FIELD_W; px++) {
        const nx = px / FIELD_W;
        const sample = windField.sample(nx, ny, orbs);
        const [r, g, b] = getFieldColor(sample.turbulence, sample.phase);

        // Brightness varies: darker base, brighter in turbulent zones
        const brightness = 0.4 + sample.turbulence * 0.6;

        const idx = (py * FIELD_W + px) * 4;
        data[idx] = (r * brightness) | 0;
        data[idx + 1] = (g * brightness) | 0;
        data[idx + 2] = (b * brightness) | 0;
        data[idx + 3] = 255;
      }
    }

    this.offCtx.putImageData(this.imgData, 0, 0);

    // Scale up to full canvas with smooth interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";
    ctx.drawImage(this.offscreen, 0, 0, w, h);
  }

  private updateAndRenderParticles(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    windField: WindField,
    orbs: (OrbPosition & { color: string })[],
  ) {
    const dt = 1 / 60;

    // Spawn near active orbs in turbulent zones
    this.spawnTimer += dt;
    if (this.spawnTimer > 0.08) {
      this.spawnTimer = 0;
      for (const orb of orbs) {
        if (!orb.active || this.particles.length >= MAX_PARTICLES) break;
        const sample = windField.sample(orb.x, orb.y, orbs);
        if (sample.turbulence > 0.35) {
          const spread = 0.06;
          const [r, g, b] = getFieldColor(sample.turbulence, sample.phase);
          this.particles.push({
            x: orb.x + (Math.random() - 0.5) * spread,
            y: orb.y + (Math.random() - 0.5) * spread,
            vx: sample.vx * 0.2,
            vy: sample.vy * 0.2,
            life: 1,
            maxLife: 0.6 + Math.random() * 1.0,
            r: Math.min(255, r * 1.4),
            g: Math.min(255, g * 1.4),
            b: Math.min(255, b * 1.4),
          });
        }
      }
    }

    // Update and draw particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const sample = windField.sample(p.x, p.y, orbs);
      p.vx = p.vx * 0.92 + sample.vx * 0.08;
      p.vy = p.vy * 0.92 + sample.vy * 0.08;
      p.x += p.vx * dt * 0.4;
      p.y += p.vy * dt * 0.4;
      p.life -= dt / p.maxLife;

      if (p.life <= 0 || p.x < -0.05 || p.x > 1.05 || p.y < -0.05 || p.y > 1.05) {
        this.particles.splice(i, 1);
        continue;
      }

      // Simple filled circle — no gradients
      const px = p.x * w;
      const py = p.y * h;
      const alpha = p.life * 0.7;
      const size = 2 + (1 - p.life) * 1.5;
      ctx.fillStyle = `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderOrbs(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    orbs: (OrbPosition & { color: string; label: string })[],
  ) {
    for (const orb of orbs) {
      const px = orb.x * w;
      const py = orb.y * h;
      const radius = orb.active ? 20 : 12;

      // Glow for active orbs
      if (orb.active) {
        const glow = ctx.createRadialGradient(px, py, 0, px, py, radius * 2.5);
        glow.addColorStop(0, orb.color + "25");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Body
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = orb.active ? orb.color + "bb" : orb.color + "22";
      ctx.fill();

      // Border
      ctx.strokeStyle = orb.active ? orb.color + "55" : orb.color + "15";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.fillStyle = orb.active ? "#bbb" : "#444";
      ctx.font = "10px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(orb.label, px, py + radius + 14);
    }
  }
}
