import { useState, useCallback } from "react";
import { useAudioEngine } from "./hooks/useAudioEngine";
import { SynthControls } from "./components/Synth/SynthControls";
import { Waveform } from "./components/Visualizer/Waveform";
import { DEFAULT_SYNTH_PARAMS } from "./types/audio";
import type { SynthParams } from "./types/audio";
import styles from "./App.module.css";

export default function App() {
  const [params, setParams] = useState<SynthParams>(DEFAULT_SYNTH_PARAMS);
  const { isPlaying, play, stop, updateParams, getWaveformData } =
    useAudioEngine();

  const handleParamsChange = useCallback(
    (newParams: SynthParams) => {
      setParams(newParams);
      if (isPlaying) {
        updateParams(newParams);
      }
    },
    [isPlaying, updateParams],
  );

  const handlePlay = useCallback(() => {
    play(params);
  }, [play, params]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reterm</h1>
        <p className={styles.subtitle}>Audio Generator</p>
      </header>

      <main className={styles.main}>
        <Waveform getData={getWaveformData} isPlaying={isPlaying} />
        <SynthControls
          params={params}
          onChange={handleParamsChange}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onStop={stop}
        />
      </main>
    </div>
  );
}
