import { expect, test } from "@playwright/test";

test("new intersection inequalities preprint appears first with requested tags and bilingual content", async ({
  page,
}) => {
  await page.goto("/publications/?lang=en");
  await page.locator("astro-island[ssr]").waitFor({ state: "detached" });
  const paper = page.locator("[data-publication-item]").first();
  await expect(paper).toHaveAttribute(
    "data-publication-item",
    "hodge-riemann-intersection-inequalities",
  );
  await expect(paper.locator("h3")).toHaveText(
    "Inequalities for intersection numbers from Hodge-Riemann relations",
  );
  await expect(paper.locator(".publication-authors")).toHaveText(
    "Xiangru Zeng",
  );
  await expect(paper.locator(".publication-year")).toHaveText("2026");
  await expect(paper.locator(".publication-venue")).toHaveText("preprint");
  await expect(
    paper.getByRole("link", { name: "arXiv", exact: true }),
  ).toHaveAttribute("href", "https://arxiv.org/abs/2611.17841");
  await expect(
    paper.getByRole("link", { name: "PDF", exact: true }),
  ).toHaveAttribute("href", "https://arxiv.org/pdf/2611.17841");
  await paper.hover();
  const preview = page.locator(".publication-preview");
  await expect(preview.locator(".tag")).toHaveText([
    "volume polynomial",
    "Hodge Theory",
    "AI assisted",
  ]);
  await expect(preview).toContainText("strictly Lorentzian polynomials");
  await expect(
    page.locator('[data-publication-item="toric-tensor-generation"]'),
  ).toHaveCount(1);
  await page.locator('[data-language="zh-CN"]').click();
  await expect(paper.locator("h3")).toHaveText(
    "由霍奇–黎曼关系得到的交数不等式",
  );
  await expect(paper.locator(".publication-authors")).toHaveText("曾相如");
  await expect(preview.locator(".tag")).toHaveText([
    "体积多项式",
    "霍奇理论",
    "AI 辅助",
  ]);
  await expect(preview).toContainText("严格洛伦兹多项式");
});

test("MHS is archived without cancelled nearby-fiber plans and retains its notes", async ({
  page,
}) => {
  await page.goto("/seminars/mixed-hodge-structures/?lang=en");
  const content = page.locator(".seminar-description");
  await expect(content).toContainText("This seminar has concluded.");
  await expect(content).toContainText("No further meetings are scheduled.");
  await expect(
    content.getByRole("heading", { name: "Archived Schedule" }),
  ).toBeVisible();
  await expect(content).not.toContainText(
    /nearby|Ehrhart|KSa|KSb|TBD|Tentative/i,
  );
  await expect(
    content.locator('a[href*="1404.3000"], a[href*="1411.7736"]'),
  ).toHaveCount(0);
  await expect(content.locator("table")).toContainText("10/23");
  for (const filename of [
    "first-talk-concise.pdf",
    "pure-hodge-structures-notes.pdf",
    "cubical-hyperresolutions.pdf",
    "Week%205%20-%20MHS%20for%20Smooth%20Varieties.excalidraw.svg",
  ]) {
    const href = `/seminars/mixed-hodge-structures/${filename}`;
    await expect(content.locator(`a[href="${href}"]`)).toHaveCount(1);
    expect((await page.request.get(href)).status()).toBe(200);
  }
  await page.locator('[data-language="zh-CN"]').click();
  await expect(content).toContainText("本讨论班已结束");
  await expect(content).toContainText("不再安排后续讨论");
  await expect(
    content.getByRole("heading", { name: "日程存档" }),
  ).toBeVisible();
  await expect(content.locator("table")).toContainText("上同调下降 II");
});
