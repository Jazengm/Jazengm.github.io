import { expect, test } from "@playwright/test";

test("inline names select their language with one compact divider and keyboard feedback", async ({
  page,
}) => {
  await page.goto("/");
  const english = page.locator(".name-english");
  const chinese = page.locator(".name-chinese");
  await expect(english).toHaveAttribute("aria-pressed", "true");
  await expect(english).toHaveCSS("font-weight", "700");
  await expect(english).toHaveCSS("opacity", "1");
  await expect(chinese).toHaveCSS("font-weight", "500");
  await expect(chinese).toHaveCSS("opacity", "0.65");
  const initialEnglish = await english.boundingBox();
  const initialChinese = await chinese.boundingBox();
  expect(initialChinese!.x).toBeGreaterThan(
    initialEnglish!.x + initialEnglish!.width,
  );
  expect(initialChinese!.y).toBe(initialEnglish!.y);
  const divider = await page.locator(".name-divider").boundingBox();
  await expect(page.locator(".name-divider")).toHaveText("|");
  await expect(page.locator(".name-divider")).toBeVisible();
  const englishTextRight = await english
    .locator(".name-label")
    .evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getBoundingClientRect().right;
    });
  await expect(page.locator(".name-divider")).toHaveCount(1);
  expect(divider!.x - englishTextRight).toBeGreaterThanOrEqual(4);
  expect(divider!.x - englishTextRight).toBeLessThanOrEqual(6);
  expect(
    divider!.x - (initialEnglish!.x + initialEnglish!.width),
  ).toBeGreaterThanOrEqual(4);
  expect(
    initialChinese!.x - (divider!.x + divider!.width),
  ).toBeGreaterThanOrEqual(4);
  expect(
    await english.evaluate((el) => getComputedStyle(el, "::after").content),
  ).toBe("none");
  await expect(page.locator(".name-divider")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await english.click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const inactiveColor = await chinese.evaluate(
    (el) => getComputedStyle(el).color,
  );
  await chinese.hover();
  await expect(chinese).toHaveCSS("opacity", "1");
  expect(await chinese.evaluate((el) => getComputedStyle(el).color)).not.toBe(
    inactiveColor,
  );
  await chinese.click();
  await page.mouse.move(0, 0);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByRole("heading", { name: "精选论文" })).toBeVisible();
  await expect(english).toHaveCSS("opacity", "0.65");
  await expect(english).toHaveCSS("font-weight", "400");
  await expect(chinese).toHaveCSS("opacity", "1");
  await expect(chinese).toHaveCSS("font-weight", "700");
  const chineseModeGap = await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(
      document.querySelector(".name-english .name-label")!,
    );
    return (
      document.querySelector(".name-divider")!.getBoundingClientRect().left -
      range.getBoundingClientRect().right
    );
  });
  expect(chineseModeGap).toBeGreaterThanOrEqual(4);
  expect(chineseModeGap).toBeLessThanOrEqual(6);
  await page
    .locator(".primary-nav")
    .getByRole("link", { name: "关于", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "教育经历" })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  const reverse = page.getByRole("button", {
    name: "Xiangru Zeng — English",
  });
  await reverse.focus();
  await expect(reverse).toHaveCSS("outline-style", "none");
  await expect(reverse).toHaveCSS("text-decoration-line", "underline");
  await expect(reverse).toHaveCSS("opacity", "1");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Education" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("Chinese survives hydration and language changes preserve publication preview state", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  // Inline previews are the touch/mobile UI; desktop uses hover/focus instead.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/publications/?lang=zh");
  await expect(
    page.getByRole("heading", { name: "论文", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-publication-item]")).toHaveCount(1);
  const item = page.locator("[data-publication-item]").first();
  await item.scrollIntoViewIfNeeded();
  await expect(page.locator("astro-island")).not.toHaveAttribute("ssr", "");
  await expect(item.locator("h3")).toContainText("环簇上的张量生成线丛");
  const preview = item.locator(".publication-expand");
  await preview.click();
  await expect(preview).toHaveAttribute("aria-expanded", "true");
  await expect(item.locator(".publication-inline-preview")).toBeVisible();
  await expect(item.locator("h3")).toContainText("环簇上的张量生成线丛");
  await page.locator('button[data-language][aria-pressed="false"]').click();
  await expect(preview).toHaveText("Hide preview");
  await expect(preview).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("[data-publication-item]")).toHaveCount(1);
  await page.locator('button[data-language][aria-pressed="false"]').click();
  await expect(preview).toHaveAttribute("aria-expanded", "true");
  await preview.click();
  await expect(item.locator(".publication-inline-preview")).toBeHidden();
  await expect(page.locator(".publication-filters")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("language changes preserve mathematics and code exactly", async ({
  page,
}) => {
  await page.goto("/illustrations/moorse-mosaic/");
  const code = await page.locator("pre").innerHTML();
  const math = await page.locator(".katex").innerHTML();
  await page.locator('button[data-language][aria-pressed="false"]').click();
  await expect(
    page.getByRole("heading", {
      name: "[中文标题待确认：Moorse Mosaic]",
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.locator("pre").innerHTML()).toBe(code);
  await expect(page.locator("pre")).not.toHaveAttribute("aria-pressed");
  expect(await page.locator(".katex").innerHTML()).toBe(math);
  await page.locator('button[data-language][aria-pressed="false"]').click();
  await expect(
    page.getByRole("heading", { name: "Moorse Mosaic", exact: true }),
  ).toBeVisible();
  expect(await page.locator("pre").innerHTML()).toBe(code);
});

test("language URLs work without storage and navigation retains the choice", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage disabled");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage disabled");
    };
  });
  await page.goto("/?lang=zh");
  await page
    .locator(".primary-nav")
    .getByRole("link", { name: "讨论班", exact: true })
    .click();
  await expect(page).toHaveURL(/lang=zh/);
  await expect(
    page.getByRole("heading", { name: "讨论班", exact: true }),
  ).toBeVisible();
  await page.locator('button[data-language][aria-pressed="false"]').click();
  await expect(
    page.getByRole("heading", { name: "Seminars", exact: true }),
  ).toBeVisible();
});

test("Chinese pages fit mobile and desktop, including long names and tables", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/publications/",
      "/events/",
      "/about/",
      "/illustrations/",
      "/illustrations/moorse-mosaic/",
      "/seminars/mixed-hodge-structures/",
      "/experiments/fractal/",
    ]) {
      const response = await page.goto(route + "?lang=zh");
      expect(response?.ok(), `${route} must load successfully`).toBeTruthy();
      await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
      await expect(page.locator(".primary-nav")).toContainText("首页");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
        `${route}, width=${width}`,
      ).toBeLessThanOrEqual(1);
    }
  }
  expect(errors).toEqual([]);
});

test("reduced motion removes name animation and no-JS keeps English readable", async ({
  page,
  browser,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".name-chinese")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  const context = await browser.newContext({ javaScriptEnabled: false });
  const plain = await context.newPage();
  await plain.goto("/");
  await expect(
    plain.getByRole("heading", { name: "Selected papers" }),
  ).toBeVisible();
  await context.close();
});
