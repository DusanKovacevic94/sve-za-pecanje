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
    const path = new URL(request.url()).pathname;
    if (path.includes("/notifications")) {
      notificationRequests.push(path);
    }
  });

  await page.goto("/nalog/obavestenja");
  await expect(
    page.getByRole("heading", { name: "Obaveštenja" })
  ).toBeVisible();
  await page.waitForTimeout(500);
  expect(notificationRequests).toHaveLength(0);

  await expect
    .poll(async () => {
      await page.evaluate(() => {
        const state = window as Window & {
          __notificationTestVisibility?: DocumentVisibilityState;
        };
        state.__notificationTestVisibility = "visible";
        document.dispatchEvent(new Event("visibilitychange"));
      });
      return {
        center: notificationRequests.includes("/api/v1/notifications"),
        bell: notificationRequests.includes(
          "/api/v1/notifications/unread-count"
        ),
      };
    })
    .toEqual({ center: true, bell: true });
});
