import { expect, test, type Page } from "@playwright/test";

const requiredRoutes = [
  "/",
  "/publications/",
  "/experiments/",
  "/experiments/fractal/",
  "/illustrations/",
  "/illustrations/moorse-mosaic/",
  "/seminars/",
  "/seminars/mixed-hodge-structures/",
  "/about/",
];

const removedRoutes = [
  "/research/",
  "/teaching/",
  "/notes/",
  "/notes/sample-math-note/",
  "/illustration/",
  "/illustration/moorse-mosaic/",
  "/illustration/blue-field/",
  "/illustration/orange-field/",
];

function captureConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function getInternalLinks(page: Page, selector: string) {
  await page.waitForLoadState("networkidle");
  const links = page.locator(selector);
  await expect(links.first()).toBeVisible();
  const hrefs = await links.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLAnchorElement).href),
  );
  return [
    ...new Set(
      hrefs.filter(
        (href) => new URL(href).origin === new URL(page.url()).origin,
      ),
    ),
  ];
}

async function waitForIslands(page: Page) {
  const islands = page.locator("astro-island");
  for (let index = 0; index < (await islands.count()); index += 1) {
    const island = islands.nth(index);
    await island.scrollIntoViewIfNeeded();
    await expect(island).not.toHaveAttribute("ssr", "");
  }
}

test("required routes render without browser errors", async ({ page }) => {
  const errors = captureConsoleErrors(page);
  for (const route of requiredRoutes) {
    const response = await page.goto(route);
    expect(response?.ok(), `${route} should load`).toBeTruthy();
    await expect(page.locator("main")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("removed draft routes return not found", async ({ request }) => {
  for (const route of removedRoutes) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(404);
  }
});

test("primary navigation links resolve", async ({ page, request }) => {
  await page.goto("/");
  const routes = await getInternalLinks(
    page,
    'nav[aria-label="Primary navigation"] a',
  );
  expect(routes.length).toBeGreaterThan(1);
  for (const route of routes) {
    const response = await request.get(route);
    expect(response.ok(), route).toBeTruthy();
  }
});

test("Home lists selected papers as compact citations and spaces the footer", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Selected papers" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Start with a section" }),
  ).toHaveCount(0);
  await expect(page.getByText("Explore", { exact: true })).toHaveCount(0);

  const citations = page.locator(".selected-publications li");
  expect(await citations.count()).toBeGreaterThan(0);
  for (const citation of await citations.allInnerTexts()) {
    expect(citation).toMatch(/\.\s.+\s\((?:\d{4}|TBA)\)\.$/);
  }

  await expect(page.locator("footer")).toContainText(
    "© " + new Date().getFullYear() + " Xiangru Zeng.",
  );
});

test("publication explorer omits filters and exposes desktop previews", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/publications/");
  await waitForIslands(page);
  const items = page.locator("[data-publication-item]");
  expect(await items.count()).toBeGreaterThan(0);

  const first = items.first();
  const title = (await first.locator("h3").innerText()).trim();
  await first.hover();
  await expect(page.locator(".publication-preview h3")).toHaveText(title);
  await first.focus();
  await expect(first).toBeFocused();
  await expect(page.getByLabel("Keywords")).toHaveCount(0);
  await expect(page.getByLabel("Type")).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Tag" })).toHaveCount(0);
});

test("publication preview has a touch-friendly inline alternative", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/publications/");
  await waitForIslands(page);
  const first = page.locator("[data-publication-item]").first();
  await first.getByRole("button", { name: "Show preview" }).click();
  await expect(first.locator(".publication-inline-preview")).toBeVisible();
});

test("content directory entries resolve and hydrate optional islands", async ({
  page,
}) => {
  const errors = captureConsoleErrors(page);
  const directories = [
    { path: "/experiments/", links: ".experiment-card h2 a" },
    { path: "/illustrations/", links: ".illustration-card" },
    { path: "/seminars/", links: ".seminar-list a" },
  ];

  for (const directory of directories) {
    await page.goto(directory.path);
    const entries = await getInternalLinks(page, directory.links);
    expect(
      entries.length,
      `${directory.path} should list entries`,
    ).toBeGreaterThan(0);
    for (const entry of entries) {
      const response = await page.goto(entry);
      expect(response?.ok(), `${entry} should load`).toBeTruthy();
      await waitForIslands(page);
    }
  }
  expect(errors).toEqual([]);
});

