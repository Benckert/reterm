import { useRef, useCallback, useEffect, useState } from "react";
import { AudioEngine } from "../audio/engine";
import type { SynthParams } from "../types/audio";

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    engineRef.current = new AudioEngine();
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const init = useCallback(async () => {
    if (!engineRef.current) return;
    await engineRef.current.init();
    setIsReady(true);
  }, []);

  const play = useCallback(
    async (params: SynthParams) => {
      if (!isReady) await init();
      const engine = engineRef.current;
      if (!engine) return;
      engine.updateParams(params);
      engine.triggerAttack(params.frequency);
      setIsPlaying(true);
    },
    [isReady, init],
  );

  const stop = useCallback(() => {
    engineRef.current?.triggerRelease();
    setIsPlaying(false);
  }, []);

  const updateParams = useCallback((params: SynthParams) => {
    engineRef.current?.updateParams(params);
  }, []);

  const getWaveformData = useCallback((): Float32Array => {
    return engineRef.current?.getWaveformData() ?? new Float32Array(256);
  }, []);

  return { isPlaying, isReady, init, play, stop, updateParams, getWaveformData };
}
