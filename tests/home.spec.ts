import { expect, test } from "@playwright/test";
import { translate } from "../src/i18n/catalog";

const hour = 3_600_000;
const instant = new Date("2026-09-30T12:59:59Z");

test("Home selects the current hour, rotates at the boundary, and localizes live artwork", async ({
  page,
}) => {
  // Freeze before navigation: slow image loading must not cross the hour.
  await page.clock.install({ time: new Date(instant.getTime() - 60_000) });
  await page.clock.pauseAt(instant);
  await page.goto("/");
  const link = page.locator("[data-home-artwork]");
  const artworks = JSON.parse((await link.getAttribute("data-artworks"))!);
  const initial = Math.floor(instant.getTime() / hour) % artworks.length;
  await expect(link).toHaveAttribute("href", artworks[initial].href);
  await expect(link.locator("img")).toHaveAttribute(
    "src",
    artworks[initial].src,
  );
  await expect(link.locator("span")).toHaveText(artworks[initial].title);
  await page.clock.fastForward(1_100);
  const next = artworks[(initial + 1) % artworks.length];
  await expect(link).toHaveAttribute("href", next.href);
  await expect(link.locator("img")).toHaveAttribute("src", next.src);
  await expect(link.locator("span")).toHaveText(next.title);
  await page.locator('[data-language="zh-CN"]').click();
  await expect(link.locator("span")).toHaveText(translate(next.title, "zh-CN"));
  await expect(link).toHaveAttribute("href", next.href + "?lang=zh");
  await expect(link).toHaveAttribute(
    "aria-label",
    translate("View " + next.title, "zh-CN"),
  );
  // Emulate a suspended tab returning after several hours without firing timers.
  const later = new Date(instant.getTime() + 3 * hour + 1_100);
  await page.clock.setSystemTime(later);
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  const resumed =
    artworks[Math.floor(later.getTime() / hour) % artworks.length];
  await expect(link).toHaveAttribute("href", resumed.href + "?lang=zh");
  await expect(link.locator("span")).toHaveText(
    translate(resumed.title, "zh-CN"),
  );
  await page.locator('[data-language="en"]').click();
  await expect(link).toHaveAttribute("href", resumed.href);
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(resumed.href + "$"));
  await expect(page.locator("main h1")).toHaveText(resumed.title);
});

test("Home artwork supports touch, themes, reduced motion, and readable foreground controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?lang=zh");
  const link = page.locator("[data-home-artwork]");
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
      }, theme);
      await expect(page.locator("#home-name")).toBeVisible();
      await expect(link.locator("span")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      const overlay = await link.evaluate(
        (element) => getComputedStyle(element, "::after").backgroundImage,
      );
      expect(overlay).toContain("linear-gradient");
      await expect(link.locator("img")).toHaveCSS("object-position", "50% 50%");
      const email = page.locator('main a[href^="mailto:"]');
      await email.click({ trial: true });
    }
  }
  await page.setViewportSize({ width: 375, height: 900 });
  const href = await link.getAttribute("href");
  // Click the exposed image, not only its caption.
  const box = (await link.boundingBox())!;
  await page.mouse.click(box.x + box.width - 15, box.y + box.height / 2);
  await expect(page).toHaveURL(new RegExp(href!.replace("?", "\\?") + "$"));
});

test("Home has a linked static fallback without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const link = page.locator("[data-home-artwork]");
  await expect(link.locator("span")).not.toBeEmpty();
  await expect(link.locator("img")).toBeVisible();
  await link.locator("span").click();
  await expect(page).toHaveURL(/\/illustrations\/.+\//);
  await context.close();
});

test("An unavailable next image preserves the working artwork and destination", async ({
  page,
}) => {
  await page.clock.install({ time: new Date(instant.getTime() - 60_000) });
  await page.clock.pauseAt(instant);
  await page.goto("/");
  const link = page.locator("[data-home-artwork]");
  const artworks = JSON.parse((await link.getAttribute("data-artworks"))!);
  const initial = Math.floor(instant.getTime() / hour) % artworks.length;
  await expect(link).toHaveAttribute("href", artworks[initial].href);
  const next = artworks[(initial + 1) % artworks.length];
  await page.route("**" + next.src, (route) => route.abort());
  const failedLoad = page.waitForEvent("requestfailed", {
    predicate: (request) => request.url().endsWith(next.src),
  });
  await page.clock.fastForward(1_100);
  await failedLoad;
  await expect(link).toHaveAttribute("href", artworks[initial].href);
  await expect(link.locator("span")).toHaveText(artworks[initial].title);
  await page.unroute("**" + next.src);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(link).toHaveAttribute("href", next.href);
});
