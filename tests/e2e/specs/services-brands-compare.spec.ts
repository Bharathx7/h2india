import { expect, test } from "../fixtures";
import { ownIp, withDb } from "../helpers/sign-in";
import { expectStates } from "../helpers/states";

// Step 6.5 DONE WHEN: a compare of three products shows aligned rows and no price; a paused service shows its state
// and can't receive a quote request; a brand with no authorised dealer shows the designed state.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function setUp(tag: string) {
  return withDb(async (db) => {
    const org = (
      await db.query<{ id: string }>(
        `INSERT INTO core.organisations (id, kind, legal_name, verification) VALUES (gen_random_uuid(), 'supplier', $1, 'Verified') RETURNING id`,
        [`Six Five ${tag}`],
      )
    ).rows[0]?.id;
    await db.query(`INSERT INTO core.company_profiles (organisation_id, slug, trade_name) VALUES ($1, $2, $3)`, [
      org,
      `six-five-${tag}`,
      `Six Five ${tag}`,
    ]);
    const cat = (
      await db.query<{ id: string }>(
        `INSERT INTO core.catalogue_categories (id, class_id, slug, label, position) VALUES (gen_random_uuid(), 'components', $1, $2, 92) RETURNING id`,
        [`stacks-${tag}`, `Stacks ${tag}`],
      )
    ).rows[0]?.id;
    const svc = (
      await db.query<{ id: string }>(
        `INSERT INTO core.catalogue_categories (id, class_id, slug, label, position) VALUES (gen_random_uuid(), 'services', $1, $2, 92) RETURNING id`,
        [`safety-${tag}`, `Safety ${tag}`],
      )
    ).rows[0]?.id;
    await db.query(
      `INSERT INTO core.catalogue_attributes (id, category_id, key, label, type, unit, options, comparable, display_group, position) VALUES (gen_random_uuid(), $1, 'power', 'Rated power', 'number', 'kW', '{}', true, 'Performance', 1)`,
      [cat],
    );
    const ids: string[] = [];
    for (const [i, power] of [50, 100, 250].entries()) {
      const r = await db.query<{ id: string }>(
        `INSERT INTO core.products (id, organisation_id, category_id, slug, name, attributes, status, published_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'Live', now()) RETURNING id`,
        [org, cat, `stack-${String(i)}-${tag}`, `Stack ${String(i)} ${tag}`, JSON.stringify({ power })],
      );
      ids.push(r.rows[0]?.id ?? "");
    }
    await db.query(
      `INSERT INTO core.products (id, organisation_id, category_id, slug, name, summary, status, published_at, service) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'HAZOP and QRA.', 'Paused', now(), $5)`,
      [
        org,
        svc,
        `hazop-${tag}`,
        `HAZOP ${tag}`,
        JSON.stringify({ statesServed: ["Gujarat"], deliverables: ["HAZOP worksheets"] }),
      ],
    );
    await db.query(`INSERT INTO core.brands (id, slug, name, origin) VALUES (gen_random_uuid(), $1, $2, 'Norway')`, [
      `arctos-${tag}`,
      `Arctos ${tag}`,
    ]);
    return ids;
  });
}

test("compare shows three products with aligned rows and no price", async ({ page }) => {
  const tag = Math.random().toString(36).slice(2, 8);
  const ids = await setUp(tag);
  await page.goto(`/marketplace/compare?ids=${ids.join(",")}`);
  await expect(page.getByRole("heading", { level: 1, name: `Compare stacks ${tag}` })).toBeVisible();
  const table = page.getByRole("table");
  await expect(table.getByRole("columnheader")).toHaveCount(5);
  const row = table.getByRole("row", { name: /Rated power/ });
  await expect(row.getByRole("cell")).toHaveText(["50 kW", "100 kW", "250 kW", ""]);
  expect(await page.locator("main").innerText()).not.toMatch(/₹|\bRs\.?\s?\d|price/i);
  await page.getByRole("switch", { name: "Show only differences" }).click();
  await expect(table.getByRole("row", { name: /Lead time/ })).toHaveCount(0);
  await expect(row).toBeVisible();
});

test("a paused service shows its state and can't take a request", async ({ page }) => {
  const tag = Math.random().toString(36).slice(2, 8);
  await setUp(tag);
  await page.goto(`/marketplace/products/hazop-${tag}`);
  await expect(page.getByText("This service is paused by the provider")).toBeVisible();
  await expect(page.getByRole("button", { name: "Request a proposal" })).toBeDisabled();
  await expect(page.getByText("HAZOP worksheets")).toBeVisible();
});

test("brands index, and a brand with no authorised dealer", async ({ page }) => {
  const tag = Math.random().toString(36).slice(2, 8);
  await setUp(tag);
  await page.goto(`/marketplace/brands?q=${tag}`);
  await expect(page.getByRole("link", { name: new RegExp(`Arctos ${tag}`) })).toBeVisible();
  await page.goto(`/marketplace/brands/arctos-${tag}`);
  await expect(page.getByRole("heading", { name: "No authorised Indian dealer listed yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "List your company" }).last()).toBeVisible();
});

test("compare and brands have their designed states", async ({ page }) => {
  await expectStates(page, "/marketplace/compare");
  await expectStates(page, "/marketplace/brands");
});
