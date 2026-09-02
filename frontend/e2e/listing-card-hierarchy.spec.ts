import { expect, test, type Page } from "@playwright/test";

type CardMeasurement = {
  height: number;
  left: number;
  right: number;
  metadataTreatments: number;
  attributeCount: number;
  statusCount: number;
  statusesHaveText: boolean;
};

async function measureCards(page: Page): Promise<CardMeasurement[]> {
  const cards = page.locator("[data-listing-card]");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThanOrEqual(3);

  return cards.evaluateAll((elements) =>
    elements.slice(0, 3).map((element) => {
      const bounds = element.getBoundingClientRect();
      const statuses = [...element.querySelectorAll("[data-listing-statuses] > span")];
      return {
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        metadataTreatments: element.querySelectorAll("[data-listing-meta]").length,
        attributeCount: element.querySelectorAll('[data-listing-meta="attributes"] > span').length,
        statusCount: statuses.length,
        statusesHaveText: statuses.every((status) => Boolean(status.textContent?.trim())),
      };
    }),
  );
}

function expectStableHierarchy(cards: CardMeasurement[]) {
  expect(cards.every((card) => card.metadataTreatments <= 3)).toBe(true);
  expect(cards.every((card) => card.attributeCount <= 2)).toBe(true);
  expect(cards.every((card) => card.statusCount <= 2)).toBe(true);
  expect(cards.every((card) => card.statusesHaveText)).toBe(true);

  const heights = cards.map((card) => card.height);
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(2);
}

test("listing cards prioritize buyer decision facts in large grids", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/oglasi");

  const cards = page.locator("[data-listing-card]");
  const firstCard = cards.first();
  await expect(firstCard.locator("[data-listing-title]")).toBeVisible();
  await expect(firstCard.locator("[data-listing-price]")).toBeVisible();
  await expect(firstCard.locator("[data-listing-condition]")).toBeVisible();
  await expect(firstCard.locator("[data-listing-location]")).toBeVisible();
  await expect(firstCard.getByText("Fiksna cena", { exact: true })).toHaveCount(0);
  await expect(firstCard.getByText("Lično preuzimanje", { exact: true })).toHaveCount(0);

  expectStableHierarchy(await measureCards(page));
});

test("listing cards remain aligned without horizontal overflow at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/oglasi");

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const measurements = await measureCards(page);
  expectStableHierarchy(measurements);
  expect(measurements.every((card) => card.left >= 0 && card.right <= 320)).toBe(true);
});
