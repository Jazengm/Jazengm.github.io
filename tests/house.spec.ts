import { expect, test, type Page } from "@playwright/test";
import {
  GENRES,
  backingAt,
  stepSeconds,
  isGenre,
} from "../src/audio/house-genres";
import {
  BPM,
  DEFAULT_VOLUME,
  masterGain,
  KEYS,
  PADS,
  PerformanceGate,
  STEP_SECONDS,
  noteTime,
  padAt,
  padPosition,
} from "../src/audio/house-patterns";

test("Performance rules: 32 unique sounds and complete canvas mapping", () => {
  expect(masterGain(DEFAULT_VOLUME) / 2).toBe(2);
  expect(masterGain(0.5)).toBe(2);
  expect(masterGain(0)).toBe(0);
  expect(masterGain(-1)).toBe(0);
  expect(masterGain(10)).toBe(4);
  expect(BPM).toBe(124);
  expect(KEYS.length).toBe(32);
  expect(new Set(KEYS).size).toBe(32);
  expect(new Set(PADS.map((pad) => pad.voice)).size).toBe(12);
  for (const pad of PADS) {
    expect(KEYS[pad.index]).toBe(pad.key);
    const position = padPosition(pad.index);
    expect(padAt(position.x, position.y)).toBe(pad.index);
    expect(pad.motif).toBeLessThan(8);
  }
  expect(padAt(-1, -1)).toBe(0);
  expect(padAt(1, 1)).toBe(31);
});
test("Performance rules: bounded bursts, no event backlog, and optional sixteenth grid", () => {
  const gate = new PerformanceGate();
  expect(
    Array.from({ length: 3000 }, (_, i) => gate.accept(i % 32, 10)).filter(
      Boolean,
    ),
  ).toHaveLength(8);
  expect(gate.accept(10, 10)).toBe(false);
  expect(gate.accept(10, 10.05)).toBe(true);
  expect(gate.accept(10, 10.051)).toBe(false);
  expect(gate.accept(-1, 11)).toBe(false);
  expect(gate.accept(32, 11)).toBe(false);
  for (let now = 2; now < 3; now += 0.013) {
    expect(noteTime(now, 1, false)).toBeCloseTo(now + 0.012);
    const snapped = noteTime(now, 1, true);
    expect(snapped).toBeGreaterThanOrEqual(now + 0.012 - 1e-10);
    expect(snapped - now).toBeLessThanOrEqual(STEP_SECONDS + 0.012 + 1e-10);
    expect((snapped - 1) / STEP_SECONDS).toBeCloseTo(
      Math.round((snapped - 1) / STEP_SECONDS),
    );
  }
});
type AudioWindow = Window & { __houseContexts: AudioContext[] };
async function instrumentAudio(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  // Vite may handle window errors before Playwright sees a pageerror.
  await page.exposeFunction("__recordHouseWindowError", (message: string) =>
    errors.push(message),
  );
  await page.addInitScript(() => {
    const target = window as unknown as Window &
      typeof globalThis & {
        __houseContexts: AudioContext[];
        __recordHouseWindowError: (message: string) => Promise<void>;
      };
    target.addEventListener("error", (event) => {
      void target.__recordHouseWindowError(event.message);
    });
    target.__houseContexts = [];
    target.AudioContext = new Proxy(target.AudioContext, {
      construct(Original, args) {
        const context = Reflect.construct(Original, args) as AudioContext;
        target.__houseContexts.push(context);
        const close = context.close.bind(context);
        context.close = () => {
          sessionStorage.setItem(
            "house-close-calls",
            String(Number(sessionStorage.getItem("house-close-calls")) + 1),
          );
          return close();
        };
        return context;
      },
    });
  });
  return errors;
}
const contextStates = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as AudioWindow).__houseContexts.map(
      (context) => context.state,
    ),
  );
async function openToy(page: Page) {
  await page.goto("/play/?lang=en");
  await expect(
    page.getByRole("button", { name: "Start", exact: true }),
  ).toBeEnabled();
  await expect.poll(() => contextStates(page)).toEqual([]);
}
async function startToy(page: Page) {
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator(".house-toy")).toHaveAttribute(
    "data-playing",
    "true",
  );
}
const hits = async (page: Page) =>
  Number(await page.locator(".house-toy").getAttribute("data-hits"));

