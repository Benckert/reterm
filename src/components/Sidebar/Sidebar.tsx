import type { SceneState } from "../../types/audio";
import type { ScaleName, RootNote } from "../../audio/scales";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  scene: SceneState;
  isPlaying: boolean;
  onChange: (scene: SceneState) => void;
  onTogglePlay: () => void;
}

const ROOTS: RootNote[] = ["C", "D", "E", "F", "G", "A", "B"];

const SCALES: { value: ScaleName; label: string }[] = [
  { value: "minorPentatonic", label: "min penta" },
  { value: "pentatonic", label: "penta" },
  { value: "minor", label: "minor" },
  { value: "major", label: "major" },
  { value: "dorian", label: "dorian" },
  { value: "mixolydian", label: "mixo" },
  { value: "phrygian", label: "phrygian" },
];

export function Sidebar({ scene, isPlaying, onChange, onTogglePlay }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoText}>reterm</span>
      </div>

      <button
        className={`${styles.playBtn} ${isPlaying ? styles.playing : ""}`}
        onClick={onTogglePlay}
      >
        <span className={styles.playIcon}>{isPlaying ? "||" : ">"}</span>
      </button>

      <div className={styles.group}>
        <span className={styles.label}>root</span>
        <div className={styles.selector}>
          {ROOTS.map((r) => (
            <button
              key={r}
              className={`${styles.chip} ${scene.root === r ? styles.activeChip : ""}`}
              onClick={() => onChange({ ...scene, root: r })}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>scale</span>
        <div className={styles.selector}>
          {SCALES.map((s) => (
            <button
              key={s.value}
              className={`${styles.chip} ${scene.scale === s.value ? styles.activeChip : ""}`}
              onClick={() => onChange({ ...scene, scale: s.value })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>
          bpm <span className={styles.value}>{scene.bpm}</span>
        </span>
        <input
          type="range"
          className={styles.range}
          min={40}
          max={180}
          step={1}
          value={scene.bpm}
          onChange={(e) => onChange({ ...scene, bpm: Number(e.target.value) })}
        />
      </div>

      <div className={styles.group}>
        <span className={styles.label}>
          energy <span className={styles.value}>{Math.round(scene.energy * 100)}%</span>
        </span>
        <input
          type="range"
          className={styles.range}
          min={0}
          max={1}
          step={0.01}
          value={scene.energy}
          onChange={(e) => onChange({ ...scene, energy: Number(e.target.value) })}
        />
      </div>

      <div className={styles.group}>
        <span className={styles.label}>
          volume <span className={styles.value}>{Math.round(scene.masterVolume * 100)}%</span>
        </span>
        <input
          type="range"
          className={styles.range}
          min={0}
          max={1}
          step={0.01}
          value={scene.masterVolume}
          onChange={(e) => onChange({ ...scene, masterVolume: Number(e.target.value) })}
        />
      </div>

      <div className={styles.hint}>
        drag the orbs to shape the sound
      </div>
    </aside>
  );
}
