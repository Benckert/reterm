export type ScaleName =
  | "major"
  | "minor"
  | "dorian"
  | "pentatonic"
  | "minorPentatonic"
  | "mixolydian"
  | "phrygian";

export type RootNote = "C" | "D" | "E" | "F" | "G" | "A" | "B";

// Semitone intervals from root for each scale
const SCALE_INTERVALS: Record<ScaleName, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  pentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

const ROOT_SEMITONES: Record<RootNote, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

// Convert MIDI note number to frequency
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Convert MIDI note to note name (e.g. 60 -> "C4")
function midiToName(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  const note = names[midi % 12];
  return `${note}${octave}`;
}

export interface ScaleNote {
  midi: number;
  freq: number;
  name: string;
}

// Generate all notes in a scale across a given octave range
export function getScaleNotes(
  root: RootNote,
  scale: ScaleName,
  octaveLow: number,
  octaveHigh: number,
): ScaleNote[] {
  const intervals = SCALE_INTERVALS[scale];
  const rootSemitone = ROOT_SEMITONES[root];
  const notes: ScaleNote[] = [];

  for (let octave = octaveLow; octave <= octaveHigh; octave++) {
    for (const interval of intervals) {
      const midi = (octave + 1) * 12 + rootSemitone + interval;
      notes.push({
        midi,
        freq: midiToFreq(midi),
        name: midiToName(midi),
      });
    }
  }

  return notes;
}

// Pick a random note from scale within an octave range
export function randomScaleNote(
  root: RootNote,
  scale: ScaleName,
  octaveLow: number,
  octaveHigh: number,
): ScaleNote {
  const notes = getScaleNotes(root, scale, octaveLow, octaveHigh);
  return notes[Math.floor(Math.random() * notes.length)];
}

// Pick note biased toward certain scale degrees (e.g. root, 3rd, 5th)
export function weightedScaleNote(
  root: RootNote,
  scale: ScaleName,
  octaveLow: number,
  octaveHigh: number,
  weights?: number[],
): ScaleNote {
  const intervals = SCALE_INTERVALS[scale];
  const defaultWeights = intervals.map((_, i) =>
    i === 0 ? 3 : i === 2 ? 2 : i === 4 ? 2 : 1,
  );
  const w = weights ?? defaultWeights;

  const allNotes = getScaleNotes(root, scale, octaveLow, octaveHigh);
  const totalWeight = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;

  const degreeIndex = w.findIndex((weight) => {
    r -= weight;
    return r <= 0;
  });

  // Filter notes that match this scale degree
  const matching = allNotes.filter(
    (_, i) => i % intervals.length === degreeIndex,
  );

  return matching[Math.floor(Math.random() * matching.length)];
}
