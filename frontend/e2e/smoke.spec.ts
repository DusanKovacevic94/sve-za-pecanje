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

test("authentication feedback exposes semantic error and success states", async ({ page }) => {
  await page.route("**/api/v1/auth/login", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Email ili lozinka nisu ispravni." } })
    });
  });
  await page.route("**/api/v1/auth/resend-verification", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { message: "Ako nalog postoji, poslali smo novi email." } })
    });
  });
  await page.route("**/api/v1/auth/register", async (route) => {
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Email adresa je već registrovana." } })
    });
  });

  await page.goto("/prijava");
  await page.getByLabel("Email").fill("ribolovac@example.com");
  await page.getByLabel("Lozinka").fill("PogresnaLozinka123!");
  await page.getByRole("button", { name: "Prijavi se" }).click();

  const errorAlert = page.locator("[role='alert'][data-alert-tone='error']");
  await expect(errorAlert).toHaveAttribute("data-alert-tone", "error");
  await expect(errorAlert).toContainText("Email ili lozinka nisu ispravni.");
  await expect(errorAlert.locator("[data-icon='alert']")).toBeVisible();

  await page.getByRole("button", { name: "Pošalji ponovo verifikacioni email" }).click();

  await expect(page.locator("[data-alert-tone='error']")).toHaveCount(0);
  const successStatus = page.locator("[role='status'][data-alert-tone='success']");
  await expect(successStatus).toHaveAttribute("data-alert-tone", "success");
  await expect(successStatus).toContainText("Ako nalog postoji, poslali smo novi email.");
  await expect(successStatus.locator("[data-icon='success']")).toBeVisible();

  await page.goto("/registracija");
  await page.getByLabel("Email").fill("ribolovac@example.com");
  await page.getByLabel("Korisničko ime").fill("ribolovac");
  await page.getByLabel("Lozinka").fill("PogresnaLozinka123!");
  await page.getByLabel(/Prihvatam uslove korišćenja/).check();
  await page.getByRole("button", { name: "Registruj se" }).click();

  const registrationError = page.locator("[role='alert'][data-alert-tone='error']");
  await expect(registrationError).toHaveCount(1);
  await expect(registrationError).toContainText("Email adresa je već registrovana.");
});

test("anonymous visitors authenticate before posting an ad", async ({ page, accounts }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const postListingLink = page.getByRole("banner").getByRole("link", { name: "Postavi oglas" });
  await expect(postListingLink).toBeVisible();
  await expect(postListingLink).toHaveAttribute("aria-label", "Postavi oglas");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth)
  );
  await postListingLink.click();

  await expect(page).toHaveURL(/\/prijava\?next=%2Fpostavi-oglas$/);
  await expect(page.getByText("Prijavite se da biste postavili oglas.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Registrujte se" })).toHaveAttribute(
    "href",
    "/registracija?next=%2Fpostavi-oglas"
  );

  await page.goto("/postavi-oglas");
  await expect(page).toHaveURL(/\/prijava\?next=%2Fpostavi-oglas$/);
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Email").fill(accounts.administrator.email);
  await page.getByLabel("Lozinka").fill(accounts.administrator.password);
  await page.getByRole("button", { name: "Prijavi se" }).click();

  await expect(page).toHaveURL(/\/postavi-oglas$/);
  await expect(page.getByRole("heading", { name: "Postavi oglas" })).toBeVisible();

  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Mobilna navigacija" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth)
  );
});
