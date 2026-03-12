import { useRef, useEffect, useCallback, useState } from "react";
import type { LayerKind } from "../../types/audio";
import styles from "./Playground.module.css";

export interface OrbState {
  kind: LayerKind;
  x: number; // 0-1 normalized position
  y: number; // 0-1 normalized position
  active: boolean;
  color: string;
  label: string;
}

interface PlaygroundProps {
  orbs: OrbState[];
  onOrbChange: (kind: LayerKind, x: number, y: number, active: boolean) => void;
  getWaveformData: () => Float32Array;
  isPlaying: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
}

export function Playground({ orbs, onOrbChange, getWaveformData, isPlaying }: PlaygroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const dragRef = useRef<{ kind: LayerKind; offsetX: number; offsetY: number } | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const orbsRef = useRef(orbs);
  orbsRef.current = orbs;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  // Convert normalized coords to canvas pixel coords
  const toPixel = useCallback(
    (nx: number, ny: number) => ({
      px: nx * canvasSize.w,
      py: ny * canvasSize.h,
    }),
    [canvasSize],
  );

  // Convert canvas pixel coords to normalized
  const toNorm = useCallback(
    (px: number, py: number) => ({
      nx: Math.max(0, Math.min(1, px / canvasSize.w)),
      ny: Math.max(0, Math.min(1, py / canvasSize.h)),
    }),
    [canvasSize],
  );

  const spawnParticles = useCallback(
    (orb: OrbState, count: number) => {
      const { px, py } = toPixel(orb.x, orb.y);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 1.5;
        particlesRef.current.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 60 + Math.random() * 90,
          color: orb.color,
          size: 1 + Math.random() * 3,
        });
      }
    },
    [toPixel],
  );

  const spawnRipple = useCallback(
    (x: number, y: number, color: string) => {
      ripplesRef.current.push({
        x,
        y,
        radius: 0,
        maxRadius: 80 + Math.random() * 60,
        color,
        life: 1,
      });
    },
    [],
  );

  // Drawing loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      setCanvasSize({ w, h });
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    timeRef.current += 0.016;
    const t = timeRef.current;

    // Background
    ctx.fillStyle = "#060612";
    ctx.fillRect(0, 0, w, h);

    // Subtle ambient fog
    const waveform = getWaveformData();
    const avgAmplitude = waveform.reduce((s, v) => s + Math.abs(v), 0) / waveform.length;

    // Background breathing glow
    if (isPlayingRef.current) {
      const breathe = 0.03 + avgAmplitude * 0.08;
      const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
      grd.addColorStop(0, `rgba(108, 99, 255, ${breathe})`);
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
    }

    // Subtle grid dots
    ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
    const gridSpacing = 40;
    for (let gx = gridSpacing; gx < w; gx += gridSpacing) {
      for (let gy = gridSpacing; gy < h; gy += gridSpacing) {
        ctx.beginPath();
        ctx.arc(gx, gy, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Update and draw ripples
    ripplesRef.current = ripplesRef.current.filter((r) => r.life > 0);
    for (const ripple of ripplesRef.current) {
      ripple.radius += 2;
      ripple.life -= 1 / 40;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = ripple.color;
      ctx.globalAlpha = ripple.life * 0.3;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Update and draw particles
    particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
    for (const p of particlesRef.current) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.01; // tiny gravity
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.life -= 1 / p.maxLife;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life * 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Draw connection lines between active orbs
    const activeOrbs = orbsRef.current.filter((o) => o.active);
    if (activeOrbs.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(108, 99, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let i = 0; i < activeOrbs.length; i++) {
        for (let j = i + 1; j < activeOrbs.length; j++) {
          const a = toPixel(activeOrbs[i].x, activeOrbs[i].y);
          const b = toPixel(activeOrbs[j].x, activeOrbs[j].y);
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
        }
      }
      ctx.stroke();
    }

    // Draw orbs
    for (const orb of orbsRef.current) {
      const { px, py } = toPixel(orb.x, orb.y);
      const baseRadius = orb.active ? 28 : 16;
      const pulse = orb.active && isPlayingRef.current
        ? Math.sin(t * 3 + orbsRef.current.indexOf(orb) * 1.2) * 4 * avgAmplitude * 3
        : 0;
      const radius = baseRadius + pulse;

      // Outer glow
      if (orb.active) {
        const glowSize = radius * 3 + avgAmplitude * 40;
        const glow = ctx.createRadialGradient(px, py, 0, px, py, glowSize);
        glow.addColorStop(0, orb.color + "25");
        glow.addColorStop(0.5, orb.color + "08");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Spawn ambient particles
        if (isPlayingRef.current && Math.random() < 0.15 + avgAmplitude * 0.5) {
          spawnParticles(orb, 1);
        }
      }

      // Orb body
      const bodyGrad = ctx.createRadialGradient(
        px - radius * 0.3,
        py - radius * 0.3,
        0,
        px,
        py,
        radius,
      );
      if (orb.active) {
        bodyGrad.addColorStop(0, orb.color + "ff");
        bodyGrad.addColorStop(0.7, orb.color + "aa");
        bodyGrad.addColorStop(1, orb.color + "44");
      } else {
        bodyGrad.addColorStop(0, orb.color + "33");
        bodyGrad.addColorStop(1, orb.color + "11");
      }

      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Border ring
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.strokeStyle = orb.active ? orb.color + "88" : orb.color + "22";
      ctx.lineWidth = orb.active ? 1.5 : 1;
      ctx.stroke();

      // Label
      ctx.fillStyle = orb.active ? "#e0e0e0" : "#444";
      ctx.font = "10px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(orb.label, px, py + radius + 16);

      // Axis hints (faint)
      if (orb.active) {
        ctx.fillStyle = "#333";
        ctx.font = "8px Inter, system-ui, sans-serif";
        ctx.fillText(`vol ${Math.round((1 - orb.y) * 100)}%`, px, py - radius - 8);
        ctx.fillText(`den ${Math.round(orb.x * 100)}%`, px, py - radius - 18);
      }
    }

    // Waveform trace at the bottom
    if (isPlayingRef.current) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(108, 99, 255, 0.2)";
      ctx.lineWidth = 1;
      const sliceW = w / waveform.length;
      const waveY = h - 30;
      for (let i = 0; i < waveform.length; i++) {
        const x = i * sliceW;
        const y = waveY + waveform[i] * 20;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    animRef.current = requestAnimationFrame(draw);
  }, [getWaveformData, toPixel, spawnParticles]);

  // Canvas resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setCanvasSize({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    obs.observe(canvas);
    return () => obs.disconnect();
  }, []);

  // Animation loop
  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Mouse/touch interaction
  const getCanvasPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    [],
  );

  const findOrbAt = useCallback(
    (px: number, py: number): OrbState | null => {
      // Check in reverse so topmost orbs are hit first
      for (let i = orbsRef.current.length - 1; i >= 0; i--) {
        const orb = orbsRef.current[i];
        const pos = toPixel(orb.x, orb.y);
        const hitRadius = orb.active ? 35 : 22;
        const dx = px - pos.px;
        const dy = py - pos.py;
        if (dx * dx + dy * dy < hitRadius * hitRadius) {
          return orb;
        }
      }
      return null;
    },
    [toPixel],
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCanvasPos(e);
      const orb = findOrbAt(pos.x, pos.y);
      if (orb) {
        const orbPos = toPixel(orb.x, orb.y);
        dragRef.current = {
          kind: orb.kind,
          offsetX: pos.x - orbPos.px,
          offsetY: pos.y - orbPos.py,
        };
      }
    },
    [getCanvasPos, findOrbAt, toPixel],
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current) return;
      const pos = getCanvasPos(e);
      const { nx, ny } = toNorm(
        pos.x - dragRef.current.offsetX,
        pos.y - dragRef.current.offsetY,
      );
      const orb = orbsRef.current.find((o) => o.kind === dragRef.current!.kind);
      if (orb) {
        onOrbChange(orb.kind, nx, ny, orb.active);
      }
    },
    [getCanvasPos, toNorm, onOrbChange],
  );

  const handlePointerUp = useCallback(
    () => {
      dragRef.current = null;
    },
    [],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Only toggle if we didn't drag
      if (dragRef.current) return;
      const pos = getCanvasPos(e);
      const orb = findOrbAt(pos.x, pos.y);
      if (orb) {
        onOrbChange(orb.kind, orb.x, orb.y, !orb.active);
        spawnRipple(pos.x, pos.y, orb.color);
      } else {
        // Click empty space — spawn a decorative ripple
        spawnRipple(pos.x, pos.y, "rgba(108, 99, 255, 0.5)");
      }
    },
    [getCanvasPos, findOrbAt, onOrbChange, spawnRipple],
  );

  // Track if we actually dragged (vs just clicked)
  const didDragRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      didDragRef.current = false;
      const pos = getCanvasPos(e);
      startPosRef.current = pos;
      handlePointerDown(e);
    },
    [getCanvasPos, handlePointerDown],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragRef.current) {
        const pos = getCanvasPos(e);
        const dx = pos.x - startPosRef.current.x;
        const dy = pos.y - startPosRef.current.y;
        if (dx * dx + dy * dy > 9) {
          didDragRef.current = true;
        }
      }
      handlePointerMove(e);
    },
    [getCanvasPos, handlePointerMove],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!didDragRef.current) {
        handleClick(e);
      }
      handlePointerUp();
    },
    [handleClick, handlePointerUp],
  );

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handlePointerUp}
    />
  );
}
