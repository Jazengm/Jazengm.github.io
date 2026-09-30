import { useEffect, useRef, useState, type PointerEvent } from "react";
import { localize, useLocale } from "../i18n/react";
import { KEYS, PADS, padAt, padPosition } from "../audio/house-patterns";
import { HouseScene } from "../visuals/house-scene";
import type { HouseEngine } from "../audio/house-engine";
import "../styles/house.css";

export default function HouseToy() {
  const locale = useLocale();
  const module = useRef<typeof import("../audio/house-engine") | null>(null);
  const engine = useRef<HouseEngine | null>(null);
  const scene = useRef<HouseScene | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const pointers = useRef(new Map<number, number>());
  const generation = useRef(0);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Loading audio controls");
  const [playing, setPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [color, setColor] = useState(0.5);
  const [groove, setGroove] = useState(true);
  const [snap, setSnap] = useState(false);
  const [visuals, setVisuals] = useState(true);
  const [visualError, setVisualError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [step, setStep] = useState(-1);
  const [level, setLevel] = useState(0);
  const [last, setLast] = useState<number | null>(null);
  const [hits, setHits] = useState(0);

  function stop() {
    generation.current++;
    engine.current?.dispose();
    engine.current = null;
    pointers.current.clear();
    scene.current?.clear();
    setPlaying(false);
    setStarting(false);
    setStep(-1);
    setLevel(0);
    setLast(null);
    setStatus("Stopped · press Start to play");
  }
  useEffect(() => {
    let mounted = true;
    try {
      if (canvas.current) scene.current = new HouseScene(canvas.current);
    } catch {
      setVisualError(true);
    }
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
    const resized = () =>
      setFullscreen(document.fullscreenElement === root.current);
    setCanFullscreen(
      Boolean(document.fullscreenEnabled && root.current?.requestFullscreen),
    );
    document.addEventListener("visibilitychange", hidden);
    document.addEventListener("fullscreenchange", resized);
    window.addEventListener("pagehide", leave);
    return () => {
      mounted = false;
      generation.current++;
      engine.current?.dispose();
      engine.current = null;
      scene.current?.dispose();
      scene.current = null;
      pointers.current.clear();
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("fullscreenchange", resized);
      window.removeEventListener("pagehide", leave);
    };
  }, []);

  async function start() {
    if (!module.current || engine.current) return;
    const session = ++generation.current;
    setStarting(true);
    setStatus("Starting audio");
    try {
      const next = new module.current.HouseEngine(volume, (frame) => {
        if (generation.current !== session) return;
        setStep(frame.step);
        setLevel(Number.isFinite(frame.level) ? frame.level : 0);
      });
      engine.current = next;
      next.setColor(color);
      next.setGroove(groove);
      await next.start();
      if (generation.current !== session) {
        next.dispose();
        return;
      }
      setPlaying(true);
      setStarting(false);
      setStatus("Playing · make it yours");
      stage.current?.focus({ preventScroll: true });
    } catch {
      if (generation.current !== session) return;
      stop();
      setStatus(
        "Audio is unavailable. Try Start again or use another browser.",
      );
    }
  }
  function fire(index: number, x?: number, y?: number) {
    if (!playing || !engine.current) return;
    const position = padPosition(index);
    scene.current?.burst(index, x ?? position.x, y ?? position.y);
    if (engine.current.trigger(index, snap)) {
      setLast(index);
      setHits((value) => value + 1);
    }
  }
  function pointer(event: PointerEvent<HTMLDivElement>, initial: boolean) {
    if (
      !playing ||
      (event.pointerType === "mouse" && event.button !== 0 && initial)
    )
      return;
    if (!initial && !pointers.current.has(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(
      0.999,
      Math.max(0, (event.clientX - rect.left) / rect.width),
    );
    const y = Math.min(
      0.999,
      Math.max(0, (event.clientY - rect.top) / rect.height),
    );
    const index = padAt(x, y);
    if (initial) {
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus({ preventScroll: true });
    }
    if (initial || pointers.current.get(event.pointerId) !== index)
      fire(index, x, y);
    pointers.current.set(event.pointerId, index);
    event.preventDefault();
  }
  function toggleGroove() {
    const next = !groove;
    setGroove(next);
    engine.current?.setGroove(next);
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === root.current)
        await document.exitFullscreen();
      else await root.current?.requestFullscreen();
    } catch {
      setStatus("Fullscreen is unavailable in this browser.");
    }
  }

  return localize(
    <section
      ref={root}
      className="house-toy"
      aria-label="House music toy"
      data-playing={playing}
      data-step={step}
      data-level={level}
      data-hits={hits}
      data-last-key={last === null ? "" : PADS[last].key}
      onKeyDown={(event) => {
        if (
          event.repeat ||
          event.nativeEvent.isComposing ||
          event.ctrlKey ||
          event.altKey ||
          event.metaKey
        )
          return;
        if (
          (event.target as HTMLElement).closest(
            "input, textarea, select, [contenteditable=true]",
          )
        )
          return;
        if (event.key === "Escape") {
          stop();
          return;
        }
        if (event.key === " " && event.target === stage.current) {
          event.preventDefault();
          toggleGroove();
          return;
        }
        const index = KEYS.indexOf(event.key.toLowerCase());
        if (event.key.length === 1 && index >= 0 && playing) {
          event.preventDefault();
          fire(index);
        }
      }}
    >
      <div className="house-toolbar">
        <div className="house-transport">
          <button
            type="button"
            className="button"
            disabled={!ready || playing || starting}
            onClick={start}
          >
            Start
          </button>
          <button
            type="button"
            className="button"
            disabled={!playing && !starting}
            onClick={stop}
          >
            Stop
          </button>
          <button
            type="button"
            className="button"
            onClick={() => {
              stop();
              setVolume(0.5);
              setColor(0.5);
              setGroove(true);
              setSnap(false);
              setVisuals(true);
              scene.current?.setEnabled(true);
              setHits(0);
            }}
          >
            Reset
          </button>
        </div>
        <div className="house-options">
          <button
            type="button"
            className="button"
            aria-pressed={groove}
            onClick={toggleGroove}
          >
            Backtrack
          </button>
          <button
            type="button"
            className="button"
            aria-pressed={snap}
            onClick={() => setSnap(!snap)}
          >
            Snap to beat
          </button>
          <button
            type="button"
            className="button"
            aria-pressed={visuals}
            disabled={visualError}
            onClick={() => {
              setVisuals(!visuals);
              scene.current?.setEnabled(!visuals);
            }}
          >
            Visuals
          </button>
          {canFullscreen && (
            <button type="button" className="button" onClick={toggleFullscreen}>
              {fullscreen ? "Exit fullscreen" : "Fullscreen"}
            </button>
          )}
        </div>
      </div>
      <div
        ref={stage}
        className="house-stage"
        role="group"
        aria-label="Performance surface"
        aria-describedby="house-help"
        tabIndex={0}
        onPointerDown={(event) => pointer(event, true)}
        onPointerMove={(event) => pointer(event, false)}
        onPointerUp={(event) => pointers.current.delete(event.pointerId)}
        onPointerCancel={(event) => pointers.current.delete(event.pointerId)}
        onLostPointerCapture={(event) =>
          pointers.current.delete(event.pointerId)
        }
      >
        <canvas ref={canvas} aria-hidden="true" />
        <div className="house-stage-top" aria-hidden="true">
          <span>POCKET / HOUSE</span>
          <span translate="no">124 BPM · A MINOR</span>
        </div>
        {!playing && (
          <div className="house-invite">
            <p>Sound becomes shape.</p>
            <span>Press Start. Then make a little chaos.</span>
          </div>
        )}
        {playing && last === null && (
          <div className="house-invite house-invite-playing">
            <p>Your hands. Your universe.</p>
            <span>Click, drag, or play A–Z / 1–6</span>
          </div>
        )}
        <div className="house-stage-bottom" aria-hidden="true">
          <div className="house-beats">
            {[0, 1, 2, 3].map((beat) => (
              <i
                key={beat}
                data-active={playing && groove && Math.floor(step / 4) === beat}
              />
            ))}
          </div>
          <span>
            {last === null ? "32 sounds · one canvas" : PADS[last].label}
          </span>
          <kbd translate="no">
            {last === null ? "A–Z / 1–6" : PADS[last].key.toUpperCase()}
          </kbd>
        </div>
      </div>
      <div className="house-console">
        <p role="status" className="house-status">
          {status}
        </p>
        <label>
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
        <label>
          <span>Echo</span>
          <input
            aria-label="Echo"
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
      <p id="house-help" className="house-help">
        Click or drag across the canvas. Play A–Z and 1–6 while this instrument
        has focus. Space toggles the backtrack on the canvas; Escape stops
        sound. Start quietly.
      </p>
      {visualError && (
        <p role="status">
          Canvas is unavailable. The sound keys below still work.
        </p>
      )}
      <details className="house-keyboard">
        <summary>Sound keys / playing guide</summary>
        <p className="house-help">
          The canvas has 8 columns and 4 rows, in the same order as these keys.
          Notes sound immediately by default; Snap to beat aligns them to the
          next sixteenth note. Backtrack is optional.
        </p>
        <div className="house-pads">
          {PADS.map((pad) => (
            <button
              key={pad.key}
              className="house-key"
              type="button"
              data-pad={pad.key}
              data-active={last === pad.index && playing}
              disabled={!playing}
              aria-keyshortcuts={pad.key.toUpperCase()}
              onClick={() => fire(pad.index)}
            >
              <kbd translate="no">{pad.key.toUpperCase()}</kbd>
              <span>{pad.label}</span>
            </button>
          ))}
        </div>
        <p className="house-help">
          All sounds and graphics are generated here. No microphone, external
          samples, or AI. Reduced-motion mode uses still shapes; Visuals can
          turn them off. Hiding this tab or leaving the page stops playback.
        </p>
      </details>
    </section>,
    locale,
  );
}
