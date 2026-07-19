import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "./fixtures";

const validPng = readFileSync(path.resolve(__dirname, "../src/app/icon.png"));

test("registration-to-sale marketplace journey", async ({
  page: sellerPage,
  context: sellerContext,
  browser,
  request,
  accounts,
  backendURL,
  registerAndVerify,
  login,
  apiLogin,
  runBackgroundTask
}) => {
  test.setTimeout(180_000);
  const suffix = accounts.seller.username.split("_").at(-1);
  const listingTitle = `E2E Shimano spin štap ${suffix}`;
  const savedSearchName = `E2E oprema ${suffix}`;
  const buyerMessage = `Da li je štap dostupan? E2E ${suffix}`;
  const sellerReply = `Dostupan je, možemo se dogovoriti. E2E ${suffix}`;
  const reportDescription = `E2E provera prijave ${suffix}`;

  await test.step("seller registers, verifies email, and signs in", async () => {
    await registerAndVerify(sellerPage, accounts.seller);
    await login(sellerPage, accounts.seller);
  });

  let listingId = "";
  let listingSlug = "";
  await test.step("seller creates a listing in manual moderation and manages images", async () => {
    await sellerPage.goto("/postavi-oglas");
    await sellerPage.getByLabel("Kategorija").selectOption({ label: "↳ Spin štapovi" });
    await sellerPage.getByLabel("Naslov").fill(listingTitle);
    await expect(sellerPage.getByText("Sačuvano", { exact: true })).toBeVisible();
    await sellerPage.reload();
    await expect(sellerPage.getByLabel("Naslov")).toHaveValue(listingTitle);
    await sellerPage
      .getByLabel("Opis")
      .fill("Detaljan E2E opis Shimano spin štapa, očuvanog i spremnog za pecanje.");
    await sellerPage.getByLabel("Brend").selectOption({ label: "Shimano" });
    await sellerPage.getByLabel("Model").fill(`E2E-${suffix}`);
    await sellerPage.getByLabel("Grad").fill("Beograd");
    await sellerPage.getByLabel("Cena").fill("12500");

    const rodType = sellerPage.getByLabel(/Tip štapa/);
    if (await rodType.count()) {
      await rodType.selectOption("spinning");
    }
    await sellerPage.getByLabel(/Dužina/).fill("240");
    const draftFileInput = sellerPage.getByLabel("Dodaj sliku");
    await draftFileInput.setInputFiles({ name: "front.png", mimeType: "image/png", buffer: validPng });
    await expect(sellerPage.locator("section").filter({ hasText: "5. Slike" }).locator("article")).toHaveCount(1);
    await sellerPage.getByRole("button", { name: "Pošalji na pregled" }).click();
    await expect(sellerPage).toHaveURL(/\/oglasi\/[^/?]+$/);
    listingSlug = new URL(sellerPage.url()).pathname.split("/").at(-1) ?? "";

    const editLink = sellerPage.getByRole("link", { name: "Izmeni oglas" });
    listingId = (await editLink.getAttribute("href"))?.split("/").at(-1) ?? "";
    expect(listingId).not.toBe("");

    const publicBeforeApproval = await request.get(
      `${backendURL}/api/v1/listings?q=${encodeURIComponent(listingTitle)}`
    );
    expect(publicBeforeApproval.ok()).toBeTruthy();
    expect((await publicBeforeApproval.json()).data).toHaveLength(0);

    await editLink.click();
    const fileInput = sellerPage.getByLabel("Dodaj sliku");
    await fileInput.setInputFiles({ name: "detail.png", mimeType: "image/png", buffer: validPng });
    await expect(sellerPage.locator("section").filter({ hasText: "5. Slike" }).locator("article")).toHaveCount(2);
    await fileInput.setInputFiles({ name: "condition.png", mimeType: "image/png", buffer: validPng });

    const imageCards = sellerPage.locator("section").filter({ hasText: "5. Slike" }).locator("article");
    await expect(imageCards).toHaveCount(3);
    await imageCards.nth(1).getByRole("button", { name: "Postavi kao naslovnu" }).click();
    await expect(imageCards.nth(1).getByText("Naslovna")).toBeVisible();
    await imageCards.nth(1).getByRole("button", { name: "Pomeri gore" }).click();
    await expect(imageCards.nth(0).getByText("Naslovna")).toBeVisible();
  });

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await test.step("administrator approves the listing and it becomes public", async () => {
    await apiLogin(adminContext.request, accounts.administrator);
    const approval = await adminContext.request.post(
      `${backendURL}/api/v1/admin/listings/${listingId}/approve`
    );
    expect(approval.ok(), await approval.text()).toBeTruthy();

    await expect
      .poll(async () => {
        const response = await request.get(
          `${backendURL}/api/v1/listings?q=${encodeURIComponent(listingTitle)}`
        );
        return (await response.json()).data.map((item: { id: string }) => item.id);
      })
      .toContain(listingId);

    await adminPage.goto(`/admin/oglasi`);
    await expect(adminPage.getByText(listingTitle)).toBeVisible();
  });

  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await test.step("buyer registers and restores multi-value filters from a saved search", async () => {
    await registerAndVerify(buyerPage, accounts.buyer);
    await login(buyerPage, accounts.buyer);

    await buyerPage.goto(`/oglasi?q=${encodeURIComponent(listingTitle)}&category=spin-stapovi`);
    const filters = buyerPage.locator("aside");
    await filters.locator("#category-filter-options summary").click();
    await filters.getByRole("checkbox", { name: "Feeder štapovi", exact: true }).check();
    await filters.locator("#brand-filter-options summary").click();
    await filters.getByRole("checkbox", { name: "Shimano", exact: true }).check();
    await filters.getByRole("checkbox", { name: "Daiwa", exact: true }).check();
    await filters.getByRole("button", { name: "Primeni filtere" }).click();

    const attributeFilters = buyerPage.locator("aside");
    const rodTypes = attributeFilters.getByLabel("Tip štapa");
    if (await rodTypes.count()) {
      await rodTypes.selectOption(["spinning", "feeder"]);
    }
    await attributeFilters.getByLabel("Dužina od", { exact: true }).fill("220");
    await attributeFilters.getByRole("button", { name: "Primeni filtere" }).click();

    let filteredURL = new URL(buyerPage.url());
    expect(filteredURL.searchParams.getAll("category")).toEqual(["spin-stapovi", "feeder-stapovi"]);
    expect(filteredURL.searchParams.getAll("brand_id")).toHaveLength(2);
    expect(filteredURL.searchParams.get("attributes[length_cm][min]")).toBe("220");
    await expect(buyerPage.getByText(listingTitle, { exact: true })).toBeVisible();

    await buyerPage.reload();
    filteredURL = new URL(buyerPage.url());
    expect(filteredURL.searchParams.getAll("category")).toHaveLength(2);
    expect(filteredURL.searchParams.getAll("brand_id")).toHaveLength(2);

    await buyerPage.getByRole("link", { name: "Sačuvaj pretragu" }).click();
    await buyerPage.getByLabel("Naziv").fill(savedSearchName);
    await buyerPage.getByRole("button", { name: "Sačuvaj", exact: true }).click();
    await expect(
      buyerPage.locator("#sadrzaj").getByText("Pretraga je sačuvana.", { exact: true })
    ).toBeVisible();

    const savedSearch = buyerPage.locator("article").filter({ hasText: savedSearchName });
    await savedSearch.getByRole("link", { name: "Pokreni" }).click();
    filteredURL = new URL(buyerPage.url());
    expect(filteredURL.searchParams.getAll("category")).toHaveLength(2);
    expect(filteredURL.searchParams.getAll("brand_id")).toHaveLength(2);
    expect(filteredURL.searchParams.get("attributes[length_cm][min]")).toBe("220");

    await buyerPage.getByRole("link", { name: "Spin štapovi ×" }).click();
    await expect
      .poll(() => new URL(buyerPage.url()).searchParams.getAll("category"))
      .toEqual(["feeder-stapovi"]);
    filteredURL = new URL(buyerPage.url());
    expect(filteredURL.searchParams.getAll("brand_id")).toHaveLength(2);
  });

  let conversationId = "";
  await test.step("buyer favorites, reports, and sends the first message", async () => {
    await buyerPage.goto(`/oglasi/${listingSlug}`);
    const listingActions = buyerPage.locator("main aside").first();
    await listingActions.getByRole("button", { name: "Dodaj u omiljene" }).click();
    await expect(
      listingActions.getByRole("button", { name: "Sačuvano u omiljenim" })
    ).toBeVisible();

    buyerPage.once("dialog", (dialog) => dialog.accept(reportDescription));
    await listingActions.getByRole("button", { name: "Prijavi oglas" }).click();
    await expect(buyerPage.getByText("Hvala, prijava je poslata.")).toBeVisible();

    await listingActions.getByRole("link", { name: "Pošalji poruku" }).click();
    await buyerPage.getByPlaceholder("Napišite poruku prodavcu...").fill(buyerMessage);
    await buyerPage.getByRole("button", { name: "Pošalji" }).click();
    await expect(buyerPage).toHaveURL(/\/nalog\/poruke\/[^/?]+$/);
    conversationId = new URL(buyerPage.url()).pathname.split("/").at(-1) ?? "";
    expect(conversationId).not.toBe("");
  });

  await test.step("seller sees unread state, reads the message, and replies", async () => {
    await sellerPage.goto("/nalog/poruke");
    const conversation = sellerPage.getByRole("link").filter({ hasText: listingTitle });
    await expect(conversation.getByText("1 novo")).toBeVisible();
    await conversation.click();
    await expect(sellerPage).toHaveURL(new RegExp(`/nalog/poruke/${conversationId}$`));
    await expect(sellerPage.getByText(buyerMessage)).toBeVisible();

    await expect
      .poll(async () => {
        const unreadResponse = await sellerContext.request.get(
          `${backendURL}/api/v1/users/me/unread-count`
        );
        expect(unreadResponse.ok()).toBeTruthy();
        return (await unreadResponse.json()).data.unread_count;
      })
      .toBe(0);

    await sellerPage.getByPlaceholder("Napišite odgovor...").fill(sellerReply);
    await sellerPage.getByRole("button", { name: "Pošalji" }).click();
    await expect(sellerPage.getByText(sellerReply)).toBeVisible();

    await buyerPage.reload();
    await expect(buyerPage.getByText(sellerReply)).toBeVisible();
  });

  await test.step("administrator resolves the buyer report", async () => {
    await adminPage.goto("/admin/prijave");
    let report = adminPage.locator("article").filter({ hasText: reportDescription });
    await expect(report.getByText("open", { exact: true })).toBeVisible();
    await report.getByRole("button", { name: "Reši" }).click();
    report = adminPage.locator("article").filter({ hasText: reportDescription });
    await expect(report.getByText("resolved", { exact: true })).toBeVisible();
  });

  await test.step("seller selects the buyer, marks sold, and both users review", async () => {
    await sellerPage.goto("/nalog/oglasi");
    sellerPage.once("dialog", (dialog) => dialog.accept("1"));
    await sellerPage.getByRole("button", { name: "Prodato", exact: true }).click();
    await expect
      .poll(async () => {
        const response = await sellerContext.request.get(
          `${backendURL}/api/v1/listings/${listingSlug}`
        );
        return (await response.json()).data.status;
      })
      .toBe("sold");

    const buyerReview = `Odličan prodavac E2E ${suffix}`;
    await buyerPage.goto("/nalog/ocene");
    const buyerReviewForm = buyerPage.locator("form").filter({ hasText: listingTitle });
    await buyerReviewForm.getByLabel("Komentar").fill(buyerReview);
    await buyerReviewForm.getByRole("button", { name: "Ostavi ocenu" }).click();
    await expect(buyerPage.getByText(buyerReview)).toBeVisible();

    const sellerReview = `Pouzdan kupac E2E ${suffix}`;
    await sellerPage.goto("/nalog/ocene");
    const sellerReviewForm = sellerPage.locator("form").filter({ hasText: listingTitle });
    await sellerReviewForm.getByLabel("Komentar").fill(sellerReview);
    await sellerReviewForm.getByRole("button", { name: "Ostavi ocenu" }).click();
    await expect(sellerPage.getByText(sellerReview)).toBeVisible();
  });

  runBackgroundTask("marketplace_metrics");
  await adminContext.close();
  await buyerContext.close();
});
