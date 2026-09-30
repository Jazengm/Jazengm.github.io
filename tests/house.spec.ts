import { expect, test, type Page } from "@playwright/test";
import {
  BPM,
  HARMONY,
  HouseSequencer,
  PADS,
  STEP_SECONDS,
} from "../src/audio/house-patterns";

const pad = (key: string) => PADS.find((item) => item.key === key)!;

test("House rules: bar-boundary layer commits and latest-choice wins", () => {
  expect(BPM).toBe(124);
  expect(STEP_SECONDS).toBe(60 / 124 / 4);
  const music = new HouseSequencer();
  music.tick(0);
  for (let i = 0; i < 3000; i++) music.press(pad(i % 2 ? "w" : "e"));
  music.press(pad("s"));
  music.press(pad("f"));
  for (let step = 1; step < 16; step++) {
    expect(music.tick(step).mix).toEqual({ drums: 0, bass: 0, chords: 0 });
  }
  expect(music.tick(16).mix).toEqual({ drums: 1, bass: 1, chords: 1 });
  expect(music.pending).toBeNull();
});

test("House rules: bounded melody/fills, chord tones and root-following harmony", () => {
  const music = new HouseSequencer();
  for (let bar = 0; bar < 8; bar++) {
    let notes = 0;
    let fills = 0;
    for (let step = 0; step < 16; step++) {
      for (let click = 0; click < 200; click++) {
        music.press(pad(click % 2 ? "j" : "k"));
        music.press(pad("l"));
      }
      const frame = music.tick(bar * 16 + step);
      expect(frame.harmony).toEqual(HARMONY[bar % 4]);
      if (frame.melody) {
        notes++;
        expect(
          frame.harmony.notes.map((note) =>
            note.replace(/\d$/, (n) => String(Number(n) + 1)),
          ),
        ).toContain(frame.melody);
      }
      if (frame.fill) {
        fills++;
        expect(step).toBeGreaterThanOrEqual(12);
      }
      expect(frame.kick).toBe(step % 4 === 0);
    }
    expect(notes).toBe(4);
    expect(fills).toBe(4);
  }
  // A burst without additional input produces one note, not a queued backlog.
  for (let click = 0; click < 3000; click++) music.press(pad("k"));
  expect(music.tick(128).melody).not.toBeNull();
  expect(music.tick(129).melody).toBeNull();
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
  await expect
    .poll(async () =>
      Number(await page.locator(".house-toy").getAttribute("data-level")),
    )
    .toBeGreaterThan(0);
}

test("House browser: real audio, burst input, quantized layers and keyboard", async ({
  page,
}) => {
  const errors = await instrumentAudio(page);
  await openToy(page);
  await startToy(page);
  await expect.poll(() => contextStates(page)).toEqual(["running"]);
  await page.locator(".house-toy").focus();
  await page.keyboard.press("s");
  await expect(page.locator('[data-pad="s"]')).toHaveAttribute(
    "data-queued",
    "true",
  );
  await expect(page.locator('[data-pad="s"]')).toHaveAttribute(
    "aria-pressed",
    "true",
    { timeout: 5000 },
  );
  await page.evaluate(() => {
    const keys = ["q", "w", "e", "a", "s", "d", "f", "j", "k", "l", "z"];
    for (let i = 0; i < 1000; i++)
      document
        .querySelector<HTMLButtonElement>(
          `[data-pad="${keys[i % keys.length]}"]`,
        )!
        .click();
  });
  await expect(page.locator(".house-pad-flash")).toHaveCount(1);
  await expect(page.locator(".house-toy")).toHaveAttribute(
    "data-playing",
    "true",
  );
  await page.waitForTimeout(2200);
  await expect.poll(() => contextStates(page)).toEqual(["running"]);
  await page.locator(".house-toy").focus();
  await page.keyboard.press("Escape");
  await expect.poll(() => contextStates(page)).toEqual(["closed"]);
  expect(errors).toEqual([]);
});

test("House browser: repeated start/stop, silent volume and reset", async ({
  page,
}) => {
  const errors = await instrumentAudio(page);
  await openToy(page);
  for (let run = 0; run < 3; run++) {
    await startToy(page);
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await expect
      .poll(() => contextStates(page))
      .toEqual(Array(run + 1).fill("closed"));
  }
  await startToy(page);
  await page.getByRole("slider", { name: "Volume", exact: true }).fill("0");
  await expect
    .poll(
      async () =>
        Number(await page.locator(".house-toy").getAttribute("data-level")),
      { timeout: 6000 },
    )
    .toBeLessThan(0.00001);
  await page.getByRole("slider", { name: "Color / echo" }).fill("10");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Volume", exact: true }),
  ).toHaveValue("50");
  await expect(page.getByRole("slider", { name: "Color / echo" })).toHaveValue(
    "70",
  );
  await expect.poll(() => contextStates(page)).toEqual(Array(4).fill("closed"));
  expect(errors).toEqual([]);
});

test("House browser: background and navigation close audio; returning is silent", async ({
  page,
}) => {
  const errors = await instrumentAudio(page);
  await openToy(page);
  await startToy(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => contextStates(page)).toEqual(["closed"]);
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

test("House browser: stop during pending start cannot resume a disposed session", async ({
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
    // Reset is always enabled, including before React flushes Start state.
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

test.describe("House touch", () => {
  test.use({
    hasTouch: true,
    viewport: { width: 375, height: 812 },
    contextOptions: { reducedMotion: "reduce" },
  });
  test("mobile pads and Chinese labels preserve playback state without overflow", async ({
    page,
  }) => {
    const errors = await instrumentAudio(page);
    await openToy(page);
    await page.getByRole("button", { name: "Start", exact: true }).tap();
    await expect(page.locator(".house-toy")).toHaveAttribute(
      "data-playing",
      "true",
    );
    await page.locator('[data-pad="j"]').tap();
    await expect(page.locator('[data-pad="j"] .house-pad-flash')).toHaveCount(
      1,
    );
    await page.locator('[data-language="zh-CN"]').tap();
    await expect(
      page.getByRole("button", { name: "停止", exact: true }),
    ).toBeEnabled();
    await expect(page.locator(".house-toy")).toHaveAttribute(
      "data-playing",
      "true",
    );
    await expect(page.locator('[data-pad="q"]')).toContainText("基石");
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page.getByRole("button", { name: "停止", exact: true }).tap();
    await expect.poll(() => contextStates(page)).toEqual(["closed"]);
    expect(errors).toEqual([]);
  });
});

test("House has a no-JavaScript fallback", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/play/");
  // Text selectors skip noscript; inspect its real paragraph directly.
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
