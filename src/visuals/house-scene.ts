import { PADS, PerformanceGate } from "../audio/house-patterns";

type Burst = {
  index: number;
  x: number;
  y: number;
  born: number;
  angle: number;
};
/** Original Canvas 2D geometry; no image assets or per-hit DOM nodes. */
export class HouseScene {
  private ctx: CanvasRenderingContext2D;
  private bursts: Burst[] = [];
  private frame = 0;
  private resizeFrame = 0;
  private expiry?: ReturnType<typeof setTimeout>;
  private observer: ResizeObserver;
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  private gate = new PerformanceGate();
  private colors: string[];
  private background: string;
  private width = 1;
  private height = 1;
  private ratio = 1;
  private dead = false;
  private enabled = true;
  private serial = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas unavailable");
    this.ctx = context;
    const style = getComputedStyle(canvas);
    this.colors = ["blue", "orange", "cyan", "violet", "gold"].map((name) =>
      style.getPropertyValue("--color-play-" + name).trim(),
    );
    this.background = style.getPropertyValue("--color-play-bg").trim();
    // Writing canvas dimensions inside ResizeObserver can trigger a same-frame
    // feedback warning during fullscreen transitions. Coalesce into the next frame.
    this.observer = new ResizeObserver(() => {
      if (!this.resizeFrame)
        this.resizeFrame = requestAnimationFrame(() => {
          this.resizeFrame = 0;
          if (!this.dead) this.resize();
        });
    });
    this.observer.observe(canvas);
    this.motion.addEventListener("change", this.motionChange);
    this.resize();
  }
  private motionChange = () => this.clear();
  private resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, bounds.width);
    this.height = Math.max(1, bounds.height);
    // Bound backing-store area even in fullscreen on high-DPI displays.
    this.ratio = Math.min(
      devicePixelRatio || 1,
      1.75,
      Math.sqrt(2_500_000 / (this.width * this.height)),
    );
    const pixelWidth = Math.max(1, Math.round(this.width * this.ratio));
    const pixelHeight = Math.max(1, Math.round(this.height * this.ratio));
    if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
    if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;
    this.paint(performance.now());
  }
  burst(index: number, x: number, y: number) {
    if (
      this.dead ||
      !this.enabled ||
      !this.gate.accept(index, performance.now() / 1000)
    )
      return;
    const burst = {
      index,
      x,
      y,
      born: performance.now(),
      angle: (++this.serial * 0.618 + index) % (Math.PI * 2),
    };
    this.bursts.push(burst);
    this.bursts = this.bursts.slice(this.motion.matches ? -2 : -8);
    if (this.motion.matches) {
      this.paint(performance.now());
      clearTimeout(this.expiry);
      this.expiry = setTimeout(() => this.clear(), 700);
    } else if (!this.frame) this.frame = requestAnimationFrame(this.animate);
  }
  private animate = (now: number) => {
    this.frame = 0;
    if (this.dead) return;
    this.bursts = this.bursts.filter((burst) => now - burst.born < 1600);
    this.paint(now);
    if (this.bursts.length) this.frame = requestAnimationFrame(this.animate);
  };
  private polygon(sides: number, radius: number, angle = 0) {
    const c = this.ctx;
    c.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = angle + (i / sides) * Math.PI * 2;
      if (i === 0) c.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
      else c.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    }
    c.stroke();
  }
  private paint(now: number) {
    const c = this.ctx,
      w = this.width,
      h = this.height;
    const diagonal = Math.hypot(w, h);
    c.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    c.globalAlpha = 1;
    c.fillStyle = this.background;
    c.fillRect(0, 0, w, h);
    // Intentionally no grid, ticks or idle ornament. The sound map is invisible.
    for (const burst of this.bursts) {
      const pad = PADS[burst.index];
      const still = this.motion.matches;
      const progress = still
        ? 0.3
        : Math.min(1, Math.max(0, (now - burst.born) / 1600));
      const ease = 1 - (1 - progress) ** 2;
      const radius = still
        ? Math.min(w, h) * 0.22
        : diagonal * (0.06 + ease * 0.92);
      const span = still ? radius : diagonal;
      // Compose across the whole stage instead of drawing small stamps in cells.
      const x = still ? burst.x * w : (0.5 + (burst.x - 0.5) * 0.25) * w;
      const y = still ? burst.y * h : (0.5 + (burst.y - 0.5) * 0.25) * h;
      c.save();
      c.translate(x, y);
      c.rotate(
        burst.angle * 0.25 +
          (still ? 0 : ease * (burst.index % 2 ? -0.65 : 0.65)),
      );
      c.strokeStyle = c.fillStyle = this.colors[pad.color];
      const envelope = still
        ? 0.55
        : Math.min(1, progress / 0.09) * (1 - progress) ** 1.25 * 0.85;
      c.globalAlpha = envelope;
      c.lineWidth = Math.max(2, Math.min(w, h) * 0.005) * (1 - progress * 0.5);
      switch (pad.motif) {
        case 0: // Ripples sweep from the center all the way through the edges.
          for (let i = 1; i <= 5; i++) {
            c.beginPath();
            c.arc(0, 0, (radius * i) / 5, 0, Math.PI * 2);
            c.stroke();
          }
          break;
        case 1: // A rotating triangular portal, with a translucent leading face.
          for (let i = 0; i < 5; i++) {
            this.polygon(3, radius * (1 - i * 0.17), i * 0.19 + ease * 0.4);
            if (i === 0) {
              c.globalAlpha = envelope * 0.08;
              c.fill();
              c.globalAlpha = envelope;
            }
          }
          break;
        case 2: // Full-stage radial fan with long rays and a growing central halo.
          for (let i = 0; i < 24; i++) {
            c.rotate(Math.PI / 12);
            c.beginPath();
            c.moveTo(radius * 0.12, 0);
            c.lineTo(span, 0);
            c.stroke();
          }
          this.polygon(12, radius * 0.17);
          break;
        case 3: // Wide flowing ribbons crossing the entire stage.
          for (let j = -3; j <= 3; j++) {
            c.beginPath();
            for (let i = 0; i <= 64; i++) {
              const px = (i / 32 - 1) * span;
              const py =
                Math.sin(i / 10 + ease * 6 + j * 0.28) * radius * 0.26 +
                j * span * 0.045;
              if (i === 0) c.moveTo(px, py);
              else c.lineTo(px, py);
            }
            c.stroke();
          }
          break;
        case 4: // An iris of large sweeping arcs and orbiting satellites.
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3 + ease;
            c.lineWidth = Math.max(3, radius * 0.024);
            c.beginPath();
            c.arc(0, 0, radius * 0.55, a, a + 0.7);
            c.stroke();
            c.beginPath();
            c.arc(
              Math.cos(a) * radius * 0.7,
              Math.sin(a) * radius * 0.7,
              Math.max(2, radius * 0.018),
              0,
              Math.PI * 2,
            );
            c.fill();
          }
          break;
        case 5: // Broad diagonal bands travel from one edge to the other.
          for (let i = -2; i <= 2; i++) {
            const py = (ease * 1.6 - 0.8) * span + i * span * 0.22;
            c.globalAlpha = envelope * 0.18;
            c.fillRect(-span, py, span * 2, span * 0.055);
            c.globalAlpha = envelope;
            c.beginPath();
            c.moveTo(-span, py);
            c.lineTo(span, py);
            c.stroke();
          }
          break;
        case 6: // Kaleidoscopic diamonds, no lattice or tiled grid.
          for (let i = 0; i < 7; i++) {
            this.polygon(4, radius * (1 - i * 0.125), i * 0.13 - ease * 0.3);
          }
          break;
        case 7: // A widescreen meteor shower, not short local dashes.
          for (let i = -5; i <= 5; i++) {
            const py = i * span * 0.09;
            const head = (((ease * 2 + i * 0.11) % 2) - 1) * span;
            c.beginPath();
            c.moveTo(head - span * 0.55, py);
            c.lineTo(head, py);
            c.stroke();
            c.beginPath();
            c.arc(head, py, Math.max(2, span * 0.004), 0, Math.PI * 2);
            c.fill();
          }
          break;
      }
      c.restore();
    }
    this.canvas.dataset.activeShapes = String(this.bursts.length);
    this.canvas.dataset.frames = String(
      Number(this.canvas.dataset.frames ?? 0) + 1,
    );
    this.canvas.dataset.reducedMotion = String(this.motion.matches);
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.clear();
  }
  clear() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    clearTimeout(this.expiry);
    this.bursts = [];
    if (!this.dead) this.paint(performance.now());
  }
  dispose() {
    this.clear();
    this.dead = true;
    cancelAnimationFrame(this.resizeFrame);
    this.observer.disconnect();
    this.motion.removeEventListener("change", this.motionChange);
  }
}
