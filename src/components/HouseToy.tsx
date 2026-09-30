import { useEffect, useRef, useState } from "react";
import { localize, useLocale } from "../i18n/react";
import {
  DEFAULT_MIX,
  HARMONY,
  PADS,
  type HouseFrame,
  type Mix,
  type Pad,
} from "../audio/house-patterns";
import type { HouseEngine } from "../audio/house-engine";
import "../styles/house.css";

export default function HouseToy() {
  const locale = useLocale();
  const module = useRef<typeof import("../audio/house-engine") | null>(null);
  const engine = useRef<HouseEngine | null>(null);
  const generation = useRef(0);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Loading audio controls");
  const [playing, setPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [color, setColor] = useState(0.7);
  const [mix, setMix] = useState<Mix>({ ...DEFAULT_MIX });
  const [pending, setPending] = useState<Mix | null>(null);
  const [frame, setFrame] = useState<HouseFrame | null>(null);
  const [level, setLevel] = useState(0);
  const [flash, setFlash] = useState({ key: "", serial: 0 });

  function stop() {
    generation.current++;
    engine.current?.dispose();
    engine.current = null;
    setPlaying(false);
    setStarting(false);
    setPending(null);
    setMix({ ...DEFAULT_MIX });
    setFrame(null);
    setLevel(0);
    setStatus("Stopped · press Start to play");
  }

  useEffect(() => {
    let mounted = true;
    // Browser-only split point: no AudioContext is created until Start is pressed.
    import("../audio/house-engine")
      .then((loaded) => {
        if (!mounted) return;
        module.current = loaded;
        setReady(true);
        setStatus("Ready · start quietly");
      })
      .catch(() => {
        if (mounted)
          setStatus("Audio could not load. Reload the page to retry.");
      });
    const hidden = () => {
      if (document.hidden) stop();
    };
    const leave = () => stop();
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", leave);
    return () => {
      mounted = false;
      generation.current++;
      engine.current?.dispose();
      engine.current = null;
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", leave);
    };
  }, []);

  async function start() {
    if (!module.current || engine.current) return;
    const session = ++generation.current;
    setStarting(true);
    setStatus("Starting audio");
    try {
      const next = new module.current.HouseEngine(volume, (nextFrame, rms) => {
        if (generation.current !== session) return;
        setFrame(nextFrame);
        setMix(nextFrame.mix);
        setLevel(Number.isFinite(rms) ? rms : 0);
        if (nextFrame.step === 0)
          setPending(engine.current?.sequencer.pending ?? null);
      });
      engine.current = next;
      next.setColor(color);
      await next.start();
      if (generation.current !== session) {
        next.dispose();
        return;
      }
      setPlaying(true);
      setStarting(false);
      setStatus("Playing · make it yours");
    } catch {
      if (generation.current !== session) return;
      stop();
      setStatus(
        "Audio is unavailable. Try Start again or use another browser.",
      );
    }
  }

  function press(pad: Pad) {
    if (!playing || !engine.current) return;
    engine.current.press(pad);
    setPending(
      engine.current.sequencer.pending
        ? { ...engine.current.sequencer.pending }
        : null,
    );
    setFlash((old) => ({ key: pad.key, serial: old.serial + 1 }));
  }

  return localize(
    <section
      className="house-toy quiet-card"
      aria-label="House music toy"
      tabIndex={0}
      data-playing={playing}
      data-step={frame?.step ?? -1}
      data-bar={frame?.bar ?? -1}
      data-level={level}
      onKeyDown={(event) => {
        if (event.ctrlKey || event.metaKey || event.altKey || event.repeat)
          return;
        if (
          (event.target as HTMLElement).closest(
            "input, select, textarea, [contenteditable=true]",
          )
        )
          return;
        if (event.key === "Escape") {
          event.preventDefault();
          stop();
          return;
        }
        const pad = PADS.find((pad) => pad.key === event.key.toLowerCase());
        if (pad && playing) {
          event.preventDefault();
          press(pad);
        }
      }}
    >
      <div className="house-topline">
        <span className="eyebrow">POCKET HOUSE</span>
        <span translate="no">124 BPM · 4/4 · A minor</span>
      </div>
      <div className="house-transport">
        <button
          className="button button-primary"
          type="button"
          disabled={!ready || playing || starting}
          onClick={start}
        >
          Start
        </button>
        <button
          className="button"
          type="button"
          disabled={!playing && !starting}
          onClick={stop}
        >
          Stop
        </button>
        <button
          className="button"
          type="button"
          onClick={() => {
            stop();
            setVolume(0.5);
            setColor(0.7);
            setFlash({ key: "", serial: 0 });
          }}
        >
          Reset
        </button>
        <p className="house-status" role="status">
          {status}
        </p>
      </div>
      <div className="house-now">
        <div className="house-beats" aria-hidden="true">
          {[0, 1, 2, 3].map((beat) => (
            <span
              key={beat}
              data-active={
                playing && Math.floor((frame?.step ?? -1) / 4) === beat
              }
            >
              {beat + 1}
            </span>
          ))}
        </div>
        <span className="house-chord" translate="no">
          {frame?.harmony.name ?? HARMONY[0].name}
        </span>
        <span className="house-queue" data-pending={Boolean(pending)}>
          {pending ? "Queued · next bar" : "All layers in sync"}
        </span>
      </div>
      <p className="house-help" id="house-help">
        Start first, then tap freely. Layer changes wait for the next bar. J / K
        melodies snap to the beat; up to four notes per bar.
      </p>
      <div className="house-pads" aria-describedby="house-help">
        {PADS.map((pad) => {
          const selected = "layer" in pad && mix[pad.layer] === pad.value;
          const queued =
            "layer" in pad && pending?.[pad.layer] === pad.value && !selected;
          return (
            <button
              key={pad.key}
              type="button"
              className="house-pad"
              data-pad={pad.key}
              data-selected={selected}
              data-queued={queued}
              disabled={!playing}
              aria-pressed={"layer" in pad ? selected : undefined}
              aria-keyshortcuts={pad.key.toUpperCase()}
              onClick={() => press(pad)}
            >
              <kbd>{pad.key.toUpperCase()}</kbd>
              <strong>{pad.label}</strong>
              <span>{pad.detail}</span>
              {queued && <small>Next bar</small>}
              {flash.key === pad.key && (
                <i
                  key={flash.serial}
                  className="house-pad-flash"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="house-sliders">
        <label className="control-field">
          <span>Volume</span>
          <input
            aria-label="Volume"
            type="range"
            min="0"
            max="85"
            value={Math.round(volume * 100)}
            onChange={(event) => {
              const value = Number(event.target.value) / 100;
              setVolume(value);
              engine.current?.setVolume(value);
            }}
          />
          <output>{Math.round(volume * 100)}%</output>
        </label>
        <label className="control-field">
          <span>Color / echo</span>
          <input
            aria-label="Color / echo"
            type="range"
            min="0"
            max="100"
            value={Math.round(color * 100)}
            onChange={(event) => {
              const value = Number(event.target.value) / 100;
              setColor(value);
              engine.current?.setColor(value);
            }}
          />
          <output>{Math.round(color * 100)}%</output>
        </label>
      </div>
      <p className="house-help">
        Use the printed keys while this toy has focus. Escape stops playback.
        Sliders also work with arrow keys. Switching tabs stops the music;
        returning never auto-plays.
      </p>
      <p className="house-help">
        All sounds are synthesized here. No microphone, downloads, samples, or
        AI service. Keep your device volume low when starting.
      </p>
    </section>,
    locale,
  );
}
