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
  private expiry?: ReturnType<typeof setTimeout>;
  private observer: ResizeObserver;
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  private gate = new PerformanceGate();
  private colors: string[];
  private background: string;
  private grid: string;
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
    this.grid = style.getPropertyValue("--color-play-grid").trim();
    this.observer = new ResizeObserver(() => this.resize());
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
    this.canvas.width = Math.max(1, Math.round(this.width * this.ratio));
    this.canvas.height = Math.max(1, Math.round(this.height * this.ratio));
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
    this.bursts = this.bursts.slice(this.motion.matches ? -2 : -28);
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
    c.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    c.globalAlpha = 1;
    c.fillStyle = this.background;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = this.grid;
    c.lineWidth = 1;
    for (let col = 1; col < 8; col++) {
      c.beginPath();
      c.moveTo((col * w) / 8, 0);
      c.lineTo((col * w) / 8, h);
      c.stroke();
    }
    for (let row = 1; row < 4; row++) {
      c.beginPath();
      c.moveTo(0, (row * h) / 4);
      c.lineTo(w, (row * h) / 4);
      c.stroke();
    }
    // Quiet, static orbital mark: the stage never runs an idle animation loop.
    c.save();
    c.translate(w / 2, h / 2);
    c.strokeStyle = this.colors[0];
    c.globalAlpha = 0.13;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.ellipse(
        0,
        0,
        Math.min(w, h) * 0.32,
        Math.min(w, h) * (0.09 + i * 0.035),
        (i * Math.PI) / 3,
        0,
        Math.PI * 2,
      );
      c.stroke();
    }
    c.restore();
    for (const burst of this.bursts) {
      const pad = PADS[burst.index];
      const progress = this.motion.matches
        ? 0.25
        : Math.min(1, Math.max(0, (now - burst.born) / 1600));
      const ease = 1 - (1 - progress) ** 3;
      const radius = Math.min(w, h) * (0.035 + ease * 0.26);
      c.save();
      c.translate(burst.x * w, burst.y * h);
      c.rotate(
        burst.angle +
          (this.motion.matches ? 0 : progress * (burst.index % 2 ? -1 : 1)),
      );
      c.strokeStyle = c.fillStyle = this.colors[pad.color];
      c.globalAlpha = (1 - progress) ** 1.4 * 0.72;
      c.lineWidth = 1.5 + (1 - progress) * 2;
      switch (pad.motif) {
        case 0: // Interference rings.
          for (let i = 1; i <= 4; i++) {
            c.beginPath();
            c.arc(0, 0, (radius * i) / 4, 0, Math.PI * 2);
            c.stroke();
          }
          break;
        case 1: // Rotating nested triangles.
          for (let i = 0; i < 4; i++)
            this.polygon(3, radius * (1 - i * 0.19), i * 0.3);
          break;
        case 2: // A starburst of broken rays.
          for (let i = 0; i < 18; i++) {
            c.rotate(Math.PI / 9);
            c.beginPath();
            c.moveTo(radius * 0.45, 0);
            c.lineTo(radius, 0);
            c.stroke();
          }
          break;
        case 3: // Woven sine ribbons.
          for (let j = 0; j < 4; j++) {
            c.beginPath();
            for (let i = 0; i <= 40; i++) {
              const x = (i / 20 - 1) * radius;
              const y =
                Math.sin(i / 6 + progress * 5 + j) * radius * 0.3 + j * 8;
              if (!i) c.moveTo(x, y);
              else c.lineTo(x, y);
            }
            c.stroke();
          }
          break;
        case 4: // Dotted orbital flower.
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            c.beginPath();
            c.arc(
              Math.cos(a) * radius,
              Math.sin(a) * radius,
              2 + (1 - progress) * 5,
              0,
              Math.PI * 2,
            );
            c.fill();
          }
          this.polygon(6, radius * 0.65);
          break;
        case 5: // Offset arcs / a sliced halo.
          for (let i = 0; i < 5; i++) {
            c.beginPath();
            c.arc(
              0,
              0,
              radius * (0.4 + i * 0.15),
              i * 0.4,
              Math.PI * 1.45 + i * 0.4,
            );
            c.stroke();
          }
          break;
        case 6: // Expanding diamond lattice.
          for (let i = -2; i <= 2; i++)
            for (let j = -2; j <= 2; j++) {
              c.save();
              c.translate(i * radius * 0.4, j * radius * 0.4);
              this.polygon(4, radius * 0.18);
              c.restore();
            }
          break;
        case 7: // Fan of comet trails.
          for (let i = 0; i < 9; i++) {
            const y = (i - 4) * 11;
            c.beginPath();
            c.moveTo(-radius * 0.6, y);
            c.lineTo(radius * (1 - Math.abs(i - 4) * 0.12), y);
            c.stroke();
            c.beginPath();
            c.arc(radius * (1 - Math.abs(i - 4) * 0.12), y, 3, 0, Math.PI * 2);
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
    this.observer.disconnect();
    this.motion.removeEventListener("change", this.motionChange);
  }
}
