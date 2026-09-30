// The public barrel creates legacy singleton contexts on import. The pinned
// classes entry is inert: only an explicit Start gesture may create a context.
import * as Tone from "tone/build/esm/classes.js";
import { setContext } from "tone/build/esm/core/Global.js";
import {
  BPM,
  HouseSequencer,
  STEP_SECONDS,
  type HouseFrame,
  type Pad,
} from "./house-patterns";

/** Imported only by the /play island. Each session owns its context and clock. */
export class HouseEngine {
  readonly sequencer = new HouseSequencer();
  private context: Tone.Context;
  private nodes: { dispose(): unknown }[] = [];
  private output: Tone.Gain;
  private filter: Tone.Filter;
  private delay: Tone.FeedbackDelay;
  private meter: Tone.Meter;
  private dead = false;
  private started = false;
  private repeat: number;

  constructor(
    volume: number,
    onFrame: (frame: HouseFrame, level: number) => void,
  ) {
    const context = (this.context = new Tone.Context({
      latencyHint: "interactive",
      lookAhead: 0.04,
      updateInterval: 0.02,
    }));
    // Tone's constructor defaults read getContext(), even with explicit context.
    // Reuse our owned session rather than allocating an unused second context.
    setContext(context);
    // Register immediately, so partial setup can also be torn down on an error.
    const own = <T extends { dispose(): unknown }>(node: T): T => {
      this.nodes.push(node);
      return node;
    };
    try {
      const bus = own(new Tone.Gain({ context, gain: 0.7 }));
      const duck = own(new Tone.Gain({ context, gain: 1 })).connect(bus);
      this.filter = own(
        new Tone.Filter({ context, frequency: 6500, type: "lowpass", Q: 0.5 }),
      ).connect(bus);
      this.delay = own(
        new Tone.FeedbackDelay({
          context,
          delayTime: STEP_SECONDS * 3,
          feedback: 0.18,
          wet: 0.16,
        }),
      ).connect(this.filter);
      const compressor = own(
        new Tone.Compressor({
          context,
          threshold: -18,
          ratio: 3,
          attack: 0.008,
          release: 0.16,
        }),
      );
      const limiter = own(new Tone.Limiter({ context, threshold: -3 }));
      this.output = own(
        new Tone.Gain({ context, gain: Math.min(0.85, Math.max(0, volume)) }),
      );
      bus.chain(compressor, limiter, this.output, context.destination);
      this.meter = own(
        new Tone.Meter({ context, normalRange: true, smoothing: 0.5 }),
      );
      this.output.connect(this.meter);
      const kick = own(
        new Tone.MembraneSynth({
          context,
          volume: -10,
          pitchDecay: 0.035,
          octaves: 5,
          envelope: { attack: 0.002, decay: 0.23, sustain: 0, release: 0.08 },
        }),
      ).connect(bus);
      const clap = own(
        new Tone.NoiseSynth({
          context,
          volume: -24,
          noise: { type: "pink" },
          envelope: { attack: 0.001, decay: 0.11, sustain: 0, release: 0.02 },
        }),
      ).connect(bus);
      const hatFilter = own(
        new Tone.Filter({ context, frequency: 7000, type: "highpass" }),
      ).connect(bus);
      const hat = own(
        new Tone.NoiseSynth({
          context,
          volume: -27,
          noise: { type: "white" },
          envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
        }),
      ).connect(hatFilter);
      const bass = own(
        new Tone.Synth({
          context,
          volume: -15,
          oscillator: { type: "triangle" },
          envelope: {
            attack: 0.005,
            decay: 0.12,
            sustain: 0.25,
            release: 0.08,
          },
        }),
      ).connect(duck);
      const chords = own(
        new Tone.PolySynth({
          context,
          voice: Tone.Synth,
          maxPolyphony: 8,
          volume: -24,
          options: {
            oscillator: { type: "triangle" },
            envelope: {
              attack: 0.02,
              decay: 0.14,
              sustain: 0.25,
              release: 0.15,
            },
          },
        }),
      ).connect(duck);
      const lead = own(
        new Tone.FMSynth({
          context,
          volume: -20,
          harmonicity: 2,
          modulationIndex: 1.2,
          envelope: { attack: 0.003, decay: 0.16, sustain: 0, release: 0.16 },
          modulationEnvelope: {
            attack: 0.002,
            decay: 0.08,
            sustain: 0,
            release: 0.1,
          },
        }),
      ).connect(this.delay);
      context.transport.bpm.value = BPM;
      context.transport.timeSignature = 4;
      let step = 0;
      this.repeat = context.transport.scheduleRepeat(
        (time) => {
          if (this.dead) return;
          const frame = this.sequencer.tick(step++);
          if (frame.kick) {
            kick.triggerAttackRelease("C1", 0.1, time, 0.9);
            duck.gain.setValueAtTime(0.48, time);
            duck.gain.linearRampToValueAtTime(1, time + 0.17);
          }
          if (frame.clap) clap.triggerAttackRelease(0.035, time, 0.65);
          if (frame.hat)
            hat.triggerAttackRelease(0.016, time, frame.fill ? 0.35 : 0.55);
          if (frame.bass)
            bass.triggerAttackRelease(
              frame.harmony.root,
              STEP_SECONDS * 0.8,
              time,
              0.8,
            );
          if (frame.chord)
            chords.triggerAttackRelease(
              [...frame.harmony.notes],
              STEP_SECONDS * (frame.mix.chords === 0 ? 2.2 : 0.65),
              time,
              0.5,
            );
          if (frame.melody)
            lead.triggerAttackRelease(
              frame.melody,
              STEP_SECONDS * 0.6,
              time,
              0.5,
            );
          context.draw.schedule(() => {
            if (!this.dead) onFrame(frame, Number(this.meter.getValue()));
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
    // resume() runs synchronously from the gesture before its promise is awaited.
    await this.context.resume();
    if (this.dead || this.started) return;
    if (this.context.state !== "running")
      throw new Error("Audio context did not resume");
    this.started = true;
    this.context.transport.start(this.context.now() + 0.04);
  }
  press(pad: Pad) {
    if (!this.dead) this.sequencer.press(pad);
  }
  setVolume(value: number) {
    if (!this.dead)
      this.output.gain.rampTo(Math.min(0.85, Math.max(0, value)), 0.04);
  }
  setColor(value: number) {
    if (this.dead) return;
    this.filter.frequency.rampTo(600 + value * 8400, 0.08);
    this.delay.wet.rampTo(0.05 + value * 0.22, 0.08);
  }
  dispose() {
    if (this.dead) return;
    this.dead = true;
    this.context.transport.stop();
    if (this.repeat !== undefined) this.context.transport.clear(this.repeat);
    this.context.transport.cancel(0);
    this.context.draw.cancel(0);
    // Disconnect immediately, including scheduled notes and delay tails.
    for (const node of [...this.nodes].reverse()) node.dispose();
    this.nodes = [];
    this.context.dispose();
  }
}
