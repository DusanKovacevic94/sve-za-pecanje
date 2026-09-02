import { expect, test } from "@playwright/test";

const supportingPages = [
  { path: "/saveti-za-bezbednost", heading: "Proveri opremu, dogovor i prodavca" },
  { path: "/o-nama", heading: "Marketplace napravljen za ribolovačku opremu" },
  { path: "/kontakt", heading: "Kontakt" },
  { path: "/uslovi-koriscenja", heading: "Uslovi korišćenja" },
  { path: "/privatnost", heading: "Privatnost" },
  { path: "/za-prodavnice", heading: "Prodavnica na Sve Za Pecanje" },
] as const;

for (const supportingPage of supportingPages) {
  test(`${supportingPage.path} uses the editorial structure without narrow overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(supportingPage.path);

    await expect(page.getByRole("heading", { level: 1, name: supportingPage.heading })).toBeVisible();
    await expect(page.locator("main h1")).toHaveCount(1);
    expect(await page.getByRole("heading", { level: 2 }).count()).toBeGreaterThan(0);
    await expect(page.locator("main svg[data-brand-motif]")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}

test("safety guidance follows the transaction and reporting journey", async ({ page }) => {
  await page.goto("/saveti-za-bezbednost");

  await expect(page.locator("article section[id]")).toHaveCount(4);
  await expect(page.locator("article section[id] h2")).toHaveText([
    "Pre nego što kontaktiraš prodavca",
    "Dok dogovaraš kupovinu",
    "Pri preuzimanju i plaćanju",
    "Ako primetiš problem",
  ]);
  await expect(page.getByText("Prijavi sumnjiv oglas preko dugmeta na stranici oglasa.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Otvori kontakt formu" })).toBeVisible();
});

test("legal rewrites retain the existing policy statements", async ({ page }) => {
  await page.goto("/uslovi-koriscenja");
  await expect(page.getByText(/Platforma ne poseduje predmete iz oglasa/)).toBeVisible();
  await expect(page.getByText(/Zabranjeni su nelegalna ribolovna oprema/)).toBeVisible();
  await expect(page.getByText(/Administratori mogu ukloniti sadržaj/)).toBeVisible();

  await page.goto("/privatnost");
  await expect(page.getByText(/Email adrese se ne prikazuju javno/)).toBeVisible();
  await expect(page.getByText(/Umami analitiku bez kolačića/)).toBeVisible();
  await expect(page.getByText(/Zahtev za brisanje naloga/)).toBeVisible();
});
