import { expect, test } from "./fixtures";

test("guided listing workflow is navigable and validates clearly on mobile", async ({
  page,
  accounts,
  registerAndVerify,
  login
}) => {
  await registerAndVerify(page, accounts.seller);
  await login(page, accounts.seller);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/postavi-oglas");

  const progress = page.getByRole("navigation", { name: "Koraci za postavljanje oglasa" });
  await expect(progress).toBeVisible();
  await progress.getByRole("button", { name: "3. Detalji" }).click();
  const techniques = page.getByRole("group", { name: "Tehnika" });
  await techniques.getByRole("checkbox", { name: "Spin", exact: true }).check();
  await techniques.getByRole("checkbox", { name: "Feeder", exact: true }).check();
  await expect(techniques.getByRole("checkbox", { name: "Spin", exact: true })).toBeChecked();
  await expect(techniques.getByRole("checkbox", { name: "Feeder", exact: true })).toBeChecked();
  await progress.getByRole("button", { name: "5. Slike" }).click();
  await expect(page.getByRole("heading", { name: "5. Slike" })).toBeVisible();

  await expect(page.getByRole("button", { name: "Sačuvaj nacrt" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pošalji na pregled" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  await page.getByRole("button", { name: "Pošalji na pregled" }).click();
  await expect(page.getByText("Proverite podatke pre slanja", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Naslov")).toBeFocused();
  await expect(page.getByLabel("Fotografiši opremu")).toHaveAttribute("capture", "environment");
  await expect(page.getByLabel("Dodaj sliku")).toHaveAttribute("multiple", "");
});
