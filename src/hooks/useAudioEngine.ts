import { useRef, useCallback, useEffect, useState } from "react";
import { AudioEngine } from "../audio/engine";
import type { SceneState } from "../types/audio";

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
    async (scene: SceneState) => {
      if (!isReady) await init();
      engineRef.current?.play(scene);
      setIsPlaying(true);
    },
    [isReady, init],
  );

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setIsPlaying(false);
  }, []);

  const updateScene = useCallback(
    async (scene: SceneState) => {
      if (!isReady) return;
      engineRef.current?.applyScene(scene);
    },
    [isReady],
  );

  const getWaveformData = useCallback((): Float32Array => {
    return engineRef.current?.getWaveformData() ?? new Float32Array(256);
  }, []);

  return { isPlaying, isReady, init, play, stop, updateScene, getWaveformData };
}
