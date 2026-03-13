import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAudioEngine } from "./hooks/useAudioEngine";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { Playground } from "./components/Playground/Playground";
import { DEFAULT_SCENE } from "./types/audio";
import type { OrbState } from "./components/Playground/Playground";
import type { SceneState, LayerKind, AudioModulation } from "./types/audio";

// Layers available to cycle through when adding orbs
const ALL_LAYERS: LayerKind[] = ["pad", "bass", "melody", "lead", "arp", "percussion"];

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
  const { isPlaying, play, stop, updateScene } = useAudioEngine();
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
      setOrbPositions((prev) => ({ ...prev, [kind]: { x, y } }));
      setScene((prev) => ({
        ...prev,
        layers: {
          ...prev.layers,
          [kind]: {
            ...prev.layers[kind],
            active,
            density: x,
            volume: 1 - y,
          },
        },
      }));
    },
    [],
  );

  // Click empty space → activate next inactive layer at that position
  const handleOrbAdd = useCallback(
    (x: number, y: number) => {
      setScene((prev) => {
        // Find first inactive layer
        const inactiveKind = ALL_LAYERS.find((k) => !prev.layers[k].active);
        if (!inactiveKind) return prev; // all active already

        setOrbPositions((p) => ({ ...p, [inactiveKind]: { x, y } }));
        return {
          ...prev,
          layers: {
            ...prev.layers,
            [inactiveKind]: {
              ...prev.layers[inactiveKind],
              active: true,
              density: x,
              volume: 1 - y,
            },
          },
        };
      });
    },
    [],
  );

  // Right-click orb → deactivate it
  const handleOrbRemove = useCallback(
    (kind: LayerKind) => {
      setScene((prev) => ({
        ...prev,
        layers: {
          ...prev.layers,
          [kind]: {
            ...prev.layers[kind],
            active: false,
          },
        },
      }));
    },
    [],
  );

  // Field sampler modulation → merge into scene (throttled by Playground to ~20fps)
  const handleModulation = useCallback(
    (modulations: Map<LayerKind, AudioModulation>) => {
      setScene((prev) => {
        const newLayers = { ...prev.layers };
        let changed = false;
        for (const [kind, mod] of modulations) {
          const existing = newLayers[kind].modulation;
          // Only update if modulation changed meaningfully (avoid thrashing)
          if (
            !existing ||
            Math.abs(existing.densityMod - mod.densityMod) > 0.02 ||
            Math.abs(existing.volumeMod - mod.volumeMod) > 0.02 ||
            Math.abs(existing.effectWet - mod.effectWet) > 0.02 ||
            Math.abs(existing.harmonicShift - mod.harmonicShift) > 0.02
          ) {
            newLayers[kind] = { ...newLayers[kind], modulation: mod };
            changed = true;
          }
        }
        if (!changed) return prev;
        return { ...prev, layers: newLayers };
      });
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
        onOrbAdd={handleOrbAdd}
        onOrbRemove={handleOrbRemove}
        onModulation={handleModulation}
        isPlaying={isPlaying}
      />
    </>
  );
}
