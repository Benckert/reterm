import type { LayerState } from "../../types/audio";
import styles from "./LayerControl.module.css";

interface LayerControlProps {
  layer: LayerState;
  onChange: (layer: LayerState) => void;
}

const LAYER_LABELS: Record<string, string> = {
  pad: "Pad",
  bass: "Bass",
  melody: "Melody",
  lead: "Lead",
  arp: "Arp",
  percussion: "Perc",
};

const LAYER_ICONS: Record<string, string> = {
  pad: "~",
  bass: "_",
  melody: "^",
  lead: "/",
  arp: "...",
  percussion: "x",
};

export function LayerControl({ layer, onChange }: LayerControlProps) {
  const toggle = () => onChange({ ...layer, active: !layer.active });

  return (
    <div
      className={`${styles.layer} ${layer.active ? styles.active : ""}`}
      style={{ "--accent": layer.color } as React.CSSProperties}
    >
      <button className={styles.toggle} onClick={toggle}>
        <span className={styles.icon}>{LAYER_ICONS[layer.kind]}</span>
        <span className={styles.label}>{LAYER_LABELS[layer.kind]}</span>
      </button>

      {layer.active && (
        <div className={styles.controls}>
          <label className={styles.knob}>
            <span className={styles.knobLabel}>vol</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={layer.volume}
              onChange={(e) => onChange({ ...layer, volume: Number(e.target.value) })}
            />
          </label>
          <label className={styles.knob}>
            <span className={styles.knobLabel}>density</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={layer.density}
              onChange={(e) => onChange({ ...layer, density: Number(e.target.value) })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
