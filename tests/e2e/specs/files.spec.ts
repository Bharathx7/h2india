import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "../fixtures";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Step 3.7: uploads (18:164, 505:329) through the lost-email support request (528:534, 528:664). Needs the worker,
// storage and the virus scanner running, as docker compose and CI provide.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
test.skip(({ isMobile }) => isMobile, "the upload journeys run once, at desktop width");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
const EICAR = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");

async function fillForm(page: Page) {
  await page.goto("/forgot-access/email");
  const form = page.getByRole("form", { name: "Or send a support request" });
  await form.getByLabel("Full name", { exact: true }).fill("Arjun Shah");
  await form.getByLabel("Company", { exact: true }).fill("Greenfield Hydrogen");
  await form.getByLabel("An email we can reach you on").fill("arjun.shah.work@example.com");
  return form;
}

test("a support request with a work ID is checked, sent and gets a reference", async ({ page }) => {
  const form = await fillForm(page);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(axe.violations).toEqual([]);

  await form
    .locator('input[type="file"]')
    .setInputFiles({ name: "work-id.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(form.getByText("PDF · 1 KB")).toBeVisible({ timeout: 30_000 });
  await expect(form.getByRole("img", { name: "Uploaded" })).toBeVisible();

  const since = new Date().toISOString();
  await form.getByRole("button", { name: "Send request" }).click();
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "We've got your request" })).toBeVisible();
  await expect(main).toContainText(
    "Our support team will check your ID with Greenfield Hydrogen and email arjun.shah.work@example.com within 2 working days.",
  );
  const reference = (await main.getByText(/^SUP-\d{4}-\d{5}$/).textContent()) ?? "";
  expect(reference).toMatch(/^SUP-/);
  await expect(main.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/sign-in");

  // Support is emailed with a link to the review page; nothing goes to the unproven contact address.
  await expect
    .poll(async () => {
      const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`subject:"${reference}"`)}`);
      const body = (await res.json()) as { messages: { Created: string; To: { Address: string }[] }[] };
      return body.messages.filter((m) => Date.parse(m.Created) >= Date.parse(since)).map((m) => m.To[0]?.Address);
    })
    .toEqual(["support@h2india.local"]);

  // The work ID can't be opened by someone signed out.
  const fileId = await withDb(async (db) => {
    const r = await db.query<{ document_file_id: string }>(
      "SELECT document_file_id FROM core.recovery_requests WHERE reference = $1",
      [reference],
    );
    return r.rows[0]?.document_file_id ?? "";
  });
  const res = await page.request.get(`/api/v1/files/${fileId}/link`, { maxRedirects: 0 });
  expect(res.status()).toBe(404);

  // Support (an operator with queue and Users access) reviews it, opens the work ID and marks it handled.
  const requestId = await withDb(async (db) => {
    const r = await db.query<{ id: string }>("SELECT id FROM core.recovery_requests WHERE reference = $1", [reference]);
    return r.rows[0]?.id ?? "";
  });
  const email = newEmail("support-op");
  await signInNew(page, email);
  await withDb((db) =>
    db.query(
      "INSERT INTO core.operator_roles (user_id, role_id) SELECT u.id, r.id FROM core.users u, core.roles r WHERE u.email = $1 AND r.scope = 'operator' AND r.name = 'Operations'",
      [email],
    ),
  );
  await page.goto(`/account/recovery/${requestId}`);
  await expect(main.getByRole("heading", { name: "Lost email: check their ID" })).toBeVisible();
  await expect(main).toContainText(reference);
  await expect(main).toContainText("arjun.shah.work@example.com");
  const opened = await page.request.get(`/api/v1/files/${fileId}/link`, { maxRedirects: 0 });
  expect(opened.status()).toBe(303);
  const pdf = await fetch(opened.headers().location ?? "");
  expect(pdf.status).toBe(200);
  expect(pdf.headers.get("content-type")).toBe("application/pdf");
  await main.getByRole("button", { name: "Mark as handled" }).click();
  await expect(main.getByRole("status")).toContainText("This request is closed.");
});

test("a file with a virus is refused, and everything else stays filled in", async ({ page }) => {
  const form = await fillForm(page);
  await form
    .locator('input[type="file"]')
    .setInputFiles({ name: "id.pdf", mimeType: "application/pdf", buffer: EICAR });
  await expect(
    form.getByText("id.pdf failed our virus check and was deleted. Upload a different file.").first(),
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(form.getByText("That file can't be used")).toBeVisible();
  await expect(form.getByText("Work ID not uploaded")).toBeVisible();
  await expect(form.getByLabel("Full name")).toHaveValue("Arjun Shah");
  await form.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByRole("heading", { name: "We've got your request" })).toHaveCount(0);
});

test("a file of the wrong type or over the limit is caught before it uploads", async ({ page }) => {
  const form = await fillForm(page);
  await form
    .locator('input[type="file"]')
    .setInputFiles({ name: "scan.tiff", mimeType: "image/tiff", buffer: Buffer.from("II*\u0000") });
  await expect(form.getByText("That file can't be used")).toBeVisible();
  await expect(form.getByText("scan.tiff can't be used. Use PDF, JPG or PNG, up to 10 MB.")).toBeVisible();
  await form.locator('input[type="file"]').setInputFiles({
    name: "big.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(11 * 1024 * 1024, 0x25),
  });
  await expect(form.getByText("big.pdf is 11 MB. Use PDF, JPG or PNG, up to 10 MB.")).toBeVisible();
});
