import { expect, test } from "@playwright/test";

test("homepage hero leads with customer value and real marketplace proof", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  const hero = page.locator("[data-home-hero]");
  await expect(hero.getByRole("heading", { level: 1, name: "Pronađi pravu ribolovnu opremu" })).toBeVisible();
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(hero.locator("img")).toHaveCount(0);
  await expect(page.locator("header img[src='/brand/logo.svg']")).toBeVisible();

  const proof = hero.locator("[data-marketplace-proof]");
  await expect(proof).toBeVisible();
  expect(await proof.locator("[data-marketplace-proof-listing]").count()).toBeGreaterThan(0);
  await expect(proof.getByText("Aktivni oglasi", { exact: true })).toBeVisible();
});

test("mobile hero keeps search and posting actions in the first viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const hero = page.locator("[data-home-hero]");
  const search = hero.getByPlaceholder("Pretraži Shimano, Daiwa, feeder...");
  const post = hero.getByRole("link", { name: "Postavi oglas" });
  await expect(search).toBeVisible();
  await expect(post).toBeVisible();

  const actionBounds = await post.boundingBox();
  expect(actionBounds).not.toBeNull();
  expect((actionBounds?.y ?? 844) + (actionBounds?.height ?? 0)).toBeLessThanOrEqual(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
