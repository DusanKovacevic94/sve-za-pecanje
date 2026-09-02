import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const snapshotStyle = path.join(__dirname, "visual-snapshot.css");

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/prijava");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Lozinka").fill(password);
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await expect(page).toHaveURL(/\/nalog(?:\?|$)/);
}

async function expectBrandScreenshot(page: Page, name: string, fullPage = false) {
  await settle(page);
  await expect(page).toHaveScreenshot(name, {
    animations: "disabled",
    caret: "hide",
    fullPage,
    stylePath: snapshotStyle,
  });
}

test("anonymous homepage visual baseline", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectBrandScreenshot(page, "anonymous-homepage.png");
});

test("anonymous mobile listing visual baseline", async ({ page, request }) => {
  const response = await request.get("http://127.0.0.1:8011/api/v1/listings?limit=1");
  expect(response.ok(), await response.text()).toBeTruthy();
  const payload = await response.json();
  const listing = payload.data[0] as { slug: string; title: string } | undefined;
  expect(listing).toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/oglasi/${listing?.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: listing?.title })).toBeVisible();
  await expectBrandScreenshot(page, "anonymous-listing-mobile.png");
});

test("buyer favorites visual baseline", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, "visual-buyer@example.com", "VisualBuyer123!");
  await page.goto("/nalog/omiljeni");
  await expect(page.getByRole("heading", { level: 1, name: "Omiljeni oglasi" })).toBeVisible();
  await expect(page.locator("[data-listing-card]")).toHaveCount(1);
  await expectBrandScreenshot(page, "buyer-favorites.png");
});

test("seller inventory visual baseline", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, "demo@svezapecanje.rs", "Demo12345!");
  await page.goto("/nalog/oglasi");
  await expect(page.getByRole("heading", { level: 1, name: "Moji oglasi" })).toBeVisible();
  expect(await page.locator("[data-listing-card]").count()).toBeGreaterThan(0);
  await expectBrandScreenshot(page, "seller-inventory.png");
});

test("icon catalogue visual baseline at all canonical sizes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dev/icons");
  await expect(page.locator("[data-catalog-icon]")).toHaveCount(73);
  await expect(page.locator("[data-catalog-icon] svg[data-icon]")).toHaveCount(73 * 4);
  await expectBrandScreenshot(page, "icon-catalogue-14-18-24-32.png", true);
});
