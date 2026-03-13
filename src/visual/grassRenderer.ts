import type { WindField, OrbPosition } from "./windField";

// Vibrant but limited palette
const PALETTE = {
  // Calm stream
  calmA: [13, 79, 79] as const,    // deep teal #0d4f4f
  calmB: [45, 27, 105] as const,   // indigo #2d1b69
  // Active / orb wake
  activeA: [232, 67, 147] as const, // magenta #e84393
  activeB: [253, 114, 114] as const, // coral #fd7272
  // Peak turbulence
  peakA: [253, 203, 110] as const,  // gold #fdcb6e
  peakB: [0, 206, 201] as const,    // electric cyan #00cec9
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

function getFieldColor(
  turbulence: number,
  phase: number,
): [number, number, number] {
  // Blend through palette based on turbulence level
  if (turbulence < 0.3) {
    // Calm: teal ↔ indigo, phase controls blend
    const calm = lerpColor(PALETTE.calmA, PALETTE.calmB, phase);
    // Slight mix toward active at higher turbulence
    const active = lerpColor(PALETTE.activeA, PALETTE.activeB, phase);
    return lerpColor(calm, active, turbulence / 0.3 * 0.3);
  } else if (turbulence < 0.6) {
    // Active: magenta ↔ coral
    const active = lerpColor(PALETTE.activeA, PALETTE.activeB, phase);
    const peak = lerpColor(PALETTE.peakA, PALETTE.peakB, phase);
    const t = (turbulence - 0.3) / 0.3;
    return lerpColor(active, peak, t * 0.5);
  } else {
    // Peak: gold ↔ electric cyan
    const active = lerpColor(PALETTE.activeA, PALETTE.activeB, phase);
    const peak = lerpColor(PALETTE.peakA, PALETTE.peakB, phase);
    const t = Math.min(1, (turbulence - 0.6) / 0.4);
    return lerpColor(active, peak, 0.5 + t * 0.5);
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;    // 0-1, decreasing
  maxLife: number;
  r: number;
  g: number;
  b: number;
  size: number;
}

export class GrassRenderer {
  private particles: Particle[] = [];
  private readonly maxParticles = 100;
  private spawnAccum = 0;

  render(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    windField: WindField,
    orbs: (OrbPosition & { color: string; label: string })[],
    time: number,
  ) {
    // Background
    ctx.fillStyle = "#060612";
    ctx.fillRect(0, 0, w, h);

    // Render grass blades
    this.renderGrass(ctx, w, h, windField, orbs);

    // Render particles
    this.renderParticles(ctx, w, h, windField, orbs, time);

    // Render orbs on top
    this.renderOrbs(ctx, w, h, orbs);
  }

  private renderGrass(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    windField: WindField,
    orbs: (OrbPosition & { color: string; label: string })[],
  ) {
    const spacing = 8;
    const cols = Math.ceil(w / spacing);
    const rows = Math.ceil(h / spacing);

    ctx.lineCap = "round";

    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const baseX = col * spacing + (row % 2) * (spacing * 0.5); // stagger
        const baseY = row * spacing;

        if (baseX > w || baseY > h) continue;

        // Normalized position
        const nx = baseX / w;
        const ny = baseY / h;

        const sample = windField.sample(nx, ny, orbs);

        // Blade height varies with position and turbulence
        const baseHeight = 15 + Math.sin(col * 0.7 + row * 0.3) * 8;
        const height = baseHeight * (0.7 + sample.turbulence * 0.5);

        // Sway: wind velocity tilts the blade tip
        const swayX = sample.vx * 25 * (1 + sample.turbulence * 1.5);
        const swayY = sample.vy * 15;

        // Color from field
        const [r, g, b] = getFieldColor(sample.turbulence, sample.phase);

        // Alpha: brighter in turbulent zones
        const alpha = 0.25 + sample.turbulence * 0.55;

        // Draw blade as quadratic bezier
        const tipX = baseX + swayX;
        const tipY = baseY - height + swayY;
        const cpX = baseX + swayX * 0.5;
        const cpY = baseY - height * 0.6 + swayY * 0.3;

        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
        ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha.toFixed(2)})`;
        ctx.lineWidth = 1.2 + sample.turbulence * 0.8;
        ctx.stroke();
      }
    }
  }

  private renderParticles(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    windField: WindField,
    orbs: (OrbPosition & { color: string; label: string })[],
    _time: number,
  ) {
    const dt = 1 / 60; // approximate frame dt

    // Spawn particles near active orbs with high turbulence
    this.spawnAccum += dt;
    if (this.spawnAccum > 0.05) {
      this.spawnAccum = 0;
      for (const orb of orbs) {
        if (!orb.active) continue;
        const sample = windField.sample(orb.x, orb.y, orbs);
        if (sample.turbulence > 0.3 && this.particles.length < this.maxParticles) {
          const spread = 0.08;
          const px = orb.x + (Math.random() - 0.5) * spread;
          const py = orb.y + (Math.random() - 0.5) * spread;
          const [r, g, b] = getFieldColor(sample.turbulence, sample.phase);
          // Brighten particle colors
          this.particles.push({
            x: px,
            y: py,
            vx: sample.vx * 0.3,
            vy: sample.vy * 0.3,
            life: 1,
            maxLife: 0.8 + Math.random() * 1.2,
            r: Math.min(255, r * 1.5),
            g: Math.min(255, g * 1.5),
            b: Math.min(255, b * 1.5),
            size: 1.5 + Math.random() * 2.5,
          });
        }
      }
    }

    // Update and render particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      // Follow wind field
      const sample = windField.sample(p.x, p.y, orbs);
      p.vx = p.vx * 0.9 + sample.vx * 0.1;
      p.vy = p.vy * 0.9 + sample.vy * 0.1;
      p.x += p.vx * dt * 0.5;
      p.y += p.vy * dt * 0.5;
      p.life -= dt / p.maxLife;

      if (p.life <= 0 || p.x < -0.05 || p.x > 1.05 || p.y < -0.05 || p.y > 1.05) {
        this.particles.splice(i, 1);
        continue;
      }

      // Draw with glow
      const px = p.x * w;
      const py = p.y * h;
      const alpha = p.life * 0.8;
      const glowSize = p.size * (1 + (1 - p.life) * 2);

      // Glow
      const glow = ctx.createRadialGradient(px, py, 0, px, py, glowSize * 3);
      glow.addColorStop(0, `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${(alpha * 0.3).toFixed(2)})`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, glowSize * 3, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(px, py, p.size * p.life, 0, Math.PI * 2);
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
      const radius = orb.active ? 24 : 14;

      // Glow for active orbs
      if (orb.active) {
        const glow = ctx.createRadialGradient(px, py, 0, px, py, radius * 3);
        glow.addColorStop(0, orb.color + "30");
        glow.addColorStop(0.5, orb.color + "10");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, radius * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Body
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = orb.active ? orb.color + "cc" : orb.color + "22";
      ctx.fill();

      // Border
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.strokeStyle = orb.active ? orb.color + "66" : orb.color + "15";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.fillStyle = orb.active ? "#ccc" : "#444";
      ctx.font = "10px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(orb.label, px, py + radius + 14);
    }
  }
}
