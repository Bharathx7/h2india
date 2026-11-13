import { expect, type Page } from "@playwright/test";
import { enterCode, newEmail, requestCode, withDb } from "./sign-in";

// RFQ test data written straight to the database (Launch 1 gaps): a buyer company with an Admin, a verified supplier
// with a Sales person and a live product in a fresh category, and an RFQ already sent to that supplier (or waiting in
// moderation with "Let H2 India suggest suppliers" on). Statuses here are fixtures; the app moves them in the tests.

export interface RfqSetup {
  tag: string;
  buyerEmail: string;
  supplierEmail: string;
  supplierName: string;
  supplierOrg: string;
  categoryId: string;
  rfqId: string;
  reference: string;
}

export async function rfqSetup(opts: { suggest?: boolean } = {}): Promise<RfqSetup> {
  const tag = String(Date.now()).slice(-7);
  const buyerEmail = newEmail(`rfq-buyer-${tag}`);
  const supplierEmail = newEmail(`rfq-supplier-${tag}`);
  const supplierName = `Konkan Compression ${tag}`;
  return withDb(async (db) => {
    const one = async (sql: string, args: unknown[]) => (await db.query<{ id: string }>(sql, args)).rows[0]?.id ?? "";
    const categoryId = await one(
      `INSERT INTO core.catalogue_categories (id, class_id, slug, label, position) VALUES (gen_random_uuid(), 'equipment', $1, $2, 94) RETURNING id`,
      [`gap-compressors-${tag}`, `Gap compressors ${tag}`],
    );
    const buyerOrg = await one(
      `INSERT INTO core.organisations (id, kind, legal_name, state) VALUES (gen_random_uuid(), 'buyer', $1, 'Maharashtra') RETURNING id`,
      [`Greenfield Gaps ${tag}`],
    );
    const supplierOrg = await one(
      `INSERT INTO core.organisations (id, kind, legal_name, verification, state) VALUES (gen_random_uuid(), 'supplier', $1, 'Verified', 'Maharashtra') RETURNING id`,
      [supplierName],
    );
    await db.query(`INSERT INTO core.company_profiles (organisation_id, slug, trade_name) VALUES ($1, $2, $3)`, [
      supplierOrg,
      `konkan-compression-${tag}`,
      supplierName,
    ]);
    await db.query(
      `INSERT INTO core.products (id, organisation_id, category_id, slug, name, status, published_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'Live', now())`,
      [supplierOrg, categoryId, `gap-pdc-${tag}`, `Gap PDC ${tag}`],
    );
    const person = async (email: string, name: string, org: string, role: string) => {
      const user = await one(
        `INSERT INTO core.users (id, email, name, email_verified) VALUES (gen_random_uuid(), $1, $2, true) RETURNING id`,
        [email, name],
      );
      await db.query(
        `INSERT INTO core.memberships (id, organisation_id, user_id, role) VALUES (gen_random_uuid(), $1, $2, $3)`,
        [org, user, role],
      );
      return user;
    };
    const buyer = await person(buyerEmail, "Ravi Gaps", buyerOrg, "Admin");
    await person(supplierEmail, "Sana Quoter", supplierOrg, "Sales");
    const site = await one(
      `INSERT INTO core.delivery_sites (id, organisation_id, name, address, state, is_default) VALUES (gen_random_uuid(), $1, 'Talegaon plant', 'Plot 14', 'Maharashtra', true) RETURNING id`,
      [buyerOrg],
    );
    const reference = `RFQ-2026-9${tag.slice(-3)}${String(Math.floor(Math.random() * 10))}`;
    const status = opts.suggest ? "In moderation" : "Sent";
    const rfqId = await one(
      `INSERT INTO core.rfqs (id, reference, organisation_id, created_by, status, title, category_id, requirements, delivery_site_id, offer_deadline, submitted_at, sent_at, suggest_suppliers)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, '500 bar outlet, oil-free', $7, now() + interval '10 days', now(), $8, $9) RETURNING id`,
      [
        reference,
        buyerOrg,
        buyer,
        status,
        `Diaphragm compressors ${tag}`,
        categoryId,
        site,
        opts.suggest ? null : new Date(),
        Boolean(opts.suggest),
      ],
    );
    await db.query(
      `INSERT INTO core.rfq_items (id, rfq_id, description, quantity) VALUES (gen_random_uuid(), $1, 'Diaphragm compressor', 2)`,
      [rfqId],
    );
    if (!opts.suggest)
      await db.query(
        `INSERT INTO core.rfq_suppliers (id, rfq_id, organisation_id, status) VALUES (gen_random_uuid(), $1, $2, 'Sent')`,
        [rfqId, supplierOrg],
      );
    return { tag, buyerEmail, supplierEmail, supplierName, supplierOrg, categoryId, rfqId, reference };
  });
}

/** Signs in a person who already has an account. */
export async function signInExisting(page: Page, email: string, next = "/"): Promise<void> {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await enterCode(page, await requestCode(page, email));
  // The passkey offer (A1) is a step on the same page for someone without one; then the app redirects.
  const notNow = page.getByRole("button", { name: "Not now" });
  await expect
    .poll(async () => (await notNow.isVisible()) || !new URL(page.url()).pathname.startsWith("/sign-in"), {
      timeout: 20_000,
    })
    .toBe(true);
  if (await notNow.isVisible()) await notNow.click();
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 20_000 });
  await page.waitForLoadState("networkidle");
}
