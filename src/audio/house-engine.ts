// This pinned entry does not create Tone's legacy global AudioContext on import.
import * as Tone from "tone/build/esm/classes.js";
import { setContext } from "tone/build/esm/core/Global.js";
import {
  BPM,
  PADS,
  PerformanceGate,
  STEP_SECONDS,
  noteTime,
  masterGain,
} from "./house-patterns";
import {
  GENRES,
  DEFAULT_GENRE,
  backingAt,
  stepSeconds,
  type GenreId,
  type BeatAccent,
} from "./house-genres";

export type AudioFrame = {
  step: number;
  level: number;
  genre: GenreId;
  accent: BeatAccent;
};
export class HouseEngine {
  private context: Tone.Context;
  private nodes: { dispose(): unknown }[] = [];
  private output!: Tone.Gain;
  private delay!: Tone.FeedbackDelay;
  private plucks!: Tone.PolySynth<Tone.Synth>;
  private bells!: Tone.PolySynth<Tone.FMSynth>;
  private chords!: Tone.PolySynth<Tone.Synth>;
  private bass!: Tone.PolySynth<Tone.Synth>;
  private kick!: Tone.MembraneSynth;
  private tom!: Tone.MembraneSynth;
  private clap!: Tone.NoiseSynth;
  private hat!: Tone.NoiseSynth;
  private openhat!: Tone.NoiseSynth;
  private laser!: Tone.Synth;
  private meter!: Tone.Meter;
  private dead = false;
  private started = false;
  private repeat?: number;
  private origin = 0;
  private groove = true;
  private genre: GenreId = DEFAULT_GENRE;
  private pendingGenre: GenreId | null = null;
  private color = 0.5;
  private gate = new PerformanceGate();
  private scheduled = new Map<string, number>();
  private backing!: Tone.Gain;
  // Separate backing instruments prevent manual hits from colliding with
  // an already look-ahead-scheduled note on a monophonic synth.
  private backingKick!: Tone.MembraneSynth;
  private backingHat!: Tone.NoiseSynth;
  private backingBass!: Tone.Synth;
  private backingSnare!: Tone.NoiseSynth;
  private backingRim!: Tone.Synth;
  private backingChords!: Tone.PolySynth<Tone.Synth>;
  private backingDelay!: Tone.FeedbackDelay;
  private chordFilter!: Tone.Filter;

