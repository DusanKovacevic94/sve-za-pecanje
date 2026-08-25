import { expect, test } from "./fixtures";

test("home, listings search, and privacy pages render", async ({ page }) => {
  await page.goto("/");
  const homeLinks = page.getByRole("link", { name: /Sve Za Pecanje/ });
  await expect(homeLinks.first()).toBeVisible();
  await expect(homeLinks.first().locator("img")).toHaveAttribute("src", "/brand/logo.svg");
  await expect(page.locator("main img[src='/brand/logo-inverse.svg']")).toBeVisible();
  await expect(homeLinks.last().locator("img")).toHaveAttribute("src", "/brand/logo-inverse.svg");

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
