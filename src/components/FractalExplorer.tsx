import { useCallback, useEffect, useId, useRef, useState } from "react";
import "../styles/fractal.css";

type Mode = "mandelbrot" | "julia";
type Viewport = { centerX: number; centerY: number; scale: number };
type WorkerResponse = {
  id: number;
  width: number;
  height: number;
  pixels: ArrayBuffer;
};

const defaults: Record<Mode, Viewport> = {
  mandelbrot: { centerX: -0.5, centerY: 0, scale: 3.2 },
  julia: { centerX: 0, centerY: 0, scale: 3.2 },
};

export default function FractalExplorer() {
  const [mode, setMode] = useState<Mode>("mandelbrot");
  const [viewport, setViewport] = useState<Viewport>(defaults.mandelbrot);
  const [iterations, setIterations] = useState(140);
  const [juliaReal, setJuliaReal] = useState(-0.8);
  const [juliaImaginary, setJuliaImaginary] = useState(0.156);
  const [dimensions, setDimensions] = useState({ width: 720, height: 450 });
  const [status, setStatus] = useState("Preparing renderer");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const drag = useRef<{ x: number; y: number; viewport: Viewport } | null>(
    null,
  );
  const controlId = useId();

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/fractal.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== requestId.current) return;
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      canvas.width = event.data.width;
      canvas.height = event.data.height;
      const image = new ImageData(
        new Uint8ClampedArray(event.data.pixels),
        event.data.width,
        event.data.height,
      );
      context.putImageData(image, 0, 0);
      setStatus("Render complete");
    };
    worker.onerror = () => setStatus("The renderer encountered an error");
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const cssWidth = Math.max(280, Math.min(entry.contentRect.width, 1000));
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.round(cssWidth * pixelRatio);
      setDimensions({ width, height: Math.round(width * 0.625) });
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!workerRef.current) return;
      requestId.current += 1;
      setStatus("Computing fractal");
      workerRef.current.postMessage({
        id: requestId.current,
        ...dimensions,
        mode,
        ...viewport,
        maxIterations: iterations,
        juliaReal,
        juliaImaginary,
      });
    }, 90);
    return () => window.clearTimeout(timeout);
  }, [dimensions, iterations, juliaImaginary, juliaReal, mode, viewport]);

  const zoom = useCallback((factor: number) => {
    setViewport((current) => ({
      ...current,
      scale: Math.min(8, Math.max(0.0005, current.scale * factor)),
    }));
  }, []);

  const pan = useCallback((horizontal: number, vertical: number) => {
    setViewport((current) => ({
      ...current,
      centerX: current.centerX + current.scale * horizontal,
      centerY: current.centerY + current.scale * vertical,
    }));
  }, []);

  const changeMode = (next: Mode) => {
    setMode(next);
    setViewport(defaults[next]);
  };

  const reset = () => {
    setMode("mandelbrot");
    setViewport(defaults.mandelbrot);
    setIterations(140);
    setJuliaReal(-0.8);
    setJuliaImaginary(0.156);
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${mode}-fractal.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <section
      className="fractal-explorer"
      aria-labelledby={`${controlId}-title`}
    >
      <h2 className="sr-only" id={`${controlId}-title`}>
        Fractal controls and canvas
      </h2>
      <div className="fractal-controls quiet-card">
        <label>
          <span>Fractal mode</span>
          <select
            value={mode}
            onChange={(event) => changeMode(event.target.value as Mode)}
          >
            <option value="mandelbrot">Mandelbrot</option>
            <option value="julia">Julia</option>
          </select>
        </label>
        <label>
          <span>Maximum iterations: {iterations}</span>
          <input
            type="range"
            min="40"
            max="360"
            step="20"
            value={iterations}
            onChange={(event) => setIterations(Number(event.target.value))}
          />
        </label>
        <label>
          <span>Julia real parameter</span>
          <input
            type="number"
            min="-2"
            max="2"
            step="0.001"
            value={juliaReal}
            disabled={mode !== "julia"}
            onChange={(event) => setJuliaReal(Number(event.target.value))}
          />
        </label>
        <label>
          <span>Julia imaginary parameter</span>
          <input
            type="number"
            min="-2"
            max="2"
            step="0.001"
            value={juliaImaginary}
            disabled={mode !== "julia"}
            onChange={(event) => setJuliaImaginary(Number(event.target.value))}
          />
        </label>
        <div className="fractal-actions" aria-label="Fractal actions">
          <button
            className="button"
            type="button"
            onClick={() => zoom(0.75)}
            aria-label="Zoom in"
          >
            Zoom in
          </button>
          <button
            className="button"
            type="button"
            onClick={() => zoom(1.34)}
            aria-label="Zoom out"
          >
            Zoom out
          </button>
          <button className="button" type="button" onClick={reset}>
            Reset
          </button>
          <button className="button" type="button" onClick={exportPng}>
            Export PNG
          </button>
        </div>
      </div>

      <div className="fractal-stage">
        <div
          className="fractal-frame"
          ref={frameRef}
          onWheel={(event) => {
            event.preventDefault();
            zoom(event.deltaY < 0 ? 0.82 : 1.22);
          }}
        >
          <canvas
            ref={canvasRef}
            aria-label={`${mode === "mandelbrot" ? "Mandelbrot" : "Julia"} set rendering. Drag to pan or use the adjacent keyboard controls.`}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { x: event.clientX, y: event.clientY, viewport };
            }}
            onPointerMove={(event) => {
              if (!drag.current) return;
              const width = Math.max(event.currentTarget.clientWidth, 1);
              const height = Math.max(event.currentTarget.clientHeight, 1);
              setViewport({
                ...drag.current.viewport,
                centerX:
                  drag.current.viewport.centerX -
                  ((event.clientX - drag.current.x) / width) *
                    drag.current.viewport.scale,
                centerY:
                  drag.current.viewport.centerY -
                  ((event.clientY - drag.current.y) / height) *
                    drag.current.viewport.scale *
                    (height / width),
              });
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          />
          <p className="fractal-status" role="status" aria-live="polite">
            {status}
          </p>
        </div>
        <div className="pan-controls" aria-label="Pan fractal viewport">
          <button
            type="button"
            onClick={() => pan(0, -0.12)}
            aria-label="Pan up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => pan(-0.12, 0)}
            aria-label="Pan left"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => pan(0.12, 0)}
            aria-label="Pan right"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => pan(0, 0.12)}
            aria-label="Pan down"
          >
            ↓
          </button>
        </div>
      </div>

      <dl className="viewport-readout" aria-label="Current viewport">
        <div>
          <dt>Center x</dt>
          <dd>{viewport.centerX.toFixed(6)}</dd>
        </div>
        <div>
          <dt>Center y</dt>
          <dd>{viewport.centerY.toFixed(6)}</dd>
        </div>
        <div>
          <dt>Width</dt>
          <dd>{viewport.scale.toPrecision(6)}</dd>
        </div>
        <div>
          <dt>Canvas</dt>
          <dd>
            {dimensions.width} × {dimensions.height}
          </dd>
        </div>
      </dl>
    </section>
  );
}
