import { expect, test } from "../fixtures";
import { cms, signInOperator } from "../helpers/cms";
import { rfqSetup, signInExisting } from "../helpers/rfq";
import { ownIp, withDb } from "../helpers/sign-in";

// The Launch 1 gaps (13 Nov 2026): Edit RFQ after sending (564:383) and the message drawer (561:252); Let H2 Economy
// suggest suppliers (398:9635) with the moderator adding one; newsletter Stats (647:660) and the composer's chart and
// sponsor slot (648:312); Save view on a queue. Needs the app and Mailpit (sign-in codes).
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("a buyer edits a sent RFQ; the supplier sees version 2 and messages the buyer from the drawer", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(180_000);
  const s = await rfqSetup();
  await signInExisting(page, s.buyerEmail, `/buyer/rfqs/${s.rfqId}`);
  await page.goto(`/buyer/rfqs/${s.rfqId}`);
  await expect(page.getByRole("heading", { level: 1, name: new RegExp(s.reference) })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Edit RFQ" }).click();
  const dialog = page.getByRole("dialog", { name: `Edit ${s.reference}` });
  await dialog.getByLabel("Quantity").fill("3");
  await dialog.getByLabel("What changed (shown to suppliers)").fill("Added a third unit for the second dispenser");
  await dialog.getByRole("button", { name: "Save as version 2" }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });

  const other = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  await ownIp(other, info);
  const supplier = await other.newPage();
  await signInExisting(supplier, s.supplierEmail, `/supplier/rfqs/${s.rfqId}`);
  await supplier.goto(`/supplier/rfqs/${s.rfqId}`);
  await expect(supplier.getByText(/The buyer changed this RFQ: version 2/)).toBeVisible();
  await expect(supplier.getByText(/Added a third unit for the second dispenser/)).toBeVisible();

  await supplier.getByRole("button", { name: "Message the buyer" }).click();
  const drawer = supplier.getByRole("dialog", { name: /^Messages · / });
  await expect(drawer).toBeVisible();
  const text = `Can you confirm the site voltage? ${s.tag}`;
  await drawer.getByRole("textbox", { name: /^Write a message to / }).fill(text);
  await drawer.getByRole("button", { name: "Send" }).click();
  await expect(drawer.getByText(text)).toBeVisible({ timeout: 15_000 });
  await other.close();
});

test("let H2 Economy suggest suppliers: the wizard allows none; the moderator adds a verified one", async ({
  page,
  browser,
}, info) => {
  test.skip(info.project.name.startsWith("mobile"), "the moderation half is desktop only (627:1001)");
  test.setTimeout(180_000);
  const s = await rfqSetup();
  await signInExisting(page, s.buyerEmail, "/rfq/new");
  await page.goto("/rfq/new");
  await page.getByLabel("Category").selectOption({ label: `Equipment › Gap compressors ${s.tag}` });
  await page.getByLabel("Title").fill("2 × diaphragm compressors for 350 bar refuelling");
  await page.getByLabel("Quantity").fill("2");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: /2 · Choose suppliers/ })).toBeVisible();
  await page.getByRole("switch", { name: "Let H2 Economy suggest suppliers" }).click();
  await expect(page.getByText(/H2 Economy will add verified suppliers that fit/)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Choose at least one supplier, or let H2 Economy suggest them")).toHaveCount(0);

  // A suggest-suppliers RFQ waiting in moderation: the moderator adds the verified supplier and approves.
  const waiting = await rfqSetup({ suggest: true });
  const op = await browser.newContext();
  await ownIp(op, info);
  const mod = await op.newPage();
  await signInOperator(mod, "Super admin");
  await mod.goto(`/admin/queues/rfqs/${waiting.rfqId}`);
  await expect(mod.getByText("Suggested suppliers to add")).toBeVisible();
  await mod.getByRole("checkbox", { name: new RegExp(waiting.supplierName) }).click();
  await mod.getByRole("button", { name: "Approve and send" }).click();
  await expect
    .poll(
      () =>
        withDb(async (db) => {
          const r = await db.query<{ status: string; n: string }>(
            `SELECT r.status, (SELECT count(*) FROM core.rfq_suppliers x WHERE x.rfq_id = r.id)::text AS n FROM core.rfqs r WHERE r.id = $1`,
            [waiting.rfqId],
          );
          return r.rows[0];
        }),
      { timeout: 20_000 },
    )
    .toEqual({ status: "Sent", n: "1" });
  await op.close();
});

test("newsletter: no stats before sending; the composer refuses a sponsor without an https link", async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith("mobile"), "desktop only (627:1001)");
  await signInOperator(page, "Editor-in-chief");
  const n = 900 + Math.floor(Math.random() * 9000);
  const created = await cms(page.request, "POST", "newsletter-issues?draft=true", {
    list: "weekly",
    number: n,
    sentOn: new Date().toISOString(),
    title: `H2 Economy Weekly #${String(n)}`,
    slug: `india-h2-weekly-${String(n)}-${String(Date.now())}`,
  });
  expect(created.status).toBe(201);
  const id = created.body.doc?.id ?? 0;

  await page.goto(`/admin/content/newsletter/${String(id)}/stats`);
  await expect(page.getByText("No figures yet")).toBeVisible();

  await page.goto(`/admin/content/newsletter/${String(id)}`);
  await expect(page.getByLabel("Chart of the week")).toBeVisible();
  await page.getByRole("textbox", { name: /^Subject/ }).fill("Green ammonia bids keep falling");
  await page.getByLabel("Sponsor sponsor").fill("Pranava H2");
  await page.getByLabel("Sponsor headline").fill("PDC-500 diaphragm compressor");
  await page.getByLabel("Sponsor link (https://)").fill("http://example.org");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Give the sponsor's link, starting with https://")).toBeVisible();
  await page.getByLabel("Sponsor link (https://)").fill("https://example.org/pdc-500");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();
});

test("an operator saves a queue view and deletes it", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "desktop only (627:1001)");
  await signInOperator(page, "Super admin");
  await page.goto("/admin/queues/events?view=late");
  await page.getByRole("button", { name: "Save view" }).click();
  await page.getByLabel("Name of the view").fill("Late events");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("link", { name: "Late events" })).toBeVisible();
  await page.getByRole("button", { name: "Delete the view Late events" }).click();
  await expect(page.getByRole("link", { name: "Late events" })).toHaveCount(0);
});
