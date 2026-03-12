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
  isPlaying: boolean;
}

export function Playground({ orbs, onOrbChange, isPlaying }: PlaygroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dragRef = useRef<{ kind: LayerKind; offsetX: number; offsetY: number } | null>(null);
  const orbsRef = useRef(orbs);
  orbsRef.current = orbs;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const toPixel = useCallback(
    (nx: number, ny: number) => ({
      px: nx * canvasSize.w,
      py: ny * canvasSize.h,
    }),
    [canvasSize],
  );

  const toNorm = useCallback(
    (px: number, py: number) => ({
      nx: Math.max(0, Math.min(1, px / canvasSize.w)),
      ny: Math.max(0, Math.min(1, py / canvasSize.h)),
    }),
    [canvasSize],
  );

  // Drawing loop — kept minimal
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

    // Background
    ctx.fillStyle = "#060612";
    ctx.fillRect(0, 0, w, h);

    // Subtle grid dots
    ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
    const gridSpacing = 40;
    for (let gx = gridSpacing; gx < w; gx += gridSpacing) {
      for (let gy = gridSpacing; gy < h; gy += gridSpacing) {
        ctx.beginPath();
        ctx.arc(gx, gy, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Connection lines between active orbs
    const activeOrbs = orbsRef.current.filter((o) => o.active);
    if (activeOrbs.length > 1) {
      ctx.strokeStyle = "rgba(108, 99, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let i = 0; i < activeOrbs.length; i++) {
        for (let j = i + 1; j < activeOrbs.length; j++) {
          const a = toPixel(activeOrbs[i].x, activeOrbs[i].y);
          const b = toPixel(activeOrbs[j].x, activeOrbs[j].y);
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
          ctx.stroke();
        }
      }
    }

    // Draw orbs
    for (const orb of orbsRef.current) {
      const { px, py } = toPixel(orb.x, orb.y);
      const radius = orb.active ? 24 : 14;

      // Simple glow for active orbs
      if (orb.active) {
        const glow = ctx.createRadialGradient(px, py, 0, px, py, radius * 2.5);
        glow.addColorStop(0, orb.color + "20");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Orb body
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
      ctx.fillStyle = orb.active ? "#ccc" : "#333";
      ctx.font = "10px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(orb.label, px, py + radius + 14);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [toPixel]);

  // Resize observer
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

  // Interaction
  const getCanvasPos = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    [],
  );

  const findOrbAt = useCallback(
    (px: number, py: number): OrbState | null => {
      for (let i = orbsRef.current.length - 1; i >= 0; i--) {
        const orb = orbsRef.current[i];
        const pos = toPixel(orb.x, orb.y);
        const hitRadius = orb.active ? 32 : 20;
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

  const didDragRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      didDragRef.current = false;
      const pos = getCanvasPos(e);
      startPosRef.current = pos;
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

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current) return;
      const pos = getCanvasPos(e);
      const dx = pos.x - startPosRef.current.x;
      const dy = pos.y - startPosRef.current.y;
      if (dx * dx + dy * dy > 9) {
        didDragRef.current = true;
      }
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

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!didDragRef.current) {
        const pos = getCanvasPos(e);
        const orb = findOrbAt(pos.x, pos.y);
        if (orb) {
          onOrbChange(orb.kind, orb.x, orb.y, !orb.active);
        }
      }
      dragRef.current = null;
    },
    [getCanvasPos, findOrbAt, onOrbChange],
  );

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
}
