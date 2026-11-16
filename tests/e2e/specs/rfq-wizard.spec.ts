import { expect, test } from "../fixtures";
import { enterCode, newEmail, ownIp, requestCode } from "../helpers/sign-in";

// Step 9.3: the RFQ wizard. A signed-out visitor fills in a request, signs in, and finds it waiting (399:11005);
// every validation message shows inline (399:10344). Needs the app and Mailpit; runs in CI at 1440 and 390.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("shows the designed messages and keeps a signed-out draft through sign-in", async ({ page }) => {
  await page.goto("/rfq/new");
  await expect(page.getByRole("heading", { name: "Request a quote", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Fix 3 fields to continue")).toBeVisible();
  await expect(page.getByText("Enter a quantity").first()).toBeVisible();

  await page.getByLabel("Category").selectOption({ index: 1 });
  await page.getByLabel("Title").fill("2 × diaphragm compressors for 350 bar refuelling");
  await page.getByLabel("Quantity").fill("2");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: /2 · Choose suppliers/ })).toBeVisible();
  // The draft waits in this browser.
  await expect(page.getByText("Draft kept in this browser")).toBeVisible();

  await page.goto("/sign-in?next=/rfq/new");
  await enterCode(page, await requestCode(page, newEmail("rfq-wizard")));
  await page.goto("/rfq/new");
  await expect(page.getByLabel("Title")).toHaveValue("2 × diaphragm compressors for 350 bar refuelling");
});
