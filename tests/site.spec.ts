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

test("required pages open without uncaught console errors", async ({
  page,
}) => {
  const errors = captureConsoleErrors(page);
  for (const route of requiredRoutes) {
    const response = await page.goto(route);
    expect(response?.ok(), `${route} should load`).toBeTruthy();
    await expect(page.locator("main")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("primary navigation points to valid routes", async ({ page, request }) => {
  await page.goto("/");
  const links = await page
    .locator('nav[aria-label="Primary navigation"] a')
    .evaluateAll((anchors) =>
      anchors.map((anchor) => (anchor as HTMLAnchorElement).href),
    );
  expect(links).toHaveLength(7);
  for (const href of links) {
    const response = await request.get(href);
    expect(response.ok(), href).toBeTruthy();
  }
});

test("publication records render newest first and filter", async ({ page }) => {
  await page.goto("/publications/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  const items = page.locator("[data-publication-item]");
  await expect(items).toHaveCount(5);
  await expect(items.first()).toContainText("2026");
  await page.getByLabel("Keywords").fill("derived");
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText("Derived Invariants");
});

test("desktop publication preview responds to hover and keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/publications/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  const target = page.locator(
    '[data-publication-item="placeholder-derived-invariants"]',
  );
  await target.hover();
  await expect(page.locator(".publication-preview h3")).toContainText(
    "Derived Invariants",
  );
  await target.focus();
  await expect(target).toBeFocused();
  await expect(page.locator(".publication-preview h3")).toContainText(
    "Derived Invariants",
  );
});

test("publication preview has a touch-friendly inline alternative", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/publications/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  const first = page.locator("[data-publication-item]").first();
  await first.getByRole("button", { name: "Show preview" }).click();
  await expect(first.locator(".publication-inline-preview")).toBeVisible();
});

test("research map nodes are keyboard accessible", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const island = page.locator("astro-island").last();
  await island.scrollIntoViewIfNeeded();
  await expect(island).not.toHaveAttribute("ssr", "");
  const map = page.locator(".research-map");
  const node = map.locator('svg a[data-map-node="Research"]');
  await node.focus();
  await expect(node).toBeFocused();
  await expect(map.locator("#research-map-detail")).toContainText(
    "Themes, questions",
  );
});

test("fractal mode switches and Reset restores defaults", async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto("/experiments/fractal/");
  const island = page.locator("astro-island");
  await island.scrollIntoViewIfNeeded();
  await expect(island).not.toHaveAttribute("ssr", "");
  const mode = page.getByLabel("Fractal mode");
  await mode.selectOption("julia");
  await expect(mode).toHaveValue("julia");
  await page.getByLabel("Julia real parameter").fill("-0.4");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(mode).toHaveValue("mandelbrot");
  await expect(page.getByLabel("Maximum iterations: 140")).toHaveValue("140");
  await expect(page.getByLabel("Julia real parameter")).toHaveValue("-0.8");
  await expect(page.getByText("Render complete")).toBeVisible({
    timeout: 15_000,
  });
  expect(errors).toEqual([]);
});

test("360px viewport has no unexpected horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  for (const route of requiredRoutes) {
    await page.goto(route);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${route} overflow`).toBeLessThanOrEqual(1);
  }
});

test("MDX math and interactive island render together", async ({ page }) => {
  await page.goto("/notes/sample-math-note/");
  await expect(page.locator(".katex-display")).toHaveCount(2);
  expect(await page.locator(".katex").count()).toBeGreaterThanOrEqual(3);
  await page.goto("/notes/interactive-parameters/");
  const island = page.locator("astro-island");
  await island.scrollIntoViewIfNeeded();
  await expect(island).not.toHaveAttribute("ssr", "");
  const range = page.getByLabel(/Number of terms/);
  await expect(range).toBeVisible();
  await range.fill("9");
  await expect(page.getByText("Number of terms: 9")).toBeVisible();
});

test("theme choice persists and reduced motion is honored", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await page.getByRole("button", { name: "Use light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
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
