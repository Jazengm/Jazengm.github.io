import { expect, test } from "@playwright/test";

test("arXiv preprint metadata and links remain correct in both languages", async ({
  page,
}) => {
  await page.goto("/publications/?lang=en");
  await page.locator("astro-island[ssr]").waitFor({ state: "detached" });
  const paper = page.locator(
    '[data-publication-item="toric-tensor-generation"]',
  );
  await expect(paper.locator("h3")).toHaveText(
    "Tensor-generating line bundles on toric varieties",
  );
  await expect(paper.locator(".publication-year")).toHaveText("2026");
  await expect(paper.locator(".publication-venue")).toHaveText("preprint");
  await expect(paper.locator(".publication-authors")).toHaveText(
    "Daigo Ito, Michael R. Zeng, Xiangru Zeng",
  );
  await expect(
    paper.getByRole("link", { name: "arXiv", exact: true }),
  ).toHaveAttribute("href", "https://arxiv.org/abs/2610.22279");
  await expect(
    paper.getByRole("link", { name: "PDF", exact: true }),
  ).toHaveAttribute("href", "https://arxiv.org/pdf/2610.22279");
  await paper.hover();
  await expect(page.locator(".publication-preview")).toContainText(
    "derived category of perfect complexes",
  );
  await expect(paper).not.toContainText("TBA");
  await page.locator('[data-language="zh-CN"]').click();
  await expect(paper.locator("h3")).toHaveText("环簇上的张量生成线丛");
  await expect(paper.locator(".publication-venue")).toHaveText("预印本");
  await expect(paper.locator(".publication-authors")).toContainText("曾相如");
  await expect(page.locator(".publication-preview")).toContainText(
    "完美复形的导出范畴",
  );
  await expect(
    paper.getByRole("link", { name: "arXiv", exact: true }),
  ).toHaveAttribute("href", "https://arxiv.org/abs/2610.22279");
});
