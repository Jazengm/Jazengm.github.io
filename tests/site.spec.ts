import { expect, test, type Page } from "@playwright/test";

const requiredRoutes = [
  "/",
  "/publications/",
  "/research/",
  "/teaching/",
  "/notes/",
  "/experiments/",
  "/experiments/fractal/",
  "/about/",
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

test("publication explorer filters and exposes desktop previews", async ({
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

  await page.getByLabel("Keywords").fill(title);
  await expect(items).toHaveCount(1);
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

test("ResearchMap nodes respond to keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForIslands(page);
  const map = page.locator(".research-map");
  const node = map.locator("svg a[data-map-node]").nth(1);
  await node.focus();
  await expect(node).toBeFocused();
  await expect(map.locator("#research-map-detail")).not.toBeEmpty();
});

test("note and experiment entries resolve and hydrate optional islands", async ({
  page,
}) => {
  const errors = captureConsoleErrors(page);
  const directories = [
    { path: "/notes/", links: ".note-list h2 a" },
    { path: "/experiments/", links: ".experiment-card h2 a" },
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
    .locator(".link-grid a")
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
