import { expect, test } from "@playwright/test";

test("home, listings search, and privacy pages render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Sve Za Pecanje/ })).toBeVisible();

  await page.goto("/oglasi?q=stap");
  await expect(page.getByRole("heading", { name: /Oglasi/ })).toBeVisible();

  await page.goto("/privatnost");
  await expect(page.getByText(/Umami analitiku bez kolačića/)).toBeVisible();
});

test("auth forms expose expected fields", async ({ page }) => {
  await page.goto("/registracija");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Korisničko ime")).toBeVisible();
  await expect(page.getByLabel("Lozinka")).toBeVisible();
});
