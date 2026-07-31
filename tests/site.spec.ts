import { expect, test, type Page } from "@playwright/test";

function captureConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function getInternalLinks(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((elements) => [
    ...new Set(
      elements
        .map((element) => new URL((element as HTMLAnchorElement).href))
        .filter((url) => url.origin === window.location.origin)
        .map((url) => url.href),
    ),
  ]);
}

test("primary navigation routes render without browser errors", async ({
  page,
}) => {
  const errors = captureConsoleErrors(page);
  await page.goto("/");
  const routes = await getInternalLinks(
    page,
    'nav[aria-label="Primary navigation"] a',
  );

  expect(routes.length).toBeGreaterThan(1);
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.ok(), `${route} should load`).toBeTruthy();
    await expect(page.locator("main")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("publication explorer filters and exposes accessible previews", async ({
  page,
}) => {
  await page.goto("/publications/");
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
  await first.getByRole("button", { name: "Show preview" }).click();
  await expect(first.locator(".publication-inline-preview")).toBeVisible();
});

test("content directory entries resolve and hydrate optional islands", async ({
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
      await expect(page.locator("main")).toBeVisible();

      const islands = page.locator("astro-island");
      for (let index = 0; index < (await islands.count()); index += 1) {
        const island = islands.nth(index);
        await island.scrollIntoViewIfNeeded();
        await expect(island).not.toHaveAttribute("ssr", "");
      }
    }
  }
  expect(errors).toEqual([]);
});

test("theme persists and navigation routes fit a narrow viewport", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  const routes = await getInternalLinks(
    page,
    'nav[aria-label="Primary navigation"] a',
  );

  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await page.getByRole("button", { name: "Use light theme" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.setViewportSize({ width: 360, height: 780 });
  for (const route of routes) {
    await page.goto(route);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${route} overflow`).toBeLessThanOrEqual(1);
  }
});
