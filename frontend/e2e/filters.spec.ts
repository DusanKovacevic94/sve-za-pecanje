import { expect, test } from "./fixtures";

test("category and brand controls preserve multiple values without duplicate choices", async ({ page }) => {
  await page.goto("/oglasi?category=stapovi");
  const filters = page.locator("aside");
  await expect(filters.getByText("Detalji: Štapovi")).toBeVisible();

  await filters.locator('[id$="category-filter-options"] summary').click();
  await expect(filters.getByRole("checkbox", { name: "Štapovi", exact: true })).toHaveCount(1);
  await expect(filters.getByRole("checkbox", { name: "Spin štapovi", exact: true })).toHaveCount(1);
  await filters.locator('[id$="category-filter-options"] summary').click();

  const rodTypes = filters.getByRole("group", { name: "Tip štapa" });
  await rodTypes.getByRole("checkbox", { name: "Spin", exact: true }).check();
  await rodTypes.getByRole("checkbox", { name: "Feeder", exact: true }).check();
  await filters.getByLabel("Dužina od", { exact: true }).fill("200");
  await filters.locator('[id$="brand-filter-options"] summary').click();
  await filters.getByRole("checkbox", { name: "Shimano", exact: true }).check();
  await filters.getByRole("checkbox", { name: "Daiwa", exact: true }).check();
  await filters.getByRole("button", { name: "Primeni filtere" }).click();

  let url = new URL(page.url());
  expect(url.searchParams.getAll("attributes[rod_type]")).toEqual(["spinning", "feeder"]);
  expect(url.searchParams.get("attributes[length_cm][min]")).toBe("200");
  expect(url.searchParams.getAll("brand_id")).toHaveLength(2);

  await page.reload();
  const reloadedFilters = page.locator("aside");
  const reloadedRodTypes = reloadedFilters.getByRole("group", { name: "Tip štapa" });
  await expect(reloadedRodTypes.getByRole("checkbox", { name: "Spin", exact: true })).toBeChecked();
  await expect(reloadedRodTypes.getByRole("checkbox", { name: "Feeder", exact: true })).toBeChecked();
  await reloadedFilters.locator('[id$="brand-filter-options"] summary').click();
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

  await page.locator('aside [id$="category-filter-options"] summary').click();
  await page.locator("aside").getByRole("checkbox", { name: "Štapovi", exact: true }).uncheck();
  await page.locator("aside").getByRole("checkbox", { name: "Spin mašinice", exact: true }).check();
  await page.locator("aside").getByRole("checkbox", { name: "Šaranske mašinice", exact: true }).check();
  await page.locator("aside").getByRole("button", { name: "Primeni filtere" }).click();
  url = new URL(page.url());
  expect(url.searchParams.getAll("category")).toEqual(["spin-masinice", "saranske-masinice"]);
  expect([...url.searchParams.keys()].some((key) => key.startsWith("attributes["))).toBe(false);
});

test("mobile filter drawer preserves multi-select values and keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/oglasi?category=spin-stapovi&category=feeder-stapovi");

  const trigger = page.getByRole("button", { name: /^Filteri/ });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Filteri" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Zatvori filtere" })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  await drawer.getByRole("button", { name: "Zatvori filtere" }).press("Shift+Tab");
  await expect(drawer.getByRole("button", { name: /Prikaži \d+ rezultat/ })).toBeFocused();

  await drawer.locator('[id$="category-filter-options"] summary').click();
  await expect(drawer.getByRole("checkbox", { name: "Spin štapovi", exact: true })).toBeChecked();
  await expect(drawer.getByRole("checkbox", { name: "Feeder štapovi", exact: true })).toBeChecked();

  const rodTypes = drawer.getByRole("group", { name: "Tip štapa" });
  await rodTypes.getByRole("checkbox", { name: "Spin", exact: true }).check();
  const rodTypeSearch = drawer.getByPlaceholder("Pretraži: Tip štapa");
  await rodTypeSearch.fill("Feeder");
  await rodTypes.getByRole("checkbox", { name: "Feeder", exact: true }).check();

  await drawer.locator('[id$="brand-filter-options"] summary').click();
  const brandSearch = drawer.getByPlaceholder("Pretraži brendove");
  await brandSearch.fill("Shimano");
  await drawer.getByRole("checkbox", { name: "Shimano", exact: true }).check();
  await brandSearch.fill("Daiwa");
  await drawer.getByRole("checkbox", { name: "Daiwa", exact: true }).check();

  await drawer.getByRole("button", { name: /Prikaži \d+ rezultat/ }).click();
  await expect(page).toHaveURL(/attributes%5Brod_type%5D=spinning/);
  let url = new URL(page.url());
  expect(url.searchParams.getAll("category")).toEqual(["spin-stapovi", "feeder-stapovi"]);
  expect(url.searchParams.getAll("brand_id")).toHaveLength(2);
  expect(url.searchParams.getAll("attributes[rod_type]")).toEqual(["spinning", "feeder"]);
  await expect(page.getByRole("link", { name: "Tip štapa: Spin, Feeder", exact: true })).toBeVisible();

  await trigger.click();
  const reopenedDrawer = page.getByRole("dialog", { name: "Filteri" });
  await reopenedDrawer.locator('[id$="brand-filter-options"] summary').click();
  await expect(reopenedDrawer.getByRole("checkbox", { name: "Shimano", exact: true })).toBeChecked();
  await expect(reopenedDrawer.getByRole("checkbox", { name: "Daiwa", exact: true })).toBeChecked();
  const reopenedRodTypes = reopenedDrawer.getByRole("group", { name: "Tip štapa" });
  await expect(reopenedRodTypes.getByRole("checkbox", { name: "Spin", exact: true })).toBeChecked();
  await expect(reopenedRodTypes.getByRole("checkbox", { name: "Feeder", exact: true })).toBeChecked();

  await page.keyboard.press("Escape");
  await expect(reopenedDrawer).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.getByRole("link", { name: "Shimano", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.getAll("brand_id").length).toBe(1);
  url = new URL(page.url());
  expect(url.searchParams.getAll("attributes[rod_type]")).toEqual(["spinning", "feeder"]);
});
