import { expect, test } from "@playwright/test";

test("name switch exchanges position and opacity, supports keyboard, and persists", async ({
  page,
}) => {
  await page.goto("/");
  const button = page.getByRole("button", {
    name: "Switch to Chinese / 切换到中文",
  });
  await expect(button).toBeVisible();
  const english = page.locator(".name-english");
  const chinese = page.locator(".name-chinese");
  await expect(chinese).toHaveCSS("opacity", "0.52");
  const front = await english.boundingBox();
  const back = await chinese.boundingBox();
  expect(back!.x).toBeGreaterThan(front!.x);
  expect(back!.y).toBeLessThan(front!.y);
  await chinese.click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByRole("heading", { name: "精选论文" })).toBeVisible();
  await expect(english).toHaveCSS("opacity", "0.52");
  await expect(chinese).toHaveCSS("opacity", "1");
  const newFront = await chinese.boundingBox();
  const newBack = await english.boundingBox();
  expect(newBack!.x).toBeGreaterThan(newFront!.x);
  expect(newBack!.y).toBeLessThan(newFront!.y);
  await page
    .locator(".primary-nav")
    .getByRole("link", { name: "关于", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "教育经历" })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  const reverse = page.getByRole("button", {
    name: "Switch to English / 切换到英文",
  });
  await reverse.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Education" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("Chinese survives hydration and filtering without resetting React state", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/publications/?lang=zh");
  await expect(page.getByPlaceholder("标题、作者或主题")).toBeVisible();
  await page.getByPlaceholder("标题、作者或主题").fill("环簇上的张量生成线丛");
  await expect(page.locator("[data-publication-item]")).toHaveCount(1);
  await page.locator("[data-language-toggle]").click();
  await expect(page.getByPlaceholder("Title, author, or subject")).toHaveValue(
    "环簇上的张量生成线丛",
  );
  await expect(page.locator("[data-publication-item]")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.locator("[data-publication-item]")).toHaveCount(3);
  await page.locator("[data-language-toggle]").click();
  await page.getByRole("combobox", { name: "标签" }).selectOption("geometry");
  await expect(page.locator("[data-publication-item]")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("language changes preserve mathematics and code exactly", async ({
  page,
}) => {
  await page.goto("/illustrations/moorse-mosaic/");
  const code = await page.locator("pre").innerHTML();
  const math = await page.locator(".katex").innerHTML();
  await page.locator("[data-language-toggle]").click();
  await expect(
    page.getByRole("heading", {
      name: "[中文标题待确认：Moorse Mosaic]",
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.locator("pre").innerHTML()).toBe(code);
  expect(await page.locator(".katex").innerHTML()).toBe(math);
  await page.locator("[data-language-toggle]").click();
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
  await page.locator("[data-language-toggle]").click();
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
      "/research/",
      "/teaching/",
      "/about/",
      "/notes/sample-math-note/",
      "/notes/interactive-parameters/",
      "/illustrations/",
      "/illustrations/moorse-mosaic/",
      "/seminars/mixed-hodge-structures/",
      "/experiments/fractal/",
    ]) {
      await page.goto(route + "?lang=zh");
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
