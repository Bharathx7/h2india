import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "../fixtures";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Step 6.4 DONE WHEN: both product types match their frames; with the transactions flag off no buy button exists in
// the page source; Ask a question and Report this listing reach the right place.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function setUp(tag: string) {
  return withDb(async (db) => {
    const org = (
      await db.query<{ id: string }>(
        `INSERT INTO core.organisations (id, kind, legal_name, verification, state) VALUES (gen_random_uuid(), 'supplier', $1, 'Verified', 'Maharashtra') RETURNING id`,
        [`PDP Supplier ${tag}`],
      )
    ).rows[0]?.id;
    await db.query(
      `INSERT INTO core.company_profiles (organisation_id, slug, trade_name, city) VALUES ($1, $2, $3, 'Pune')`,
      [org, `pdp-supplier-${tag}`, `PDP Supplier ${tag}`],
    );
    const cat = (
      await db.query<{ id: string }>(
        `INSERT INTO core.catalogue_categories (id, class_id, slug, label, position) VALUES (gen_random_uuid(), 'equipment', $1, $2, 91) RETURNING id`,
        [`detectors-${tag}`, `Detectors ${tag}`],
      )
    ).rows[0]?.id;
    await db.query(
      `INSERT INTO core.catalogue_attributes (id, category_id, key, label, type, unit, options, filterable, comparable, display_group, position, test_condition)
       VALUES (gen_random_uuid(), $1, 'range', 'Measuring range', 'number', '% LEL', '{}', true, true, 'Performance', 1, 'In air')`,
      [cat],
    );
    const insert = (slug: string, name: string, extra: string) =>
      db.query(
        `INSERT INTO core.products (id, organisation_id, category_id, slug, name, summary, attributes, status, published_at, lead_time_min_weeks, lead_time_max_weeks${extra ? ", pricing, price_paise, price_currency, gst_rate_bps, min_order" : ""})
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'Detects hydrogen leaks early.', '{"range": 100}', 'Live', now(), 3, 3${extra})`,
        [org, cat, slug, name],
      );
    await insert(`quote-${tag}`, `Quote detector ${tag}`, "");
    await insert(`fixed-${tag}`, `Fixed detector ${tag}`, `, 'fixed', 4850000, 'INR', 1800, 2`);
    return tag;
  });
}

test("a quote-only product shows its specs, no price and no buy button", async ({ page }) => {
  const tag = await setUp(Math.random().toString(36).slice(2, 8));
  const res = await page.goto(`/marketplace/products/quote-${tag}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: `Quote detector ${tag}` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Price on request" })).toBeVisible();
  const specs = page.getByRole("region", { name: "Specifications" });
  await expect(specs.getByRole("row", { name: /Measuring range/ })).toContainText("In air");
  const html = await page.content();
  expect(html).not.toMatch(/₹/);
  expect(html).not.toMatch(/Add to cart|Buy now/);
  await expect(page.getByRole("button", { name: "Request quote" })).toBeVisible();
  const axe = await new AxeBuilder({ page }).include("main").analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});

test("a fixed-price product shows its price and GST, and buy buttons only while buying is on", async ({ page }) => {
  const tag = await setUp(Math.random().toString(36).slice(2, 8));
  await page.goto(`/marketplace/products/fixed-${tag}`);
  await expect(page.getByText("₹48,500")).toBeVisible();
  await expect(page.getByText("GST 18%: ₹8,730")).toBeVisible();
  await expect(page.getByText("₹57,230 incl. GST per unit")).toBeVisible();
  await expect(page.getByText("Minimum order: 2 units")).toBeVisible();
  if (process.env.FLAG_TRANSACTIONS === "true") {
    // Ordering on (local and staging, A176): Add to cart and Buy now, and payment held until delivery is accepted.
    await expect(page.getByRole("link", { name: "Add to cart" })).toBeVisible();
    await expect(page.getByText("Payment is held until you accept delivery")).toBeVisible();
  } else {
    expect(await page.content()).not.toMatch(/Add to cart|Buy now/);
    await expect(page.getByRole("button", { name: "Request quote" })).toBeVisible();
  }
});

test("Report this listing reaches the listings queue", async ({ page }) => {
  const tag = await setUp(Math.random().toString(36).slice(2, 8));
  await page.goto(`/marketplace/products/quote-${tag}`);
  await page.getByRole("button", { name: "Report this listing" }).click();
  const dialog = page.getByRole("dialog", { name: "Report this listing" });
  await dialog.getByRole("radio", { name: "Misleading certificate" }).check();
  await dialog.getByLabel("Details").fill("The certificate on this page is for a different model.");
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByRole("dialog", { name: "Report sent" })).toBeVisible();
  const rows = await withDb((db) =>
    db.query(
      `SELECT r.problem FROM core.listing_reports r JOIN core.products p ON p.id = r.product_id WHERE p.slug = $1`,
      [`quote-${tag}`],
    ),
  );
  expect(rows.rows).toEqual([{ problem: "misleading-certificate" }]);
});

test("Ask a question needs an account, then reaches the supplier", async ({ page }) => {
  const tag = await setUp(Math.random().toString(36).slice(2, 8));
  await page.goto(`/marketplace/products/quote-${tag}`);
  await expect(page.getByRole("link", { name: "Ask a technical question" })).toHaveAttribute(
    "href",
    /\/sign-in\?next=/,
  );
  await signInNew(page, newEmail("asker"));
  await page.goto(`/marketplace/products/quote-${tag}`);
  await page.getByRole("button", { name: "Ask a technical question" }).click();
  const dialog = page.getByRole("dialog", { name: "Ask a technical question" });
  await dialog.getByLabel("Your question").fill("Can it run at 30% load for long periods on a solar-only profile?");
  await dialog.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByRole("dialog", { name: "Question sent" })).toBeVisible();
  const rows = await withDb((db) =>
    db.query(
      `SELECT q.status FROM core.product_questions q JOIN core.products p ON p.id = q.product_id WHERE p.slug = $1`,
      [`quote-${tag}`],
    ),
  );
  expect(rows.rows).toEqual([{ status: "Open" }]);
});