  constructor(volume: number, onFrame: (frame: AudioFrame) => void) {
    const context = (this.context = new Tone.Context({
      latencyHint: "interactive",
      lookAhead: 0.04,
      updateInterval: 0.02,
    }));
    setContext(context);
    const own = <T extends { dispose(): unknown }>(node: T) => {
      this.nodes.push(node);
      return node;
    };
    try {
      const bus = own(new Tone.Gain({ context, gain: 0.65 }));
      this.delay = own(
        new Tone.FeedbackDelay({
          context,
          delayTime: STEP_SECONDS * 3,
          feedback: 0.22,
          wet: 0.2,
        }),
      ).connect(bus);
      const compressor = own(
        new Tone.Compressor({
          context,
          threshold: -18,
          ratio: 3,
          attack: 0.006,
          release: 0.15,
        }),
      );
      const limiter = own(new Tone.Limiter({ context, threshold: -3 }));
      this.output = own(new Tone.Gain({ context, gain: masterGain(volume) }));
      // Gain goes before the final limiter so boosted peaks remain bounded.
      bus.chain(compressor, this.output, limiter, context.destination);
      this.meter = own(
        new Tone.Meter({ context, normalRange: true, smoothing: 0.4 }),
      );
      limiter.connect(this.meter);
      this.plucks = own(
        new Tone.PolySynth({
          context,
          voice: Tone.Synth,
          maxPolyphony: 12,
          volume: -17,
          options: {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.003, decay: 0.16, sustain: 0, release: 0.09 },
          },
        }),
      ).connect(this.delay);
      this.bells = own(
        new Tone.PolySynth({
          context,
          voice: Tone.FMSynth,
          maxPolyphony: 12,
          volume: -22,
          options: {
            harmonicity: 3.01,
            modulationIndex: 1.6,
            envelope: { attack: 0.002, decay: 0.23, sustain: 0, release: 0.13 },
            modulationEnvelope: {
              attack: 0.002,
              decay: 0.13,
              sustain: 0,
              release: 0.08,
            },
          },
        }),
      ).connect(this.delay);
      this.chords = own(
        new Tone.PolySynth({
          context,
          voice: Tone.Synth,
          maxPolyphony: 18,
          volume: -26,
          options: {
            oscillator: { type: "triangle" },
            envelope: {
              attack: 0.02,
              decay: 0.1,
              sustain: 0.25,
              release: 0.16,
            },
          },
        }),
      ).connect(this.delay);
      this.bass = own(
        new Tone.PolySynth({
          context,
          voice: Tone.Synth,
          maxPolyphony: 4,
          volume: -18,
          options: {
            oscillator: { type: "fatsawtooth", count: 2, spread: 8 },
            envelope: { attack: 0.006, decay: 0.1, sustain: 0, release: 0.06 },
          },
        }),
      );
      const lowpass = own(
        new Tone.Filter({ context, frequency: 520, type: "lowpass" }),
      ).connect(bus);
      this.bass.connect(lowpass);
      this.kick = own(
        new Tone.MembraneSynth({
          context,
          volume: -12,
          pitchDecay: 0.035,
          octaves: 5,
          envelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.06 },
        }),
      ).connect(bus);
      this.tom = own(
        new Tone.MembraneSynth({
          context,
          volume: -18,
          pitchDecay: 0.07,
          octaves: 2,
          envelope: { attack: 0.003, decay: 0.16, sustain: 0, release: 0.06 },
        }),
      ).connect(bus);
      this.clap = own(
        new Tone.NoiseSynth({
          context,
          volume: -25,
          noise: { type: "pink" },
          envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.02 },
        }),
      ).connect(bus);
      const highpass = own(
        new Tone.Filter({ context, frequency: 6800, type: "highpass" }),
      ).connect(bus);
      this.hat = own(
        new Tone.NoiseSynth({
          context,
          volume: -29,
          noise: { type: "white" },
          envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.01 },
        }),
      ).connect(highpass);
      this.openhat = own(
        new Tone.NoiseSynth({
          context,
          volume: -30,
          noise: { type: "white" },
          envelope: { attack: 0.002, decay: 0.18, sustain: 0, release: 0.07 },
        }),
      ).connect(highpass);
      this.laser = own(
        new Tone.Synth({
          context,
          volume: -23,
          oscillator: { type: "sine" },
          envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.04 },
        }),
      ).connect(this.delay);
      this.backing = own(new Tone.Gain({ context, gain: 1 })).connect(bus);
      this.backingKick = own(
        new Tone.MembraneSynth({
          context,
          volume: -18,
          pitchDecay: 0.035,
          octaves: 5,
          envelope: { attack: 0.002, decay: 0.19, sustain: 0, release: 0.06 },
        }),
      ).connect(this.backing);
      this.backingHat = own(
        new Tone.NoiseSynth({
          context,
          volume: -34,
          noise: { type: "white" },
          envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.01 },
        }),
      );
      const backingHighpass = own(
        new Tone.Filter({ context, frequency: 7200, type: "highpass" }),
      ).connect(this.backing);
      this.backingHat.connect(backingHighpass);
      this.backingBass = own(
        new Tone.Synth({
          context,
          volume: -24,
          oscillator: { type: "triangle" },
          envelope: { attack: 0.004, decay: 0.1, sustain: 0.1, release: 0.05 },
        }),
      ).connect(this.backing);
      this.backingSnare = own(
        new Tone.NoiseSynth({
          context,
          volume: -27,
          noise: { type: "pink" },
          envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.02 },
        }),
      ).connect(this.backing);
      this.backingRim = own(
        new Tone.Synth({
          context,
          volume: -28,
          oscillator: { type: "triangle" },
          envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.015 },
        }),
      ).connect(this.backing);
      this.chordFilter = own(
        new Tone.Filter({ context, type: "lowpass", frequency: 2600 }),
      ).connect(this.backing);
      this.backingDelay = own(
        new Tone.FeedbackDelay({
          context,
          delayTime: STEP_SECONDS * 3,
          feedback: 0.22,
          wet: 0.2,
        }),
      ).connect(this.chordFilter);
      this.backingChords = own(
        new Tone.PolySynth({
          context,
          voice: Tone.Synth,
          maxPolyphony: 16,
          volume: -30,
          options: {
            oscillator: { type: "triangle" },
            envelope: {
              attack: 0.012,
              decay: 0.16,
              sustain: 0.15,
              release: 0.16,
            },
          },
        }),
      ).connect(this.backingDelay);
      context.transport.bpm.value = BPM;
      context.transport.timeSignature = 4;
      let step = 0;
      this.repeat = context.transport.scheduleRepeat(
        (time) => {
          if (this.dead) return;
          const absoluteStep = step++;
          const current = absoluteStep % 16;
          if (current === 0 && this.pendingGenre) {
            this.applyGenre(this.pendingGenre, time);
            this.pendingGenre = null;
            this.origin = time;
          }
          const genre = this.genre;
          const pattern = backingAt(genre, absoluteStep);
          const bossa = genre === "bossa-nova";
          const liquid = genre === "liquid-funk";
          if (this.groove) {
            if (pattern.kick)
              this.backingKick.triggerAttackRelease(
                "C1",
                0.09,
                time,
                bossa ? 0.42 : 0.7,
              );
            if (pattern.hat)
              this.backingHat.triggerAttackRelease(
                0.018,
                time,
                bossa ? 0.28 : absoluteStep % 2 ? 0.23 : 0.45,
              );
            if (pattern.snare || pattern.ghost) {
              if (bossa)
                this.backingRim.triggerAttackRelease("E5", 0.025, time, 0.6);
              else
                this.backingSnare.triggerAttackRelease(
                  0.04,
                  time,
                  pattern.ghost ? 0.22 : liquid ? 0.85 : 0.5,
                );
            }
            if (pattern.bass)
              this.backingBass.triggerAttackRelease(
                pattern.bass,
                liquid ? 0.19 : bossa ? 0.14 : 0.1,
                time,
                0.65,
              );
            if (pattern.chord)
              this.backingChords.triggerAttackRelease(
                pattern.chord,
                liquid ? stepSeconds(genre) * 10 : bossa ? 0.1 : 0.15,
                time,
                0.6,
              );
          }
          const accent = this.groove ? pattern.accent : null;
          context.draw.schedule(() => {
            if (!this.dead)
              onFrame({
                step: current,
                level: Number(this.meter.getValue()),
                genre,
                accent: this.groove ? accent : null,
              });
          }, time);
        },
        "16n",
        0,
      );
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  async start() {
    await this.context.resume();
    if (this.dead || this.started) return;
    if (this.context.state !== "running")
      throw new Error("Audio context did not resume");
    this.started = true;
    this.origin = this.context.now() + 0.025;
    this.context.transport.start(this.origin);
  }
  trigger(index: number, snap = false) {
    if (this.dead || !this.started) return false;
    const now = this.context.immediate();
    if (!this.gate.accept(index, now)) return false;
    const pad = PADS[index];
    const time = noteTime(now, this.origin, snap, stepSeconds(this.genre));
    // Drop duplicate quantized hits rather than queueing a storm into the future.
    const slot =
      pad.voice +
      ":" +
      (pad.voice === "pluck" || pad.voice === "bell" ? pad.note : "");
    if (time <= (this.scheduled.get(slot) ?? -Infinity) + 0.001) return false;
    this.scheduled.set(slot, time);
    switch (pad.voice) {
      case "pluck":
        this.plucks.triggerAttackRelease(pad.note, 0.08, time, 0.8);
        break;
      case "bell":
        this.bells.triggerAttackRelease(pad.note, 0.11, time, 0.65);
        break;
      case "bass":
        this.bass.triggerAttackRelease(pad.note, 0.09, time, 0.65);
        break;
      case "chord":
        this.chords.triggerAttackRelease(
          GENRES[this.genre].chords[index - 20],
          0.16,
          time,
          0.55,
        );
        break;
      case "kick":
        this.kick.triggerAttackRelease("C1", 0.09, time, 0.85);
        break;
      case "clap":
        this.clap.triggerAttackRelease(0.04, time, 0.7);
        break;
      case "hat":
        this.hat.triggerAttackRelease(0.015, time, 0.65);
        break;
      case "openhat":
        this.openhat.triggerAttackRelease(0.13, time, 0.6);
        break;
      case "tom":
        this.tom.triggerAttackRelease("A2", 0.09, time, 0.7);
        break;
      case "rim":
        this.plucks.triggerAttackRelease("E6", 0.015, time, 0.45);
        break;
      case "laser":
        this.laser.triggerAttackRelease("A5", 0.14, time, 0.6);
        this.laser.frequency.exponentialRampToValueAtTime(110, time + 0.15);
        break;
      case "shimmer":
        this.bells.triggerAttackRelease(["A5", "E6"], 0.16, time, 0.45);
        break;
    }
    return true;
  }
  setGroove(value: boolean) {
    this.groove = value;
    if (!this.dead) this.backing.gain.rampTo(value ? 1 : 0, 0.03);
  }
  setGenre(value: GenreId) {
    if (this.dead) return;
    if (!this.started) this.applyGenre(value, this.context.now());
    else this.pendingGenre = value === this.genre ? null : value;
  }
  private applyGenre(value: GenreId, time: number) {
    this.genre = value;
    const preset = GENRES[value];
    this.context.transport.bpm.setValueAtTime(preset.bpm, time);
    this.chordFilter.frequency.rampTo(preset.cutoff, 0.08, time);
    for (const delay of [this.delay, this.backingDelay]) {
      delay.delayTime.rampTo(stepSeconds(value) * 3, 0.08, time);
      delay.feedback.rampTo(preset.feedback, 0.08, time);
      delay.wet.rampTo(
        Math.min(0.55, this.color * 2 * preset.echo),
        0.08,
        time,
      );
    }
    const soft = value === "bossa-nova";
    const liquid = value === "liquid-funk";
    this.backingBass.set({
      oscillator: { type: soft || liquid ? "sine" : "triangle" },
    });
    for (const voice of [this.chords, this.backingChords])
      voice.set({
        oscillator: { type: soft ? "triangle" : "sine" },
        envelope: {
          attack: liquid ? 0.08 : 0.006,
          decay: soft ? 0.2 : 0.12,
          sustain: liquid ? 0.45 : 0.12,
          release: preset.release,
        },
      });
    this.plucks.set({
      envelope: { decay: soft ? 0.28 : value === "dub-techno" ? 0.24 : 0.16 },
    });
  }
  setVolume(value: number) {
    if (!this.dead) this.output.gain.rampTo(masterGain(value), 0.025);
  }
  setColor(value: number) {
    this.color = Math.min(1, Math.max(0, value));
    if (!this.dead)
      for (const delay of [this.delay, this.backingDelay])
        delay.wet.rampTo(
          Math.min(0.55, this.color * 2 * GENRES[this.genre].echo),
          0.04,
        );
  }
  dispose() {
    if (this.dead) return;
    this.dead = true;
    this.context.transport.stop();
    if (this.repeat !== undefined) this.context.transport.clear(this.repeat);
    this.context.transport.cancel(0);
    this.context.draw.cancel(0);
    for (const node of [...this.nodes].reverse()) node.dispose();
    this.nodes = [];
    this.context.dispose();
  }
}
