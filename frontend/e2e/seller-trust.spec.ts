import { expect, test } from "./fixtures";

test("seller trust facts remain separate from listing engagement", async ({
  page,
  request,
  backendURL,
}) => {
  const response = await request.get(`${backendURL}/api/v1/listings`);
  expect(response.ok(), await response.text()).toBeTruthy();
  const listings = (await response.json()).data as Array<{ slug: string; status: string }>;
  const listing = listings.find((item) => item.status === "active");
  expect(listing).toBeTruthy();

  await page.goto(`/oglasi/${listing!.slug}`);
  const sellerPanel = page.locator("main aside").first();
  const trust = sellerPanel.locator('[data-trust-variant="full"]');
  await expect(trust).toBeVisible();
  await expect(trust.locator("[data-trust-fact]")).toHaveCount(4);
  expect(await trust.locator("[data-trust-fact]").evaluateAll((facts) =>
    facts.map((fact) => fact.getAttribute("data-trust-fact"))
  )).toEqual(["verification", "rating", "sales", "member"]);
  await expect(trust.getByText(/nisu garancija bezbedne transakcije/)).toBeVisible();

  const sellerActivity = sellerPanel.locator("[data-seller-activity]");
  await expect(sellerActivity.locator('svg[data-icon="add-listing"]')).toBeVisible();
  await expect(sellerActivity).toContainText("aktivnih oglasa prodavca");
  await expect(sellerPanel.locator('svg[data-icon="view"]')).toHaveCount(0);
});

test("seller profile keeps trust and marketplace activity in separate groups", async ({ page }) => {
  await page.goto("/prodavci/demo_pecaros");

  await expect(page.locator('[data-trust-variant="full"]')).toBeVisible();
  const activity = page.locator("[data-seller-activity]");
  await expect(activity.locator('svg[data-icon="add-listing"]')).toBeVisible();
  await expect(activity.locator('svg[data-icon="followed-user"]')).toBeVisible();
});
