import { expect, test } from "./fixtures";

test("user manages sessions, requests an export, and recovers a closing account", async ({
  page,
  browser,
  accounts,
  backendURL,
  registerAndVerify,
  login,
  runBackgroundTask,
}) => {
  test.setTimeout(120_000);
  await registerAndVerify(page, accounts.seller);
  await login(page, accounts.seller);

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await login(otherPage, accounts.seller);

  await page.goto("/nalog/bezbednost");
  await expect(page.getByRole("heading", { name: "Bezbednost i privatnost" })).toBeVisible();
  await expect(page.getByText("Ova sesija", { exact: true })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(2);

  await page.getByRole("button", { name: "Odjavi sve druge" }).click();
  await expect(page.getByText("Odjavljeno sesija: 1.")).toBeVisible();
  const revokedCheck = await otherContext.request.get(`${backendURL}/api/v1/auth/me`);
  expect(revokedCheck.status()).toBe(401);

  await page.getByRole("button", { name: "Zatraži izvoz" }).click();
  await expect(page.getByText("Na čekanju", { exact: true })).toBeVisible();
  runBackgroundTask("data_exports");
  await page.reload();
  await expect(page.getByText("Poslat link", { exact: true })).toBeVisible();

  await page.getByLabel("Unesite OBRIŠI da potvrdite").fill("OBRIŠI");
  await page.getByRole("button", { name: "Zatraži zatvaranje" }).click();
  await expect(page).toHaveURL(/\/prijava$/);

  await login(page, accounts.seller);
  await page.goto("/nalog/bezbednost");
  await expect(page.getByText(/Nalog je sakriven i biće anonimizovan/)).toBeVisible();
  await page.getByLabel("Unesite ZADRŽI da otkažete zatvaranje").fill("ZADRŽI");
  await page.getByRole("button", { name: "Zadrži nalog" }).click();
  await expect(page.getByText("Zatvaranje naloga je otkazano.")).toBeVisible();
  await expect(page.getByText(/Aktivni oglasi i prodavnica se odmah skrivaju/)).toBeVisible();

  await otherContext.close();
});
