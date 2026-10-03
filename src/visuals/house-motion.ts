import type { GenreId } from "../audio/house-genres";

// Distinct visual vocabulary; random choices happen once per hit, never per frame.
export const MOTION = {
  house: {
    motifs: [0, 1, 2, 5, 6, 8],
    duration: 1400,
    spin: 1.1,
    backgrounds: [0, 1, 3],
  },
  "dub-techno": {
    motifs: [0, 4, 6, 9],
    duration: 2100,
    spin: 0.4,
    backgrounds: [0, 2, 3],
  },
  "bossa-nova": {
    motifs: [4, 8, 10, 11],
    duration: 1700,
    spin: 0.65,
    backgrounds: [1, 4, 2],
  },
  "liquid-funk": {
    motifs: [3, 7, 9, 12],
    duration: 1150,
    spin: 1.5,
    backgrounds: [2, 3, 0],
  },
} satisfies Record<
  GenreId,
  { motifs: number[]; duration: number; spin: number; backgrounds: number[] }
>;

export function chooseMotion(
  genre: GenreId,
  index: number,
  serial: number,
  random = Math.random,
) {
  const preset = MOTION[genre];
  return {
    motif: preset.motifs[(index + serial) % preset.motifs.length],
    angle: random() * Math.PI * 2,
    spin: preset.spin * (random() < 0.5 ? -1 : 1),
    scale: 0.85 + random() * 0.3,
    color: (index + Math.floor(random() * 5)) % 5,
    seed: random() * Math.PI * 2,
    duration: preset.duration * (0.9 + random() * 0.2),
  };
}
