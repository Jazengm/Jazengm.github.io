// This pinned entry does not create Tone's legacy global AudioContext on import.
import * as Tone from "tone/build/esm/classes.js";
import { setContext } from "tone/build/esm/core/Global.js";
import {
  BPM,
  CHORDS,
  PADS,
  PerformanceGate,
  STEP_SECONDS,
  noteTime,
  masterGain,
} from "./house-patterns";

export type AudioFrame = { step: number; level: number };
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
  private gate = new PerformanceGate();
  private scheduled = new Map<string, number>();
  private backing!: Tone.Gain;
  // Separate backing instruments prevent manual hits from colliding with
  // an already look-ahead-scheduled note on a monophonic synth.
  private backingKick!: Tone.MembraneSynth;
  private backingHat!: Tone.NoiseSynth;
  private backingBass!: Tone.Synth;

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
      context.transport.bpm.value = BPM;
      context.transport.timeSignature = 4;
      let step = 0;
      this.repeat = context.transport.scheduleRepeat(
        (time) => {
          const current = step++ % 16;
          if (this.dead) return;
          if (this.groove) {
            if (current % 4 === 0)
              this.backingKick.triggerAttackRelease("C1", 0.09, time, 0.7);
            if (current % 4 === 2) {
              this.backingHat.triggerAttackRelease(0.018, time, 0.5);
              this.backingBass.triggerAttackRelease(
                current === 14 ? "E2" : "A1",
                0.085,
                time,
                0.7,
              );
            }
          }
          context.draw.schedule(() => {
            if (!this.dead)
              onFrame({ step: current, level: Number(this.meter.getValue()) });
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
    const time = noteTime(now, this.origin, snap);
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
        this.chords.triggerAttackRelease(CHORDS[index - 20], 0.16, time, 0.55);
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
  setVolume(value: number) {
    if (!this.dead) this.output.gain.rampTo(masterGain(value), 0.025);
  }
  setColor(value: number) {
    if (!this.dead)
      this.delay.wet.rampTo(Math.min(0.4, Math.max(0, value * 0.4)), 0.04);
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
