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

test("category filters preserve repeated values and clear stale attributes", async ({ page }) => {
  await page.goto("/oglasi?category=stapovi");
  const filters = page.locator("aside");
  await expect(filters.getByText("Detalji: Štapovi")).toBeVisible();

  await filters.getByLabel("Tip štapa").selectOption(["spinning", "feeder"]);
  await filters.getByLabel("Dužina od", { exact: true }).fill("200");
  await filters.getByRole("button", { name: "Primeni filtere" }).click();

  let url = new URL(page.url());
  expect(url.searchParams.getAll("attributes[rod_type]")).toEqual([
    "spinning",
    "feeder"
  ]);
  expect(url.searchParams.get("attributes[length_cm][min]")).toBe("200");

  await page.getByLabel("Sortiranje oglasa").selectOption("price_asc");
  await page.getByRole("button", { name: "Sortiraj" }).click();
  url = new URL(page.url());
  expect(url.searchParams.getAll("attributes[rod_type]")).toEqual([
    "spinning",
    "feeder"
  ]);

  await filters.getByLabel("Kategorija").selectOption("masinice");
  await filters.getByRole("button", { name: "Primeni filtere" }).click();
  url = new URL(page.url());
  expect(url.searchParams.get("category")).toBe("masinice");
  expect([...url.searchParams.keys()].some((key) => key.startsWith("attributes["))).toBe(false);
});
