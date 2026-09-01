import { expect, test } from "./fixtures";

test("anonymous mobile buyers get persistent listing actions and safe auth returns", async ({
  page,
  request,
  backendURL
}) => {
  const response = await request.get(`${backendURL}/api/v1/listings`);
  expect(response.ok(), await response.text()).toBeTruthy();
  const listings = (await response.json()).data as Array<{
    id: string;
    slug: string;
    status: string;
  }>;
  const listing = listings.find((item) => item.status === "active");
  expect(listing).toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/oglasi/${listing!.slug}`);

  const mobileActions = page.getByRole("complementary", { name: "Brze akcije oglasa" });
  await expect(mobileActions).toBeVisible();
  await expect(mobileActions.locator("[data-mobile-listing-price]")).not.toBeEmpty();
  await expect(mobileActions.getByText("Aktivan oglas", { exact: true })).toBeVisible();
  await expect(mobileActions.getByRole("button", { name: "Dodaj u omiljene" })).toBeVisible();

  const messagePath = `/nalog/poruke?listing=${listing!.id}`;
  const messageLink = mobileActions.getByRole("link", { name: "Pošalji poruku" });
  await expect(messageLink).toHaveAttribute(
    "href",
    `/prijava?next=${encodeURIComponent(messagePath)}`
  );

  const sellerHeading = page.getByRole("heading", { name: "Prodavac" });
  const descriptionHeading = page.getByRole("heading", { name: "Opis" });
  expect(
    await sellerHeading.evaluate((seller, description) => Boolean(
      seller.compareDocumentPosition(description as Node) & Node.DOCUMENT_POSITION_FOLLOWING
    ), await descriptionHeading.elementHandle())
  ).toBe(true);

  const barBox = await mobileActions.boundingBox();
  expect(barBox).not.toBeNull();
  expect(Math.round((barBox?.y ?? 0) + (barBox?.height ?? 0))).toBeLessThanOrEqual(844);
  const contentPadding = await page.locator("main > div").first().evaluate(
    (element) => Number.parseFloat(getComputedStyle(element).paddingBottom)
  );
  expect(contentPadding).toBeGreaterThanOrEqual(barBox?.height ?? 0);

  await messageLink.click();
  await expect(page).toHaveURL(new RegExp(`/prijava\\?next=${encodeURIComponent(messagePath).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/oglasi/${listing!.slug}`);
  await expect(page.getByRole("complementary", { name: "Brze akcije oglasa" })).toBeHidden();
  const sellerPanel = page.locator("main aside").first();
  await expect(sellerPanel.getByRole("link", { name: "Pošalji poruku" })).toHaveAttribute(
    "href",
    `/prijava?next=${encodeURIComponent(messagePath)}`
  );
  expect(await sellerPanel.evaluate((element) => getComputedStyle(element).position)).toBe("sticky");
  await expect(page.locator("script[type='application/ld+json']")).toHaveCount(2);
});
