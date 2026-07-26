import { expect, test } from "./fixtures";

test("user verifies a private phone and changing it clears trust", async ({
  page,
  accounts,
  registerAndVerify,
  login,
}) => {
  await registerAndVerify(page, accounts.seller);
  await login(page, accounts.seller);
  await page.goto("/nalog/profil");

  await expect(
    page.getByRole("heading", { name: "Potvrda broja telefona" })
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Telefon", exact: true })
    .fill("064 123 4567");
  await page.getByRole("button", { name: "Sačuvaj profil" }).click();
  await expect(page.getByText("Profil je ažuriran.")).toBeVisible();

  await page
    .getByRole("button", { name: "Pošalji verifikacioni kod" })
    .click();
  await expect(page.getByText(/Kod je poslat na \+381/)).toBeVisible();
  await page.getByLabel("Šestocifreni kod").fill("123456");
  await page.getByRole("button", { name: "Potvrdi kod" }).click();
  await expect(page.getByText("Telefon je potvrđen")).toBeVisible();

  await page.goto(`/prodavci/${accounts.seller.username}`);
  await expect(page.getByText("Telefon potvrđen")).toBeVisible();
  await expect(page.getByText("Email potvrđen")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("064 123 4567");
  await expect(page.locator("body")).not.toContainText("+381641234567");
  await expect(
    page.getByText(/nisu garancija bezbedne transakcije/)
  ).toBeVisible();

  await page.goto("/nalog/profil");
  await page
    .getByRole("textbox", { name: "Telefon", exact: true })
    .fill("065 999 8877");
  await expect(
    page.getByText("Sačuvajte izmenjeni broj pre slanja koda.")
  ).toBeVisible();
  await page.getByRole("button", { name: "Sačuvaj profil" }).click();
  await expect(page.getByText("Profil je ažuriran.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pošalji verifikacioni kod" })
  ).toBeVisible();
  await expect(page.getByText("Telefon je potvrđen")).toHaveCount(0);
});
