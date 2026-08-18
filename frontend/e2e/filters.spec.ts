import { expect, test } from "./fixtures";

test("category and brand controls preserve multiple values without duplicate choices", async ({ page }) => {
  await page.goto("/oglasi?category=stapovi");
  const filters = page.locator("aside");
  await expect(filters.getByText("Detalji: Štapovi")).toBeVisible();

  await filters.locator("#category-filter-options summary").click();
  await expect(filters.getByRole("checkbox", { name: "Štapovi", exact: true })).toHaveCount(1);
  await expect(filters.getByRole("checkbox", { name: "Spin štapovi", exact: true })).toHaveCount(1);
  await filters.locator("#category-filter-options summary").click();

  await filters.getByLabel("Tip štapa").selectOption(["spinning", "feeder"]);
  await filters.getByLabel("Dužina od", { exact: true }).fill("200");
  await filters.locator("#brand-filter-options summary").click();
  await filters.getByRole("checkbox", { name: "Shimano", exact: true }).check();
  await filters.getByRole("checkbox", { name: "Daiwa", exact: true }).check();
  await filters.getByRole("button", { name: "Primeni filtere" }).click();

  let url = new URL(page.url());
  expect(url.searchParams.getAll("attributes[rod_type]")).toEqual(["spinning", "feeder"]);
  expect(url.searchParams.get("attributes[length_cm][min]")).toBe("200");
  expect(url.searchParams.getAll("brand_id")).toHaveLength(2);

  await page.reload();
  const reloadedFilters = page.locator("aside");
  await expect(reloadedFilters.getByLabel("Tip štapa")).toHaveValues(["spinning", "feeder"]);
  await reloadedFilters.locator("#brand-filter-options summary").click();
  await expect(reloadedFilters.getByRole("checkbox", { name: "Shimano", exact: true })).toBeChecked();
  await expect(reloadedFilters.getByRole("checkbox", { name: "Daiwa", exact: true })).toBeChecked();

  await page.getByLabel("Sortiranje oglasa").selectOption("price_asc");
  await page.getByRole("button", { name: "Sortiraj" }).click();
  url = new URL(page.url());
  expect(url.searchParams.getAll("attributes[rod_type]")).toEqual(["spinning", "feeder"]);
  expect(url.searchParams.getAll("brand_id")).toHaveLength(2);

  await page.getByRole("link", { name: "Shimano", exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.getAll("brand_id").length)
    .toBe(1);
  url = new URL(page.url());
  expect(url.searchParams.getAll("attributes[rod_type]")).toEqual(["spinning", "feeder"]);

  await page.locator("aside #category-filter-options summary").click();
  await page.locator("aside").getByRole("checkbox", { name: "Štapovi", exact: true }).uncheck();
  await page.locator("aside").getByRole("checkbox", { name: "Spin mašinice", exact: true }).check();
  await page.locator("aside").getByRole("checkbox", { name: "Šaranske mašinice", exact: true }).check();
  await page.locator("aside").getByRole("button", { name: "Primeni filtere" }).click();
  url = new URL(page.url());
  expect(url.searchParams.getAll("category")).toEqual(["spin-masinice", "saranske-masinice"]);
  expect([...url.searchParams.keys()].some((key) => key.startsWith("attributes["))).toBe(false);
});
