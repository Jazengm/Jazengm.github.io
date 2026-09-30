import { test, expect } from "@playwright/test";
import records from "../src/content/events/events.json" with { type: "json" };
import { partitionEvents } from "../src/utils/events";

test("event dates and URLs are valid and the snapshot is deduplicated", () => {
  expect(new Set(records.map((e) => e.id)).size).toBe(records.length);
  expect(new Set(records.map((e) => e.url)).size).toBe(records.length);
  for (const event of records) {
    expect(new Date(event.start).toISOString().slice(0, 10)).toBe(event.start);
    expect(new Date(event.end).toISOString().slice(0, 10)).toBe(event.end);
    expect(event.end >= event.start).toBeTruthy();
    expect(new URL(event.url).protocol).toBe("https:");
  }
});

test("partition keeps ongoing and last-day events current without mutating input", () => {
  const events = records.map((data) => ({
    id: data.id,
    data,
  }));
  const original = events.map((e) => e.id);
  const onLastDay = partitionEvents(events, "2026-08-04");
  expect(onLastDay.current.map((e) => e.id)).toContain("kyushu-matroids-2026");
  expect(partitionEvents(events, "2026-08-05").past.map((e) => e.id)).toContain(
    "kyushu-matroids-2026",
  );
  expect(partitionEvents(events, "2028-01-01").current).toEqual([]);
  expect(events.map((e) => e.id)).toEqual(original);
});

test("Events shows current meetings, a separate archive, and Chinese translations", async ({
  page,
}) => {
  await page.goto("/events/");
  await expect(page.locator('nav a[aria-current="page"]')).toHaveText("Events");
  const current = page.locator('section[aria-labelledby="upcoming-events"]');
  const past = page.locator('section[aria-labelledby="past-events"]');
  await expect(current.locator("[data-event-id]")).toHaveCount(6);
  await expect(past.locator("[data-event-id]")).toHaveCount(5);
  await expect(
    current.locator('[data-event-id="viasm-galleries-2026"]'),
  ).toBeVisible();
  await expect(
    past.locator('[data-event-id="kyushu-matroids-2026"] time').last(),
  ).toHaveAttribute("datetime", "2026-08-04");
  await page.locator('[data-language="zh-CN"]').click();
  await expect(page.locator("main h1")).toHaveText("学术活动");
  await expect(page.locator("#upcoming-events")).toHaveText(
    "即将举办与进行中的活动",
  );
  await expect(current.locator('[data-event-id="scms-ag-2026"] h3')).toHaveText(
    "2026 代数几何研讨会",
  );
  await page.locator('[data-language="en"]').click();
  await expect(page.locator("main h1")).toHaveText("Events");
});

test("Events remains in navigation and fits mobile and desktop in both themes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.locator(
      'section[aria-labelledby="home-events-heading"] [data-event-id]',
    ),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Events", exact: true }).click();
  await expect(page).toHaveURL(/\/events\/?$/);
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (value) => (document.documentElement.dataset.theme = value),
        theme,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBeTruthy();
      await expect(page.locator("#upcoming-events")).toBeVisible();
    }
  }
});
