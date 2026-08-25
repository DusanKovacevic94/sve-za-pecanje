import { expect, test } from "@playwright/test";

test("brand catalog exposes the vector identity without layout overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/brand");

  await expect(page.getByRole("heading", { name: "Sve Za Pecanje brand system" })).toBeVisible();
  await expect(page.locator("[data-brand-swatch]")).toHaveCount(5);
  await expect(page.locator("svg[data-brand-motif]")).toBeVisible();
  await expect(page.locator("main img[src='/brand/logo.svg']")).toBeVisible();
  await expect(page.locator("main img[src='/brand/logo-inverse.svg']")).toBeVisible();

  const iconSvgs = page.locator("main svg[data-icon]");
  await expect(iconSvgs).toHaveCount(5);
  expect(
    await iconSvgs.evaluateAll((items) =>
      items.every((item) => item.getAttribute("viewBox") === "0 0 24 24")
    )
  ).toBe(true);

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  ).toBe(true);
});
