/** Original instrument bank. Pitched sounds share A minor / C major. */
export const BPM = 124;
export const STEP_SECONDS = 60 / BPM / 4;
export const KEYS = "qwertyuiopasdfghjklzxcvbnm123456";
export type Voice =
  | "pluck"
  | "bell"
  | "bass"
  | "chord"
  | "kick"
  | "clap"
  | "hat"
  | "openhat"
  | "tom"
  | "rim"
  | "laser"
  | "shimmer";
const pitched = ["A3", "C4", "D4", "E4", "G4", "A4", "C5", "E5"];
export const CHORDS = [
  ["A3", "C4", "E4"],
  ["A3", "C4", "F4"],
  ["G3", "C4", "E4"],
  ["G3", "B3", "E4"],
];
const names = [
  "Orbit",
  "Ripple",
  "Prism",
  "Ribbon",
  "Bloom",
  "Halo",
  "Lattice",
  "Comet",
  "Glass",
  "Starlight",
  "Crystal",
  "Dew",
  "Aurora",
  "Glimmer",
  "Moon",
  "Chime",
  "Low tide",
  "Undertow",
  "Gravity",
  "Pulse",
  "Velvet",
  "Dawn",
  "Cloud",
  "Dusk",
  "Kick",
  "Clap",
  "Closed hat",
  "Open hat",
  "Tom",
  "Rim",
  "Laser",
  "Shimmer",
];
export const PADS = [...KEYS].map((key, index) => {
  const voice: Voice =
    index < 8
      ? "pluck"
      : index < 16
        ? "bell"
        : index < 20
          ? "bass"
          : index < 24
            ? "chord"
            : (
                [
                  "kick",
                  "clap",
                  "hat",
                  "openhat",
                  "tom",
                  "rim",
                  "laser",
                  "shimmer",
                ] as const
              )[index - 24];
  const note =
    index < 8
      ? pitched[index]
      : index < 16
        ? pitched[index - 8].replace(/\d$/, (n) => String(Number(n) + 1))
        : ["A1", "C2", "D2", "E2"][index % 4];
  return {
    key,
    index,
    label: names[index],
    voice,
    note,
    motif: index % 8,
    color: index % 5,
  };
});
export type Pad = (typeof PADS)[number];
export const padAt = (x: number, y: number) =>
  Math.min(3, Math.max(0, Math.floor(y * 4))) * 8 +
  Math.min(7, Math.max(0, Math.floor(x * 8)));
export const padPosition = (index: number) => ({
  x: ((index % 8) + 0.5) / 8,
  y: (Math.floor(index / 8) + 0.5) / 4,
});

/** No event queue: allow chords of up to 8 hits, then 32 hits/s sustained.
 * Same-pad debounce also bounds pointer storms. Times are monotonic seconds. */
export class PerformanceGate {
  private tokens = 8;
  private previous = 0;
  private pads = new Map<number, number>();
  accept(index: number, now: number) {
    this.tokens = Math.min(
      8,
      this.tokens + Math.max(0, now - this.previous) * 32,
    );
    this.previous = now;
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= PADS.length ||
      this.tokens < 1 ||
      now - (this.pads.get(index) ?? -Infinity) < 0.045
    )
      return false;
    this.tokens--;
    this.pads.set(index, now);
    return true;
  }
}

export function noteTime(now: number, origin: number, snap: boolean) {
  const earliest = now + 0.012;
  return snap
    ? origin +
        Math.max(0, Math.ceil((earliest - origin) / STEP_SECONDS)) *
          STEP_SECONDS
    : earliest;
}
