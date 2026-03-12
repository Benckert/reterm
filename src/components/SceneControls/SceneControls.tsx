import type { SceneState } from "../../types/audio";
import type { ScaleName, RootNote } from "../../audio/scales";
import styles from "./SceneControls.module.css";

interface SceneControlsProps {
  scene: SceneState;
  onChange: (scene: SceneState) => void;
}

const ROOTS: RootNote[] = ["C", "D", "E", "F", "G", "A", "B"];

const SCALES: { value: ScaleName; label: string }[] = [
  { value: "minor", label: "minor" },
  { value: "major", label: "major" },
  { value: "dorian", label: "dorian" },
  { value: "pentatonic", label: "pentatonic" },
  { value: "minorPentatonic", label: "min penta" },
  { value: "mixolydian", label: "mixolydian" },
  { value: "phrygian", label: "phrygian" },
];

export function SceneControls({ scene, onChange }: SceneControlsProps) {
  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <div className={styles.group}>
          <span className={styles.label}>root</span>
          <div className={styles.pills}>
            {ROOTS.map((r) => (
              <button
                key={r}
                className={`${styles.pill} ${scene.root === r ? styles.activePill : ""}`}
                onClick={() => onChange({ ...scene, root: r })}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.label}>scale</span>
          <div className={styles.pills}>
            {SCALES.map((s) => (
              <button
                key={s.value}
                className={`${styles.pill} ${scene.scale === s.value ? styles.activePill : ""}`}
                onClick={() => onChange({ ...scene, scale: s.value })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.row}>
        <label className={styles.slider}>
          <span className={styles.label}>
            tempo <span className={styles.value}>{scene.bpm}</span>
          </span>
          <input
            type="range"
            min={40}
            max={180}
            step={1}
            value={scene.bpm}
            onChange={(e) => onChange({ ...scene, bpm: Number(e.target.value) })}
          />
        </label>

        <label className={styles.slider}>
          <span className={styles.label}>
            energy <span className={styles.value}>{Math.round(scene.energy * 100)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={scene.energy}
            onChange={(e) => onChange({ ...scene, energy: Number(e.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}
