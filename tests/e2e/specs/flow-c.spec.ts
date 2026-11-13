import { expect, test, type Page } from "@playwright/test";
import { signInOperator } from "../helpers/cms";
import { fillDetails, freshGstin, typeGstin } from "../helpers/join";
import { addAuthenticator, enterCode, newEmail, ownIp, requestCode } from "../helpers/sign-in";

// Flow C (Figma page 18, playbook step 8.8): a supplier from For Suppliers to a live listing. Join with company search
// and GSTIN → onboarding checklist → verification documents → payout bank account (passkey) → storefront → datasheet
// upload and review → submit → an operator verifies the company and approves the listing → Listing approved email →
// the product is live. Needs the app, the worker (GSTIN, file checks, datasheet reader), storage and Mailpit; runs in
// CI at 1440 and 390 with video.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
test.use({ video: "on" });

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function upload(page: Page, name: string) {
  await page.locator("input[type=file]").first().setInputFiles({ name, mimeType: "application/pdf", buffer: PDF });
  await expect(page.getByText(name)).toBeVisible();
}

test("flow C: a supplier joins, sets up and gets a listing live", async ({ page, browser }, info) => {
  test.setTimeout(420_000);
  const email = newEmail("flow-c");
  const company = `Flow C Works ${String(Date.now()).slice(-6)}${info.project.name.startsWith("mobile") ? "M" : "D"}`;

  // 1 For Suppliers → Join as a supplier, with a passkey for later.
  await page.goto("/for-suppliers");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await addAuthenticator(page);
  await page.goto("/sign-in");
  await enterCode(page, await requestCode(page, email));
  await expect(page.getByRole("heading", { name: "Set up a passkey" })).toBeVisible();
  await page.getByRole("button", { name: "Create passkey" }).click();
  await expect(page.getByRole("heading", { name: "Join H2 India" })).toBeVisible();
  await page.getByText("Supplier company", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Company name or GSTIN").fill("zz-no-such-company");
  await page.getByRole("button", { name: /Create a new company/ }).click();
  await fillDetails(page, { name: "Arjun Raghavan" });
  await page.getByRole("button", { name: "Continue" }).click();
  await typeGstin(page, freshGstin());
  await page.getByLabel("Company name").fill(company);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(`${company} is set up as a supplier company.`)).toBeVisible();

  // 2 The onboarding checklist.
  await page.goto("/supplier");
  await expect(page.getByRole("heading", { name: `Set up ${company} on H2 India` })).toBeVisible();

  // 3 Verification documents: GST certificate and PAN.
  for (const [doc, number, file] of [
    ["GST certificate", "", "gst.pdf"],
    ["PAN card", "AAKCT1234A", "pan.pdf"],
  ] as const) {
    await page.goto("/supplier/verification");
    await page.getByRole("button", { name: "Upload a document" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Upload a document" });
    await dialog.getByLabel("Document").selectOption({ label: doc });
    await upload(page, file);
    if (number) await dialog.getByLabel("Number").fill(number);
    else await dialog.getByLabel("Number").fill("27AAKCT1234A1Z5");
    await expect(dialog.getByText(/Ready|uploaded/i).first()).toBeVisible({ timeout: 60_000 });
    await dialog.getByRole("button", { name: "Upload" }).click();
    await expect(dialog).toBeHidden();
  }

  // 4 Payout bank account, confirmed with the passkey.
  await page.goto("/supplier/bank");
  await page.getByLabel("Account number", { exact: true }).fill("50100234564417");
  await page.getByLabel("Account number again").fill("50100234564417");
  await page.getByLabel("IFSC").fill("HDFC0001234");
  await page.getByLabel("Account holder").fill(company);
  await page.getByRole("button", { name: "Check this account" }).click();
  await expect(page.getByText("Test deposit matched")).toBeVisible();
  await page.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(page.getByText("Payouts active")).toBeVisible();

  // 5 Storefront basics.
  await page.goto("/supplier/storefront");
  await page.getByRole("button", { name: "About" }).click();
  await page.getByLabel(`About ${company}`).fill("Diaphragm compressors made in India.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Saved as a draft")).toBeVisible();

  // 6 A product from a datasheet: upload, check the fields, submit.
  await page.goto("/supplier/products/datasheet");
  await upload(page, "PDC-500-datasheet.pdf");
  await page.getByRole("button", { name: "Read the datasheet" }).click();
  await expect(page.getByRole("heading", { name: "Check what we read from your datasheet" })).toBeVisible();
  await expect(page.getByText(/fields found/)).toBeVisible({ timeout: 90_000 });
  for (;;) {
    const accept = page.getByRole("button", { name: "Accept" }).first();
    if (!(await accept.isVisible().catch(() => false))) break;
    await accept.click();
  }
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page).toHaveURL(/\/supplier\/products/);
  // The editor asks for commercial terms if the datasheet had none.
  if (
    await page
      .getByRole("button", { name: "Submit for review" })
      .isVisible()
      .catch(() => false)
  ) {
    await page.getByLabel("Lead time, shortest").fill("14");
    await page.getByLabel("Lead time, longest").fill("16");
    await page.getByRole("button", { name: "Submit for review" }).click();
  }

  // 7 Submit the company for review from the checklist.
  await page.goto("/supplier");
  await page.getByRole("button", { name: "Submit for review" }).click();

  // 8 An operator verifies the documents, approves the company and the listing.
  const op = await browser.newContext();
  const opPage = await op.newPage();
  await signInOperator(opPage, "Super admin");
  await opPage.goto("/admin/verification?tab=action");
  await opPage
    .getByRole("link", { name: new RegExp(company) })
    .first()
    .click();
  for (;;) {
    const verify = opPage.getByRole("button", { name: /^Verify/ }).first();
    if (!(await verify.isVisible().catch(() => false))) break;
    await verify.click();
    await opPage.waitForTimeout(500);
  }
  await opPage.getByRole("checkbox", { name: "Company identity: GST registration and incorporation" }).click();
  await opPage.getByRole("checkbox", { name: "Bank account in the company's name" }).click();
  await opPage.getByRole("button", { name: "Approve and verify" }).click();
  await opPage.goto("/admin/queues/listings");
  await opPage
    .getByRole("link", { name: /^Review/ })
    .first()
    .click();
  await opPage.getByRole("button", { name: /Approve listing/ }).click();
  await op.close();

  // 9 Listing approved arrives; the product is live.
  await expect
    .poll(
      async () => {
        const r = await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
        const list = ((await r.json()) as { messages?: { Subject: string }[] }).messages ?? [];
        return list.some((m) => m.Subject.startsWith("Approved:"));
      },
      { message: "the Listing approved email", timeout: 60_000 },
    )
    .toBe(true);
  await page.goto("/supplier/products?tab=live");
  await expect(page.getByRole("link", { name: /from datasheet|PDC|Product/ }).first()).toBeVisible();
});
