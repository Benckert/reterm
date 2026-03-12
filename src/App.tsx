import { useState, useCallback, useEffect, useRef } from "react";
import { useAudioEngine } from "./hooks/useAudioEngine";
import { SceneControls } from "./components/SceneControls/SceneControls";
import { LayerControl } from "./components/LayerControl/LayerControl";
import { Waveform } from "./components/Visualizer/Waveform";
import { DEFAULT_SCENE } from "./types/audio";
import type { SceneState, LayerKind, LayerState } from "./types/audio";
import styles from "./App.module.css";

export default function App() {
  const [scene, setScene] = useState<SceneState>(DEFAULT_SCENE);
  const { isPlaying, play, stop, updateScene, getWaveformData } =
    useAudioEngine();
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // Sync scene changes to the engine while playing
  useEffect(() => {
    if (isPlaying) {
      updateScene({ ...scene, isPlaying: true });
    }
  }, [scene, isPlaying, updateScene]);

  const handleLayerChange = useCallback(
    (kind: LayerKind, layer: LayerState) => {
      setScene((prev) => ({
        ...prev,
        layers: { ...prev.layers, [kind]: layer },
      }));
    },
    [],
  );

  const handleToggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      play({ ...sceneRef.current, isPlaying: true });
    }
  }, [isPlaying, play, stop]);

  const layerOrder: LayerKind[] = ["pad", "bass", "melody", "lead", "arp", "percussion"];

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>reterm</h1>
        <p className={styles.subtitle}>generative audio</p>
      </header>

      <main className={styles.main}>
        <Waveform getData={getWaveformData} isPlaying={isPlaying} />

        <button
          className={`${styles.playBtn} ${isPlaying ? styles.playing : ""}`}
          onClick={handleToggle}
        >
          {isPlaying ? "stop" : "play"}
        </button>

        <section className={styles.section}>
          <SceneControls scene={scene} onChange={setScene} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>layers</h2>
          <div className={styles.layers}>
            {layerOrder.map((kind) => (
              <LayerControl
                key={kind}
                layer={scene.layers[kind]}
                onChange={(layer) => handleLayerChange(kind, layer)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