test("Genre presets have distinct two-bar patterns and tempo-correct snapping", () => {
  expect(isGenre("constructor")).toBe(false);
  expect(isGenre("unknown")).toBe(false);
  expect(Object.keys(GENRES)).toEqual([
    "house",
    "dub-techno",
    "bossa-nova",
    "liquid-funk",
  ]);
  const signatures = new Set();
  for (const preset of Object.values(GENRES)) {
    expect(preset.chords).toHaveLength(4);
    for (const lane of [
      preset.kick,
      preset.hat,
      preset.snare,
      preset.bass,
      preset.stab,
      preset.ghost,
    ]) {
      expect(new Set(lane).size).toBe(lane.length);
      for (const step of lane)
        expect(Number.isInteger(step) && step >= 0 && step < 32).toBe(true);
    }
    signatures.add(JSON.stringify([preset.kick, preset.snare, preset.stab]));
    for (let i = 0; i < 64; i++) {
      const pattern = backingAt(preset.id, i);
      if (pattern.chord)
        expect(pattern.chord).toEqual(preset.chords[Math.floor(i / 16) % 4]);
      if (pattern.bass)
        expect([...preset.roots, ...preset.fifths]).toContain(pattern.bass);
      const now = 1 + i * 0.017;
      const time = noteTime(now, 1, true, stepSeconds(preset.id));
      expect(time).toBeGreaterThanOrEqual(now + 0.012 - 1e-10);
      expect(time - now).toBeLessThanOrEqual(
        stepSeconds(preset.id) + 0.012 + 1e-10,
      );
      expect((time - 1) / stepSeconds(preset.id)).toBeCloseTo(
        Math.round((time - 1) / stepSeconds(preset.id)),
      );
    }
  }
  expect(signatures.size).toBe(4);
});

