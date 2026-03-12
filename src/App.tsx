import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAudioEngine } from "./hooks/useAudioEngine";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { Playground } from "./components/Playground/Playground";
import type { OrbState } from "./components/Playground/Playground";
import { DEFAULT_SCENE } from "./types/audio";
import type { SceneState, LayerKind } from "./types/audio";

// Initial orb positions — spread across the canvas
const INITIAL_ORB_POSITIONS: Record<LayerKind, { x: number; y: number }> = {
  pad: { x: 0.25, y: 0.35 },
  bass: { x: 0.2, y: 0.65 },
  melody: { x: 0.55, y: 0.3 },
  lead: { x: 0.75, y: 0.25 },
  arp: { x: 0.7, y: 0.55 },
  percussion: { x: 0.45, y: 0.7 },
};

export default function App() {
  const [scene, setScene] = useState<SceneState>(DEFAULT_SCENE);
  const [orbPositions, setOrbPositions] = useState(INITIAL_ORB_POSITIONS);
  const { isPlaying, play, stop, updateScene, getWaveformData } = useAudioEngine();
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // Sync scene to audio engine
  useEffect(() => {
    if (isPlaying) {
      updateScene({ ...scene, isPlaying: true });
    }
  }, [scene, isPlaying, updateScene]);

  const orbs: OrbState[] = useMemo(() => {
    const labels: Record<LayerKind, string> = {
      pad: "pad",
      bass: "bass",
      melody: "melody",
      lead: "lead",
      arp: "arp",
      percussion: "perc",
    };

    return (Object.keys(scene.layers) as LayerKind[]).map((kind) => ({
      kind,
      x: orbPositions[kind].x,
      y: orbPositions[kind].y,
      active: scene.layers[kind].active,
      color: scene.layers[kind].color,
      label: labels[kind],
    }));
  }, [scene.layers, orbPositions]);

  const handleOrbChange = useCallback(
    (kind: LayerKind, x: number, y: number, active: boolean) => {
      // Update position
      setOrbPositions((prev) => ({ ...prev, [kind]: { x, y } }));

      // Map position to audio params: x = density, y inverted = volume
      setScene((prev) => ({
        ...prev,
        layers: {
          ...prev.layers,
          [kind]: {
            ...prev.layers[kind],
            active,
            density: x,
            volume: 1 - y, // top = loud, bottom = quiet
          },
        },
      }));
    },
    [],
  );

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      play({ ...sceneRef.current, isPlaying: true });
    }
  }, [isPlaying, play, stop]);

  return (
    <>
      <Sidebar
        scene={scene}
        isPlaying={isPlaying}
        onChange={setScene}
        onTogglePlay={handleTogglePlay}
      />
      <Playground
        orbs={orbs}
        onOrbChange={handleOrbChange}
        getWaveformData={getWaveformData}
        isPlaying={isPlaying}
      />
    </>
  );
}
