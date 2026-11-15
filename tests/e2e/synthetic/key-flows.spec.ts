import { expect, test } from "@playwright/test";

// Synthetic check (step 13.3). Read-only: a search returns results, and the RFQ wizard opens and keeps a draft in the
// browser (a signed-out draft never reaches the server, LOCAL_DRAFT_KEY).

test("search answers with results", async ({ page }) => {
  await page.goto("/search?q=hydrogen");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link").first()).toBeVisible({ timeout: 15_000 });
});

test("the RFQ wizard opens and takes a requirement", async ({ page }) => {
  await page.goto("/rfq/new");
  await expect(page.getByRole("region", { name: "Steps" })).toBeVisible();
  const field = page.getByRole("main").getByRole("textbox").first();
  await field.fill("Synthetic check: 1 MW PEM electrolyser");
  await expect(field).toHaveValue("Synthetic check: 1 MW PEM electrolyser");
});