test("Genres switch at a bar without new contexts and automatically draw with audible backing", async ({
  page,
}) => {
  const errors = await instrumentAudio(page);
  await openToy(page);
  const selector = page.getByRole("combobox", { name: "Style", exact: true });
  const toy = page.locator(".house-toy");
  const canvas = page.locator("canvas");
  await selector.selectOption("dub-techno");
  await expect.poll(() => contextStates(page)).toEqual([]);
  await startToy(page);
  for (const genre of ["dub-techno", "bossa-nova", "liquid-funk"] as const) {
    await selector.selectOption(genre);
    await expect(toy).toHaveAttribute("data-genre", genre, { timeout: 7000 });
    await expect(toy).toHaveAttribute("data-pending-genre", "");
    await expect(canvas).toHaveAttribute("data-genre", genre);
    await expect(page.locator(".house-stage-top")).toContainText(
      String(GENRES[genre].bpm),
    );
    await expect
      .poll(async () => Number(await toy.getAttribute("data-level")))
      .toBeGreaterThan(0.00001);
    const beats = Number((await canvas.getAttribute("data-auto-beats")) ?? 0);
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-auto-beats")))
      .toBeGreaterThan(beats);
    expect(
      Number(await canvas.getAttribute("data-ambient-shapes")),
    ).toBeLessThanOrEqual(2);
    expect(await hits(page)).toBe(0);
    await expect
      .poll(() =>
        canvas.evaluate((element: HTMLCanvasElement) => {
          const pixels = element
            .getContext("2d")!
            .getImageData(0, 0, element.width, element.height).data;
          const background = [9, 15, 35];
          return pixels.some(
            (value, index) =>
              index % 4 < 3 && Math.abs(value - background[index % 4]) > 8,
          );
        }),
      )
      .toBe(true);
    await expect.poll(() => contextStates(page)).toEqual(["running"]);
  }
  // Latest requested genre wins; no context churn or scheduled backlog.
  await selector.selectOption("house");
  await selector.selectOption("bossa-nova");
  await selector.selectOption("dub-techno");
  await expect(toy).toHaveAttribute("data-genre", "dub-techno", {
    timeout: 7000,
  });
  await page.getByRole("button", { name: "Auto motion", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-ambient-shapes", "0");
  const beats = await canvas.getAttribute("data-auto-beats");
  await page.waitForTimeout(600);
  await expect(canvas).toHaveAttribute("data-auto-beats", beats!);
  await page.locator(".house-stage").focus();
  await page.keyboard.press("q");
  expect(await hits(page)).toBe(1);
  await page.getByRole("button", { name: "Auto motion", exact: true }).click();
  await page.getByRole("button", { name: "Backtrack", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-ambient-shapes", "0");
  const muted = await canvas.getAttribute("data-auto-beats");
  await page.waitForTimeout(600);
  await expect(canvas).toHaveAttribute("data-auto-beats", muted!);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(selector).toHaveValue("house");
  await expect(
    page.getByRole("button", { name: "Auto motion", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(canvas).toHaveAttribute("data-ambient-shapes", "0");
  await expect.poll(() => contextStates(page)).toEqual(["closed"]);
  expect(errors).toEqual([]);
});

test("Auto motion respects reduced motion and localized genre controls", async ({
  page,
}) => {
  const errors = await instrumentAudio(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openToy(page);
  await page
    .getByRole("combobox", { name: "Style", exact: true })
    .selectOption("liquid-funk");
  await startToy(page);
  await page.waitForTimeout(700);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-ambient-shapes",
    "0",
  );
  await page.locator('[data-language="zh-CN"]').click();
  await expect(
    page.getByRole("combobox", { name: "曲风", exact: true }),
  ).toHaveValue("liquid-funk");
  await expect(
    page.getByRole("button", { name: "自动背景", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".house-genre-description")).toContainText(
    "滚动碎拍",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect
    .poll(async () =>
      Number(
        (await page.locator("canvas").getAttribute("data-auto-beats")) ?? 0,
      ),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "图形", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-ambient-shapes",
    "0",
  );
  await page.getByRole("button", { name: "停止", exact: true }).click();
  await expect.poll(() => contextStates(page)).toEqual(["closed"]);
  expect(errors).toEqual([]);
});

test("Performance canvas has no idle grid and a single hit spans the stage", async ({
  page,
}) => {
  await instrumentAudio(page);
  await openToy(page);
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-active-shapes", "0");
  const uniform = await canvas.evaluate((element: HTMLCanvasElement) => {
    const data = element
      .getContext("2d")!
      .getImageData(0, 0, element.width, element.height).data;
    for (let i = 0; i < data.length; i += 4) {
      if (
        data[i] !== data[0] ||
        data[i + 1] !== data[1] ||
        data[i + 2] !== data[2]
      )
        return false;
    }
    return true;
  });
  expect(uniform).toBe(true);
  // Isolate the manual hit from the newly added automatic backing animation.
  await page.getByRole("button", { name: "Auto motion", exact: true }).click();
  await startToy(page);
  await page.keyboard.press("q");
  await page.waitForTimeout(450);
  const coverage = await canvas.evaluate((element: HTMLCanvasElement) => {
    const { width, height } = element;
    const data = element
      .getContext("2d")!
      .getImageData(0, 0, width, height).data;
    let left = width,
      right = 0,
      top = height,
      bottom = 0;
    // The stage background is the centralized --color-play-bg (#090f23).
    for (let y = 0; y < height; y += 2)
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        if (
          Math.abs(data[i] - 9) +
            Math.abs(data[i + 1] - 15) +
            Math.abs(data[i + 2] - 35) >
          25
        ) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    return { x: (right - left) / width, y: (bottom - top) / height };
  });
  expect(coverage.x).toBeGreaterThan(0.85);
  expect(coverage.y).toBeGreaterThan(0.85);
  await page.keyboard.press("Escape");
});

test("Performance browser: all 32 keys produce real audio and drawn geometry without a backtrack", async ({
  page,
}) => {
  const errors = await instrumentAudio(page);
  await openToy(page);
  await page.getByRole("button", { name: "Backtrack", exact: true }).click();
  await startToy(page);
  await expect(page.locator(".house-toy")).toHaveAttribute("data-level", "0");
  const before = await page
    .locator("canvas")
    .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  for (const key of KEYS) {
    await page.keyboard.press(key);
    await page.waitForTimeout(80);
  }
  expect(await hits(page)).toBe(32);
  await expect
    .poll(async () =>
      Number(await page.locator(".house-toy").getAttribute("data-level")),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(async () =>
      Number(await page.locator("canvas").getAttribute("data-active-shapes")),
    )
    .toBeGreaterThan(0);
  expect(
    await page
      .locator("canvas")
      .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL()),
  ).not.toBe(before);
  await page.waitForTimeout(1800);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-active-shapes",
    "0",
  );
  const frames = await page.locator("canvas").getAttribute("data-frames");
  await page.waitForTimeout(150);
  await expect(page.locator("canvas")).toHaveAttribute("data-frames", frames!);
  await page.keyboard.press("Escape");
  await expect.poll(() => contextStates(page)).toEqual(["closed"]);
  expect(errors).toEqual([]);
});

test("Performance browser: pointer drag, snap, fullscreen, and 1000-hit storm stay bounded", async ({
  page,
}) => {
  const errors = await instrumentAudio(page);
  await openToy(page);
  await startToy(page);
  const surface = page.locator(".house-stage");
  await surface.scrollIntoViewIfNeeded();
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.03, box.y + box.height * 0.15);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.94, box.y + box.height * 0.8, {
    steps: 18,
  });
  await page.mouse.up();
  expect(await hits(page)).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Snap to beat", exact: true }).click();
  await page.locator(".house-keyboard summary").click();
  const before = await hits(page);
  await page.evaluate(() => {
    const buttons = [
      ...document.querySelectorAll<HTMLButtonElement>("[data-pad]"),
    ];
    for (let i = 0; i < 1000; i++) buttons[i % buttons.length].click();
  });
  expect((await hits(page)) - before).toBeLessThanOrEqual(12);
  expect(
    Number(await page.locator("canvas").getAttribute("data-active-shapes")),
  ).toBeLessThanOrEqual(8);
  await page.getByRole("button", { name: "Snap to beat", exact: true }).click();
  await surface.focus();
  await page.keyboard.press("q");
  await page.waitForTimeout(200);
  await page.keyboard.press("w");
  await expect(page.locator(".house-toy")).toHaveAttribute(
    "data-last-key",
    "w",
  );
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Backtrack", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  const volume = page.getByRole("slider", { name: "Volume", exact: true });
  await volume.focus();
  const count = await hits(page);
  await page.keyboard.press("q");
  expect(await hits(page)).toBe(count);
  await page.keyboard.press("ArrowLeft");
  await expect(volume).toHaveValue("99");
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  await expect(page.locator(".house-toolbar")).toBeHidden();
  await expect(page.locator(".house-console")).toBeHidden();
  await expect(page.locator(".house-stage-top")).toBeHidden();
  await expect(page.locator(".house-stage-bottom")).toBeHidden();
  await expect(page.locator(".house-keyboard")).toBeHidden();
  await expect(page.locator(".house-fullscreen-toggle")).toHaveCSS(
    "opacity",
    "0",
  );
  const fullBox = (await surface.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(fullBox.x).toBe(0);
  expect(fullBox.y).toBe(0);
  expect(fullBox.width).toBe(viewport.width);
  expect(fullBox.height).toBe(viewport.height);
  await page.keyboard.press("?");
  await expect(page.locator(".house-toolbar")).toBeVisible();
  await expect(page.locator(".house-console")).toBeVisible();
  await page
    .getByRole("button", { name: "Exit fullscreen", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(false);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect.poll(() => contextStates(page)).toEqual(["closed"]);
  expect(errors).toEqual([]);
});

test("Performance browser: repeated start/stop, mute, reset and canvas cleanup", async ({
  page,
}) => {
  const errors = await instrumentAudio(page);
  await openToy(page);
  for (let run = 0; run < 3; run++) {
    await startToy(page);
    await page.keyboard.press("q");
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await expect
      .poll(() => contextStates(page))
      .toEqual(Array(run + 1).fill("closed"));
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-active-shapes",
      "0",
    );
  }
  await startToy(page);
  await expect
    .poll(async () =>
      Number(await page.locator(".house-toy").getAttribute("data-level")),
    )
    .toBeGreaterThan(0);
  await page.getByRole("slider", { name: "Volume", exact: true }).fill("0");
  await expect
    .poll(
      async () =>
        Number(await page.locator(".house-toy").getAttribute("data-level")),
      { timeout: 6000 },
    )
    .toBeLessThan(0.00001);
  await page.getByRole("slider", { name: "Echo", exact: true }).fill("10");
  await page.getByRole("button", { name: "Visuals", exact: true }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Volume", exact: true }),
  ).toHaveValue("100");
  await expect(
    page.getByRole("slider", { name: "Echo", exact: true }),
  ).toHaveValue("50");
  await expect(
    page.getByRole("button", { name: "Visuals", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => contextStates(page)).toEqual(Array(4).fill("closed"));
  const frames = await page.locator("canvas").getAttribute("data-frames");
  await page.waitForTimeout(150);
  await expect(page.locator("canvas")).toHaveAttribute("data-frames", frames!);
  expect(errors).toEqual([]);
});

test("Performance browser: background and navigation close audio; returning is silent", async ({
  page,
}) => {
  const errors = await instrumentAudio(page);
  await openToy(page);
  await startToy(page);
  await page.keyboard.press("q");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => contextStates(page)).toEqual(["closed"]);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-active-shapes",
    "0",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".house-toy")).toHaveAttribute(
    "data-playing",
    "false",
  );
  await startToy(page);
  await page.goto("/about/");
  expect(
    await page.evaluate(() =>
      Number(sessionStorage.getItem("house-close-calls")),
    ),
  ).toBe(2);
  await expect.poll(() => contextStates(page)).toEqual([]);
  await openToy(page);
  await expect(page.locator(".house-toy")).toHaveAttribute(
    "data-playing",
    "false",
  );
  expect(errors).toEqual([]);
});

test("Performance browser: resetting during pending Start cannot revive a disposed context", async ({
  page,
}) => {
  const errors = await instrumentAudio(page);
  await openToy(page);
  await page.evaluate(() => {
    const buttons = [
      ...document.querySelectorAll<HTMLButtonElement>(
        ".house-transport button",
      ),
    ];
    buttons[0].click();
    buttons[2].click();
  });
  await expect.poll(() => contextStates(page)).toEqual(["closed"]);
  await expect(page.locator(".house-toy")).toHaveAttribute(
    "data-playing",
    "false",
  );
  await startToy(page);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect.poll(() => contextStates(page)).toEqual(["closed", "closed"]);
  expect(errors).toEqual([]);
});

test.describe("Performance touch", () => {
  test.use({
    hasTouch: true,
    viewport: { width: 375, height: 812 },
    contextOptions: { reducedMotion: "reduce" },
  });
  test("multi-touch, Chinese, reduced motion, visuals off and responsive layout", async ({
    page,
  }) => {
    const errors = await instrumentAudio(page);
    await openToy(page);
    await startToy(page);
    const surface = page.locator(".house-stage");
    await surface.scrollIntoViewIfNeeded();
    const box = (await surface.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: box.x + box.width * 0.2, y: box.y + box.height * 0.2, id: 1 },
        { x: box.x + box.width * 0.7, y: box.y + box.height * 0.7, id: 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    expect(await hits(page)).toBe(2);
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );
    const frames = await page.locator("canvas").getAttribute("data-frames");
    await page.waitForTimeout(100);
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-frames",
      frames!,
    );
    await page.locator('[data-language="zh-CN"]').tap();
    await expect(
      page.getByRole("button", { name: "停止", exact: true }),
    ).toBeEnabled();
    await expect(page.locator(".house-toy")).toHaveAttribute(
      "data-playing",
      "true",
    );
    await page.getByRole("button", { name: "图形", exact: true }).tap();
    await surface.tap();
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-active-shapes",
      "0",
    );
    await page.getByRole("button", { name: "全屏", exact: true }).tap();
    await expect(page.locator(".house-toolbar")).toBeHidden();
    await page.locator(".house-fullscreen-toggle").tap();
    await expect(page.locator(".house-toolbar")).toBeVisible();
    await page.getByRole("button", { name: "退出全屏", exact: true }).tap();
    await page.locator(".house-keyboard summary").tap();
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 812 });
      for (const theme of ["light", "dark"]) {
        await page.evaluate(
          (value) => (document.documentElement.dataset.theme = value),
          theme,
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
    }
    await page.getByRole("button", { name: "停止", exact: true }).tap();
    await expect.poll(() => contextStates(page)).toEqual(["closed"]);
    expect(errors).toEqual([]);
  });
});

test("Performance handles unavailable audio with a visible retry message", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "AudioContext", {
      value: class {
        constructor() {
          throw new Error("Device unavailable");
        }
      },
    });
  });
  await page.goto("/play/?lang=en");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator(".house-status")).toHaveText(
    "Audio is unavailable. Try Start again or use another browser.",
  );
  await expect(
    page.getByRole("button", { name: "Start", exact: true }),
  ).toBeEnabled();
});
test("Performance has a no-JavaScript fallback", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/play/");
  const fallback = page.locator("noscript p");
  await expect(fallback).toBeVisible();
  expect(await fallback.evaluate((element) => element.textContent)).toContain(
    "This instrument needs JavaScript",
  );
  await expect(
    page.getByRole("button", { name: "Start", exact: true }),
  ).toBeDisabled();
  await context.close();
});
