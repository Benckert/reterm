import { useRef, useEffect, useCallback, useState } from "react";
import type { LayerKind, AudioModulation } from "../../types/audio";
import { WindField } from "../../visual/windField";
import { FieldRenderer } from "../../visual/fieldRenderer";
import { sampleOrbAudio } from "../../visual/fieldSampler";
import type { OrbPosition } from "../../visual/windField";
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
  onOrbAdd: (x: number, y: number) => void;
  onOrbRemove: (kind: LayerKind) => void;
  onModulation: (modulations: Map<LayerKind, AudioModulation>) => void;
  isPlaying: boolean;
}

export function Playground({
  orbs,
  onOrbChange,
  onOrbAdd,
  onOrbRemove,
  onModulation,
  isPlaying,
}: PlaygroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dragRef = useRef<{ kind: LayerKind; offsetX: number; offsetY: number } | null>(null);
  const orbsRef = useRef(orbs);
  orbsRef.current = orbs;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const onModulationRef = useRef(onModulation);
  onModulationRef.current = onModulation;
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  // Visual systems — persistent across renders
  const windFieldRef = useRef(new WindField());
  const fieldRendererRef = useRef(new FieldRenderer());
  const lastTimeRef = useRef(performance.now());
  const modFrameCount = useRef(0);

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

  // Main draw loop
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

    // Time delta
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
    lastTimeRef.current = now;

    // Update wind field
    const windField = windFieldRef.current;
    windField.update(dt);

    // Build orb positions for the field
    const orbPositions: (OrbPosition & { color: string; label: string })[] =
      orbsRef.current.map((o) => ({
        x: o.x,
        y: o.y,
        active: o.active,
        color: o.color,
        label: o.label,
      }));

    // Render grass field + particles + orbs
    fieldRendererRef.current.render(
      ctx,
      w,
      h,
      windField,
      orbPositions,
      windField.getTime(),
    );

    // Sample field for audio modulation — throttled to ~20fps
    modFrameCount.current++;
    if (modFrameCount.current % 3 === 0 && isPlayingRef.current) {
      const mods = new Map<LayerKind, AudioModulation>();
      for (const orb of orbsRef.current) {
        if (!orb.active) continue;
        const mod = sampleOrbAudio(windField, orb.x, orb.y, orbPositions);
        mods.set(orb.kind, mod);
      }
      onModulationRef.current(mods);
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

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

  // Interaction helpers
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
          // Left click on orb = toggle active
          onOrbChange(orb.kind, orb.x, orb.y, !orb.active);
        } else {
          // Left click on empty space = add new orb
          const { nx, ny } = toNorm(pos.x, pos.y);
          onOrbAdd(nx, ny);
        }
      }
      dragRef.current = null;
    },
    [getCanvasPos, findOrbAt, onOrbChange, onOrbAdd, toNorm],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const pos = getCanvasPos(e);
      const orb = findOrbAt(pos.x, pos.y);
      if (orb) {
        onOrbRemove(orb.kind);
      }
    },
    [getCanvasPos, findOrbAt, onOrbRemove],
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
      onContextMenu={handleContextMenu}
    />
  );
}
