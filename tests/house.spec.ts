import { expect, test, type Page } from "@playwright/test";
import {
  BPM,
  KEYS,
  PADS,
  PerformanceGate,
  STEP_SECONDS,
  noteTime,
  padAt,
  padPosition,
} from "../src/audio/house-patterns";

test("Performance rules: 32 unique sounds and complete canvas mapping", () => {
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
  await page.addInitScript(() => {
    const target = window as unknown as Window &
      typeof globalThis & { __houseContexts: AudioContext[] };
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
  ).toBeLessThanOrEqual(28);
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
  await page.keyboard.press("ArrowRight");
  await expect(volume).toHaveValue("51");
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
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
  ).toHaveValue("50");
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
