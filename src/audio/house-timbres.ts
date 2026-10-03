import type { GenreId } from "./house-genres";

/** Manual voices, not just backing loops, change with the selected genre. */
interface Timbre {
  lead: "triangle" | "sawtooth" | "sine" | "square";
  bass: "triangle" | "sine" | "sawtooth";
  cutoff: number;
  bassCutoff: number;
  decay: number;
  length: number;
  harmonicity: number;
  modulation: number;
  noise: "pink" | "white" | "brown";
  percussionDecay: number;
  hatCutoff: number;
  kickOctaves: number;
  tom: string;
  laserEnd: number;
}
export const TIMBRES: Record<GenreId, Timbre> = {
  house: {
    lead: "triangle",
    bass: "sawtooth",
    cutoff: 6500,
    bassCutoff: 650,
    decay: 0.18,
    length: 0.09,
    harmonicity: 3.01,
    modulation: 1.6,
    noise: "pink",
    percussionDecay: 0.12,
    hatCutoff: 6800,
    kickOctaves: 5,
    tom: "A2",
    laserEnd: 110,
  },
  "dub-techno": {
    lead: "sawtooth",
    bass: "sine",
    cutoff: 1400,
    bassCutoff: 280,
    decay: 0.32,
    length: 0.17,
    harmonicity: 1.5,
    modulation: 0.6,
    noise: "brown",
    percussionDecay: 0.19,
    hatCutoff: 4200,
    kickOctaves: 3,
    tom: "A1",
    laserEnd: 55,
  },
  "bossa-nova": {
    lead: "sine",
    bass: "triangle",
    cutoff: 4200,
    bassCutoff: 900,
    decay: 0.38,
    length: 0.12,
    harmonicity: 2,
    modulation: 0.35,
    noise: "pink",
    percussionDecay: 0.045,
    hatCutoff: 8500,
    kickOctaves: 1.5,
    tom: "E3",
    laserEnd: 440,
  },
  "liquid-funk": {
    lead: "square",
    bass: "sine",
    cutoff: 3000,
    bassCutoff: 440,
    decay: 0.24,
    length: 0.21,
    harmonicity: 4,
    modulation: 2.8,
    noise: "white",
    percussionDecay: 0.085,
    hatCutoff: 5700,
    kickOctaves: 6,
    tom: "D2",
    laserEnd: 880,
  },
};
