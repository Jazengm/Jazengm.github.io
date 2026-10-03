/** Original, genre-inspired presets; all pitched parts share A minor / C major. */
import { BPM, CHORDS } from "./house-patterns";
export type GenreId = "house" | "dub-techno" | "bossa-nova" | "liquid-funk";
export type BeatAccent = "kick" | "snare" | "chord" | null;
export interface Genre {
  id: GenreId;
  label: string;
  bpm: number;
  description: string;
  kick: number[];
  snare: number[];
  ghost: number[];
  hat: number[];
  bass: number[];
  stab: number[];
  chords: string[][];
  roots: string[];
  fifths: string[];
  echo: number;
  feedback: number;
  cutoff: number;
  release: number;
  colors: number[];
}

const roots = ["A1", "F1", "C2", "E2"];
const fifths = ["E2", "C2", "G2", "B2"];
const sevenths = [
  ["A3", "C4", "E4", "G4"],
  ["A3", "C4", "E4", "F4"],
  ["G3", "B3", "C4", "E4"],
  ["G3", "B3", "D4", "E4"],
];
export const GENRES: Record<GenreId, Genre> = {
  house: {
    id: "house",
    label: "House",
    bpm: BPM,
    description: "Four-on-the-floor drums, bright plucks, expanding geometry.",
    kick: [0, 4, 8, 12, 16, 20, 24, 28],
    snare: [4, 12, 20, 28],
    ghost: [],
    hat: [2, 6, 10, 14, 18, 22, 26, 30],
    bass: [2, 6, 10, 14, 18, 22, 26, 30],
    stab: [0, 10, 16, 26],
    chords: CHORDS,
    roots,
    fifths,
    echo: 0.2,
    feedback: 0.22,
    cutoff: 2600,
    release: 0.16,
    colors: [0, 1, 2, 3, 4],
  },
  "dub-techno": {
    id: "dub-techno",
    label: "Dub techno",
    bpm: 118,
    description: "Deep kicks, filtered chord echoes, slow concentric orbits.",
    kick: [0, 4, 8, 12, 16, 20, 24, 28],
    snare: [12, 28],
    ghost: [],
    hat: [2, 6, 10, 14, 18, 22, 26, 30],
    bass: [0, 10, 16, 26],
    stab: [2, 11, 18, 27],
    chords: sevenths,
    roots,
    fifths,
    echo: 0.38,
    feedback: 0.48,
    cutoff: 1000,
    release: 0.36,
    colors: [0, 2, 3, 0, 2],
  },
  "bossa-nova": {
    id: "bossa-nova",
    label: "Bossa nova",
    bpm: 132,
    description:
      "Soft percussion, syncopated seventh chords, warm swaying arcs.",
    kick: [0, 6, 8, 14, 16, 22, 24, 30],
    snare: [0, 6, 12, 18, 24],
    ghost: [],
    hat: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30],
    bass: [0, 6, 8, 14, 16, 22, 24, 30],
    stab: [0, 6, 12, 18, 24, 30],
    chords: sevenths,
    roots,
    fifths,
    echo: 0.07,
    feedback: 0.1,
    cutoff: 3400,
    release: 0.14,
    colors: [1, 4, 1, 2, 4],
  },
  "liquid-funk": {
    id: "liquid-funk",
    label: "Liquid funk",
    bpm: 172,
    description:
      "Rolling breakbeats, soft sustained chords, cool flowing ribbons.",
    kick: [0, 6, 10, 16, 22, 26],
    snare: [4, 12, 20, 28],
    ghost: [11, 27],
    hat: Array.from({ length: 32 }, (_, i) => i),
    bass: [0, 6, 10, 16, 22, 26, 30],
    stab: [0, 16],
    chords: sevenths,
    roots,
    fifths,
    echo: 0.22,
    feedback: 0.28,
    cutoff: 2100,
    release: 0.7,
    colors: [2, 3, 0, 2, 3],
  },
};
export const DEFAULT_GENRE: GenreId = "house";
export const isGenre = (value: string): value is GenreId =>
  value in GENRES && Object.hasOwn(GENRES, value);
export const stepSeconds = (genre: GenreId) => 60 / GENRES[genre].bpm / 4;

/** A repeating two-bar rhythm with a four-bar harmonic progression. */
export function backingAt(genre: GenreId, absoluteStep: number) {
  const preset = GENRES[genre];
  const step = absoluteStep % 32;
  const bar = Math.floor(absoluteStep / 16) % preset.chords.length;
  const kick = preset.kick.includes(step);
  const snare = preset.snare.includes(step);
  const chord = preset.stab.includes(step) ? preset.chords[bar] : null;
  return {
    kick,
    snare,
    ghost: preset.ghost.includes(step),
    hat: preset.hat.includes(step),
    chord,
    bass: preset.bass.includes(step)
      ? genre === "bossa-nova" && step % 8 >= 6
        ? preset.fifths[bar]
        : preset.roots[bar]
      : null,
    accent: (kick
      ? "kick"
      : snare
        ? "snare"
        : chord
          ? "chord"
          : null) as BeatAccent,
  };
}