test("published pages contain no sample-content warnings", async ({ page }) => {
  for (const route of requiredRoutes) {
    await page.goto(route);
    await expect(page.locator("body")).not.toContainText(
      /placeholder|fictional sample/i,
    );
  }
});

test("seminar index links to its Markdown-backed description", async ({
  page,
}) => {
  await page.goto("/seminars/");
  const seminar = page.getByRole("link", {
    name: "Mixed Hodge Structures (2026 Fall)",
  });
  await expect(seminar).toHaveAttribute(
    "href",
    "/seminars/mixed-hodge-structures/",
  );
  await seminar.click();
  await expect(
    page.getByRole("heading", { name: "Mixed Hodge Structures", level: 1 }),
  ).toBeVisible();
  await expect(page.locator(".seminar-description")).toContainText(
    "Tentative Schedule",
  );
});

test("illustration names appear on hover and detail pages show full images", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/illustrations/");
  const first = page.locator(".illustration-card").first();
  const caption = first.locator("figcaption");

  await first.hover();
  await expect(caption).toHaveCSS("opacity", "1");
  await first.focus();
  await expect(first).toBeFocused();
  await expect(caption).toHaveCSS("opacity", "1");

  await first.click();
  await expect(page.locator(".full-image img")).toBeVisible();
  await expect(page.locator(".illustration-description")).not.toBeEmpty();
  await expect(
    page.getByRole("link", { name: "All illustrations" }),
  ).toBeVisible();
});

test("Moorse Mosaic uses compact TeX scripts and highlighted Mathematica", async ({
  page,
}) => {
  await page.goto("/illustrations/moorse-mosaic/");

  const mathSizes = await page.evaluate(() => {
    const base = document.querySelector<HTMLElement>(".katex-html .mathnormal");
    const superscript = document.querySelector<HTMLElement>(
      ".katex-html .sizing.size3 .mord",
    );
    const rootIndex = document.querySelector<HTMLElement>(
      ".katex-html .sizing.size1 .mord",
    );
    return {
      base: base ? Number.parseFloat(getComputedStyle(base).fontSize) : 0,
      superscript: superscript
        ? Number.parseFloat(getComputedStyle(superscript).fontSize)
        : 0,
      rootIndex: rootIndex
        ? Number.parseFloat(getComputedStyle(rootIndex).fontSize)
        : 0,
    };
  });
  expect(mathSizes.superscript).toBeLessThan(mathSizes.base * 0.8);
  expect(mathSizes.rootIndex).toBeLessThan(mathSizes.base * 0.6);

  const tokenColors = await page
    .locator("pre.astro-code span[style*='color']")
    .evaluateAll((tokens) =>
      tokens.map((token) => getComputedStyle(token).color),
    );
  expect(new Set(tokenColors).size).toBeGreaterThan(2);
});

test("fractal mode switches and Reset restores defaults", async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto("/experiments/fractal/");
  await waitForIslands(page);
  const mode = page.getByLabel("Fractal mode");
  await mode.selectOption("julia");
  await expect(mode).toHaveValue("julia");
  await page.getByLabel("Julia real parameter").fill("-0.4");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(mode).toHaveValue("mandelbrot");
  await expect(page.getByLabel("Julia real parameter")).toHaveValue("-0.8");
  await expect(page.getByText("Render complete")).toBeVisible({
    timeout: 15_000,
  });
  expect(errors).toEqual([]);
});

test("theme choice persists and reduced motion is honored", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await page.getByRole("button", { name: "Use light theme" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  const transitionMilliseconds = await page
    .locator(".primary-nav a")
    .first()
    .evaluate((element) => {
      const duration = getComputedStyle(element).transitionDuration;
      return duration.endsWith("ms")
        ? Number.parseFloat(duration)
        : Number.parseFloat(duration) * 1000;
    });
  expect(transitionMilliseconds).toBeLessThanOrEqual(0.01);
});

test("360px and 768px viewports have no horizontal overflow", async ({
  page,
}) => {
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of requiredRoutes) {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(
        overflow,
        `${viewport.width}px ${route} overflow`,
      ).toBeLessThanOrEqual(1);
    }
  }
});
