import { expect, test } from "@playwright/test";

test("custom icon catalog is complete, accessible, and responsive", async ({
  page,
}) => {
  await page.goto("/dev/icons");
  await expect(
    page.getByRole("heading", { name: "Custom icon catalog" })
  ).toBeVisible();

  const cards = page.locator("[data-catalog-icon]");
  await expect(cards).toHaveCount(73);

  const names = await cards.evaluateAll((items) =>
    items.map((item) => item.getAttribute("data-catalog-icon"))
  );
  expect(new Set(names).size).toBe(73);

  const renderedIcons = cards.locator("svg[data-icon]");
  await expect(renderedIcons).toHaveCount(73 * 4);
  expect(
    await renderedIcons.evaluateAll((items) =>
      items.every(
        (item) =>
          item.getAttribute("viewBox") === "0 0 24 24" &&
          item.getAttribute("focusable") === "false" &&
          item.getAttribute("aria-hidden") === "true" &&
          item.getBoundingClientRect().width > 0 &&
          item.getBoundingClientRect().height > 0
      )
    )
  ).toBe(true);

  await expect(
    page.getByRole("img", { name: "Labelled icon example" })
  ).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );
  expect(hasHorizontalOverflow).toBe(false);
});

