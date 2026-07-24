import { expect, test } from "./fixtures";

function suggestion(
  id: string,
  display: string,
  value: string
) {
  return {
    id,
    type: "common_query",
    display,
    value,
    href: `/oglasi?q=${encodeURIComponent(value)}`,
    description: "Test predlog",
    source: "curated"
  };
}

test("search suggestions are accessible, stale-safe, and optional", async ({ page }) => {
  await page.route("**/api/v1/search/suggestions?*", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    if (query === "shi") {
      await new Promise((resolve) => setTimeout(resolve, 650));
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ data: [suggestion("query:old", "Stari predlog", "stari")] })
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: [suggestion("query:new", "Novi predlog", "novi")] })
    });
  });

  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Pretraga" });
  await search.fill("shi");
  await page.waitForTimeout(320);
  await search.fill("dai");
  await expect(page.getByRole("option", { name: /Novi predlog/ })).toBeVisible();
  await page.waitForTimeout(700);
  await expect(page.getByText("Stari predlog")).toHaveCount(0);

  await search.press("ArrowDown");
  await expect(search).toHaveAttribute("aria-activedescendant", /option-0$/);
  await search.press("Escape");
  await expect(search).toHaveAttribute("aria-expanded", "false");

  await page.unroute("**/api/v1/search/suggestions?*");
  await page.route("**/api/v1/search/suggestions?*", (route) => route.abort());
  await search.fill("izraz bez predloga");
  await page.waitForTimeout(350);
  await search.press("Enter");
  await expect(page).toHaveURL(/\/oglasi\?q=izraz(?:\+|%20)bez(?:\+|%20)predloga/);
});

test("zero results preserve filters and offer focused recovery actions", async ({ page }) => {
  await page.goto(
    "/oglasi?q=shimnao&category=masinice&price_min=99999999"
  );

  await expect(
    page.getByRole("heading", { name: "Nema oglasa za izabranu pretragu" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Da li ste mislili?" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Uklonite samo jedan filter" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sačuvaj ovu pretragu" })).toBeVisible();

  await page.getByRole("link", { name: /Ukloni: Od 99999999/ }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.has("price_min"))
    .toBeFalsy();
  const url = new URL(page.url());
  expect(url.searchParams.get("q")).toBe("shimnao");
  expect(url.searchParams.get("category")).toBe("masinice");
});
