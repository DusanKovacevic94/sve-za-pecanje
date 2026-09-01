import { expect, test } from "./fixtures";

test("reduced motion keeps state feedback while suppressing movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  expect(
    await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)
  ).toBe("auto");

  const primaryAction = page.locator("main").getByRole("link", { name: "Postavi oglas" }).first();
  await primaryAction.focus();
  expect(
    await primaryAction.evaluate((element) => getComputedStyle(element).outlineStyle)
  ).not.toBe("none");
  await primaryAction.hover();
  expect(
    await primaryAction.evaluate((element) => getComputedStyle(element).transform)
  ).toBe("none");

  const categoryCard = page.locator("[data-motion-card]").first();
  await expect(categoryCard).toBeVisible();
  await categoryCard.hover();
  expect(
    await categoryCard.evaluate((element) => getComputedStyle(element).transform)
  ).toBe("none");

  await page.goto("/oglasi");
  const listingCard = page.locator("[data-listing-card]").first();
  await expect(listingCard).toBeVisible();
  await listingCard.hover();
  expect(
    await listingCard.evaluate((element) => getComputedStyle(element).transform)
  ).toBe("none");

  await page.goto("/dev/brand");
  const skeleton = page.locator("[data-motion-skeleton]");
  await expect(skeleton).toBeVisible();
  expect(
    await skeleton.evaluate((element) => getComputedStyle(element).animationName)
  ).toBe("none");

  const loadingButton = page.locator("[data-motion-loading]");
  await expect(loadingButton).toContainText("Čuvanje");
  const spinner = loadingButton.locator("[data-icon='spinner']");
  await expect(spinner).toBeVisible();
  expect(
    await spinner.evaluate((element) => getComputedStyle(element).animationName)
  ).toBe("none");
});
