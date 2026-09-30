/** Original presets; A minor / C major throughout. No samples or borrowed melodies. */
export const BPM = 124;
export const STEP_SECONDS = 60 / BPM / 4;
export const DEFAULT_MIX = { drums: 0, bass: 0, chords: 0 };
export type Mix = typeof DEFAULT_MIX;
export type Layer = keyof Mix;
export const HARMONY = [
  { name: "Am7", root: "A1", notes: ["A3", "C4", "E4", "G4"] },
  { name: "Fmaj7", root: "F1", notes: ["A3", "C4", "E4", "F4"] },
  { name: "Cmaj7", root: "C2", notes: ["G3", "B3", "C4", "E4"] },
  { name: "G6", root: "G1", notes: ["G3", "B3", "D4", "E4"] },
] as const;
export const PADS = [
  {
    key: "q",
    label: "Foundation",
    detail: "Steady drums",
    layer: "drums",
    value: 0,
  },
  {
    key: "w",
    label: "Shuffle",
    detail: "Skippy hats",
    layer: "drums",
    value: 1,
  },
  {
    key: "e",
    label: "Air",
    detail: "Open-space drums",
    layer: "drums",
    value: 2,
  },
  { key: "a", label: "Round", detail: "Offbeat bass", layer: "bass", value: 0 },
  {
    key: "s",
    label: "Bounce",
    detail: "Syncopated bass",
    layer: "bass",
    value: 1,
  },
  {
    key: "d",
    label: "Velvet",
    detail: "Warm chords",
    layer: "chords",
    value: 0,
  },
  {
    key: "f",
    label: "Prism",
    detail: "Short chord stabs",
    layer: "chords",
    value: 1,
  },
  {
    key: "j",
    label: "Spark",
    detail: "Rising melody",
    action: "melody",
    value: 0,
  },
  {
    key: "k",
    label: "Glow",
    detail: "Falling melody",
    action: "melody",
    value: 1,
  },
  {
    key: "l",
    label: "Fill",
    detail: "A little drum turn",
    action: "fill",
    value: 0,
  },
  {
    key: "z",
    label: "New feeling",
    detail: "Remix the layers",
    action: "feeling",
    value: 0,
  },
] as const;
export type Pad = (typeof PADS)[number];

/** Bounded input mailbox: last selection wins; no per-click scheduling or timers. */
export class HouseSequencer {
  active: Mix = { ...DEFAULT_MIX };
  pending: Mix | null = null;
  private melody: number | null = null;
  private melodyCount = 0;
  private melodyIndex = 0;
  private fillRequested = false;
  private fillLeft = 0;
  private feeling = 0;

  press(pad: Pad) {
    if ("layer" in pad) {
      this.pending = {
        ...(this.pending ?? this.active),
        [pad.layer]: pad.value,
      };
    } else if (pad.action === "melody") this.melody = pad.value;
    else if (pad.action === "fill") this.fillRequested = true;
    else {
      this.feeling++;
      this.pending = {
        drums: this.feeling % 3,
        bass: this.feeling % 2,
        chords: Math.floor(this.feeling / 2) % 2,
      };
    }
  }

  tick(absoluteStep: number) {
    const step = absoluteStep % 16;
    const bar = Math.floor(absoluteStep / 16);
    if (step === 0) {
      if (this.pending) this.active = { ...this.pending };
      this.pending = null;
      this.melodyCount = 0;
    }
    const harmony = HARMONY[bar % HARMONY.length];
    let melody: string | null = null;
    if (this.melody !== null && this.melodyCount < 4) {
      const index = this.melodyIndex++ % 4;
      melody = harmony.notes[this.melody === 0 ? index : 3 - index].replace(
        /\d$/,
        (octave) => String(Number(octave) + 1),
      );
      this.melodyCount++;
    }
    this.melody = null;
    // At most one four-step fill per bar, independent of click density.
    if (this.fillRequested && step === 12) this.fillLeft = 4;
    if (step === 12) this.fillRequested = false;
    const fill = this.fillLeft > 0;
    if (fill) this.fillLeft--;
    const hatSteps = [
      [2, 6, 10, 14],
      [2, 3, 6, 10, 11, 14],
      [2, 10],
    ][this.active.drums];
    const bassSteps = [
      [2, 6, 10, 14],
      [0, 3, 6, 8, 11, 14],
    ][this.active.bass];
    return {
      step,
      bar,
      harmony,
      mix: { ...this.active },
      kick: step % 4 === 0,
      clap: step === 4 || step === 12,
      hat: hatSteps.includes(step) || fill,
      bass: bassSteps.includes(step),
      chord: (this.active.chords === 0 ? [0, 8] : [2, 6, 10, 14]).includes(
        step,
      ),
      melody,
      fill,
    };
  }
}
export type HouseFrame = ReturnType<HouseSequencer["tick"]>;
