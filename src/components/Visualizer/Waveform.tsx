import { useRef, useEffect, useCallback } from "react";
import styles from "./Waveform.module.css";

interface WaveformProps {
  getData: () => Float32Array;
  isPlaying: boolean;
  accentColor?: string;
}

export function Waveform({ getData, isPlaying, accentColor = "#6c63ff" }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const mid = height / 2;

    timeRef.current += 0.02;

    // Background with subtle gradient
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "#08081a");
    bg.addColorStop(1, "#0a0a12");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const data = getData();

    // Ambient idle wave when not playing
    if (!isPlaying) {
      ctx.beginPath();
      ctx.strokeStyle = "#1a1a3a";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x++) {
        const y = mid + Math.sin(x * 0.02 + timeRef.current) * 8;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Main waveform
    ctx.beginPath();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = isPlaying ? 12 : 4;

    const sliceWidth = width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      const y = mid + v * mid * 0.9;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.stroke();

    // Mirror reflection (faint)
    ctx.beginPath();
    ctx.strokeStyle = accentColor;
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    x = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      const y = mid - v * mid * 0.4;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    animFrameRef.current = requestAnimationFrame(draw);
  }, [getData, isPlaying, accentColor]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
