import { expect, test } from "./fixtures";

test("curated landing crawl matrix and faceted URL policy", async ({
  page,
  accounts,
  apiLogin,
  backendURL,
  seedSeoScenario,
}) => {
  test.setTimeout(120_000);
  const scenario = seedSeoScenario();
  await apiLogin(page.context().request, accounts.administrator);

  await test.step("administrator previews, creates, and edits a curated landing", async () => {
    await page.goto("/admin/seo");
    await page.getByLabel("Kategorija").selectOption(scenario.category_id);
    await page.getByLabel("Brend (opciono)").selectOption(scenario.brand_id);
    await page
      .getByLabel("SEO naslov")
      .fill("Shimano spin štapovi | Sve Za Pecanje");
    await page
      .getByLabel("Meta opis")
      .fill(
        "Pregledajte aktivne Shimano spin štapove, uporedite ponude i pronađite odgovarajući model za ribolov.",
      );
    await page
      .getByLabel("Uvodni tekst")
      .fill(
        "Kurirana ponuda Shimano spin štapova sa jasnim cenama, stanjem opreme i opcijama dostave.",
      );
    await page.getByRole("button", { name: "Pregledaj uslove" }).click();
    await expect(page.getByText("5 aktivnih / minimum 5")).toBeVisible();
    await expect(page.getByText("index,follow", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Sačuvaj", exact: true }).click();
    await expect(page.getByText("SEO landing je sačuvan.")).toBeVisible();

    await page
      .getByLabel("SEO naslov")
      .fill("Shimano spin štapovi i oprema | Sve Za Pecanje");
    await page.getByRole("button", { name: "Sačuvaj", exact: true }).click();
    await expect(page.getByText("SEO landing je sačuvan.")).toBeVisible();
  });

  const cleanPath = `/kategorije/${scenario.category_slug}/brend/${scenario.brand_slug}`;
  await test.step("clean landing is indexable, canonical, and structured", async () => {
    const response = await page.goto(cleanPath);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", {
        name: "Shimano spin štapovi i oprema | Sve Za Pecanje",
      }),
    ).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${cleanPath}$`),
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /index, follow/,
    );
    await expect(page.getByRole("navigation", { name: "Putanja" })).toContainText(
      scenario.brand_name,
    );
    await expect(
      page.locator('script[type="application/ld+json"]'),
    ).toHaveCount(2);
  });

  await test.step("faceted, pagination, and unknown parameters are noindex", async () => {
    const queryPath =
      `/oglasi?category=${scenario.category_slug}` +
      `&brand_id=${scenario.brand_id}&sort=price_asc&page=2`;
    await page.goto(queryPath);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex, follow/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${cleanPath}$`),
    );

    await page.goto("/oglasi?future_filter=anything");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex, follow/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/oglasi$/,
    );
  });

  await test.step("thin landings stay out of the sitemap and listing canonicals remain stable", async () => {
    const categoriesResponse = await page.request.get(
      `${backendURL}/api/v1/categories`,
    );
    expect(categoriesResponse.ok()).toBeTruthy();
    const roots = (await categoriesResponse.json()).data as Array<{
      slug: string;
      active_count: number;
      children: Array<{ slug: string; active_count: number }>;
    }>;
    const candidates = roots.flatMap((root) => [root, ...root.children]);
    const thin = candidates.find(
      (item) =>
        item.active_count === 0 && item.slug !== scenario.category_slug,
    );
    expect(thin).toBeTruthy();
    await page.goto(`/kategorije/${thin!.slug}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex, follow/,
    );

    const sitemap = await page.request.get("/sitemap.xml");
    const xml = await sitemap.text();
    expect(xml).toContain(cleanPath);
    expect(xml).not.toContain(`/kategorije/${thin!.slug}</loc>`);
    expect(xml).not.toContain("/oglasi?");

    const detailPath = `/oglasi/${scenario.listing_slug}`;
    const listingResponse = await page.goto(detailPath);
    expect(listingResponse?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${detailPath}$`),
    );
  });

  await test.step("robots.txt blocks every known facet family", async () => {
    const robots = await page.request.get("/robots.txt");
    const body = await robots.text();
    for (const parameter of [
      "q",
      "category",
      "brand_id",
      "city",
      "price_min",
      "price_max",
      "sort",
      "page",
    ]) {
      expect(body).toContain(`Disallow: /oglasi?*${parameter}=`);
    }
    expect(body).toContain("Disallow: /oglasi?*attributes[");
    expect(body).toContain("Sitemap:");
  });
});
