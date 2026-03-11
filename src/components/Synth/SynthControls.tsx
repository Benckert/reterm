import { type SynthParams, type OscillatorType, PRESETS } from "../../types/audio";
import styles from "./SynthControls.module.css";

interface SynthControlsProps {
  params: SynthParams;
  onChange: (params: SynthParams) => void;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
}

const WAVEFORMS: OscillatorType[] = ["sine", "square", "sawtooth", "triangle"];

const WAVEFORM_LABELS: Record<OscillatorType, string> = {
  sine: "Sine ∿",
  square: "Square ⊓",
  sawtooth: "Saw ⩘",
  triangle: "Tri △",
};

export function SynthControls({
  params,
  onChange,
  isPlaying,
  onPlay,
  onStop,
}: SynthControlsProps) {
  const update = (partial: Partial<SynthParams>) => {
    onChange({ ...params, ...partial });
  };

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Presets</h3>
        <div className={styles.presets}>
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              className={styles.presetBtn}
              onClick={() => onChange(preset.params)}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Waveform</h3>
        <div className={styles.waveformGroup}>
          {WAVEFORMS.map((wf) => (
            <button
              key={wf}
              className={`${styles.waveformBtn} ${params.waveform === wf ? styles.active : ""}`}
              onClick={() => update({ waveform: wf })}
            >
              {WAVEFORM_LABELS[wf]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Parameters</h3>

        <label className={styles.slider}>
          <span>Frequency: {params.frequency} Hz</span>
          <input
            type="range"
            min={20}
            max={2000}
            step={1}
            value={params.frequency}
            onChange={(e) => update({ frequency: Number(e.target.value) })}
          />
        </label>

        <label className={styles.slider}>
          <span>Volume: {params.volume} dB</span>
          <input
            type="range"
            min={-60}
            max={0}
            step={1}
            value={params.volume}
            onChange={(e) => update({ volume: Number(e.target.value) })}
          />
        </label>

        <label className={styles.slider}>
          <span>Attack: {params.attack.toFixed(2)}s</span>
          <input
            type="range"
            min={0.01}
            max={2}
            step={0.01}
            value={params.attack}
            onChange={(e) => update({ attack: Number(e.target.value) })}
          />
        </label>

        <label className={styles.slider}>
          <span>Release: {params.release.toFixed(2)}s</span>
          <input
            type="range"
            min={0.01}
            max={3}
            step={0.01}
            value={params.release}
            onChange={(e) => update({ release: Number(e.target.value) })}
          />
        </label>
      </div>

      <button
        className={`${styles.playBtn} ${isPlaying ? styles.playing : ""}`}
        onClick={isPlaying ? onStop : onPlay}
      >
        {isPlaying ? "Stop" : "Play"}
      </button>
    </div>
  );
}
