import { expect, test } from "@playwright/test";

test("core discovery surfaces do not overflow a 320px viewport", async ({ page, request }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  const response = await request.get("http://127.0.0.1:8011/api/v1/listings?limit=1");
  expect(response.ok(), await response.text()).toBeTruthy();
  const listing = (await response.json()).data[0] as { slug: string };
  await page.goto(`/oglasi/${listing.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("supporting content remains usable at 200 percent text size", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.goto("/saveti-za-bezbednost");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Otvori kontakt formu" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  ).toBe(true);
});
