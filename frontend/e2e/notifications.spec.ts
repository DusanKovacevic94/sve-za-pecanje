import { expect, test } from "./fixtures";

test("notification polling pauses while hidden and resumes when visible", async ({
  page,
  context,
  accounts,
  apiLogin,
}) => {
  await apiLogin(context.request, accounts.administrator);
  await page.addInitScript(() => {
    const state = window as Window & {
      __notificationTestVisibility?: DocumentVisibilityState;
    };
    state.__notificationTestVisibility = "hidden";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => state.__notificationTestVisibility,
    });
  });

  const notificationRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.includes("/notifications")) {
      notificationRequests.push(request.url());
    }
  });

  await page.goto("/nalog/obavestenja");
  await page.waitForTimeout(500);
  expect(notificationRequests).toHaveLength(0);

  await page.evaluate(() => {
    const state = window as Window & {
      __notificationTestVisibility?: DocumentVisibilityState;
    };
    state.__notificationTestVisibility = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await expect
    .poll(() => notificationRequests.length)
    .toBeGreaterThanOrEqual(2);
  await expect(
    page.getByRole("heading", { name: "Obaveštenja" })
  ).toBeVisible();
});
