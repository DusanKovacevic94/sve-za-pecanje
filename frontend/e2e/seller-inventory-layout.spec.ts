import { expect, test } from "@playwright/test";

test("seller controls stay inside the inventory flow and above the footer", async ({ page }) => {
  await page.goto("/prijava");
  await page.getByLabel("Email").fill("demo@svezapecanje.rs");
  await page.getByLabel("Lozinka").fill("Demo12345!");
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await expect(page).toHaveURL(/\/nalog(?:\?|$)/);
  await page.goto("/nalog/oglasi");
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const reserve = page.getByRole("button", { name: "Rezerviši", exact: true }).first();
    await expect(reserve).toBeVisible();
    await reserve.scrollIntoViewIfNeeded();
    expect(await reserve.evaluate((button) => {
      const box = button.getBoundingClientRect();
      const footer = document.querySelector("footer")!.getBoundingClientRect();
      const main = document.querySelector("main")!.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return box.bottom <= main.bottom && box.bottom <= footer.top && button.contains(hit);
    }), `reserve button is contained and hit-testable at ${width}px`).toBe(true);
    await reserve.click({ trial: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
