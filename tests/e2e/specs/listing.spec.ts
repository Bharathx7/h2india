import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ownIp, withDb } from "../helpers/sign-in";

// Step 6.3 DONE WHEN: selecting filters updates results and counts and the address reproduces the view; the table view
// shows comparable attributes as columns; no results shows the designed state with Clear filters; no price.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

/** A category of its own with two attributes, a sub-category and three live products from one supplier. */
async function setUp(tag: string) {
  return withDb(async (db) => {
    const org = (
      await db.query<{ id: string }>(
        `INSERT INTO core.organisations (id, kind, legal_name, verification, state) VALUES (gen_random_uuid(), 'supplier', $1, 'Verified', 'Maharashtra') RETURNING id`,
        [`Listing Supplier ${tag}`],
      )
    ).rows[0]?.id;
    await db.query(`INSERT INTO core.company_profiles (organisation_id, slug, trade_name) VALUES ($1, $2, $3)`, [
      org,
      `listing-supplier-${tag}`,
      `Listing Supplier ${tag}`,
    ]);
    const cat = (
      await db.query<{ id: string }>(
        `INSERT INTO core.catalogue_categories (id, class_id, slug, label, position) VALUES (gen_random_uuid(), 'equipment', $1, $2, 90) RETURNING id`,
        [`pumps-${tag}`, `Pumps ${tag}`],
      )
    ).rows[0]?.id;
    const sub = (
      await db.query<{ id: string }>(
        `INSERT INTO core.catalogue_categories (id, class_id, parent_id, slug, label, position) VALUES (gen_random_uuid(), 'equipment', $1, 'booster', 'Booster', 1) RETURNING id`,
        [cat],
      )
    ).rows[0]?.id;
    await db.query(
      `INSERT INTO core.catalogue_attributes (id, category_id, key, label, type, unit, min, max, options, filterable, comparable, display_group, position)
       VALUES (gen_random_uuid(), $1, 'flow', 'Flow', 'number', 'L/min', 1, 1000, '{}', true, true, 'Performance', 1),
              (gen_random_uuid(), $1, 'seal', 'Seal', 'choice', NULL, NULL, NULL, '{Dry,Wet}', true, false, 'Physical', 2)`,
      [cat],
    );
    const add = (name: string, category: string | undefined, flow: number, seal: string, lead: number) =>
      db.query(
        `INSERT INTO core.products (id, organisation_id, category_id, slug, name, attributes, status, published_at, lead_time_min_weeks, lead_time_max_weeks, made_in_india)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'Live', now(), $6, $6, true)`,
        [
          org,
          category,
          `${name.toLowerCase().replace(/\W+/g, "-")}-${tag}`,
          name,
          JSON.stringify({ flow, seal }),
          lead,
        ],
      );
    await add(`Pump A ${tag}`, cat, 100, "Dry", 4);
    await add(`Pump B ${tag}`, cat, 400, "Wet", 10);
    await add(`Booster C ${tag}`, sub, 800, "Dry", 6);
    return `/marketplace/equipment/pumps-${tag}`;
  });
}

async function noPrice(page: Page) {
  expect(await page.locator("main").innerText()).not.toMatch(/₹|\bRs\.?\s?\d|\bINR\s?\d/);
}

test("filters update results and counts, and the address reproduces the view", async ({ page }) => {
  const tag = Math.random().toString(36).slice(2, 8);
  const path = await setUp(tag);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: `Pumps ${tag}` })).toBeVisible();
  const products = page.getByRole("list", { name: "Products" });
  await expect(products.locator(":scope > li")).toHaveCount(3);
  await noPrice(page);

  const filters = page.getByRole("region", { name: "Filters" }).first();
  if (await filters.isHidden()) await page.getByRole("button", { name: /^Filters/ }).click();
  const panel = page.getByRole("region", { name: "Filters" }).last();
  await expect(panel.getByRole("checkbox", { name: "Dry (2)" })).toBeVisible();
  await panel.getByRole("checkbox", { name: "Dry (2)" }).click();
  await expect(page).toHaveURL(/a\.seal=Dry/);
  await expect(panel.getByRole("checkbox", { name: "Booster (1)" })).toBeVisible();

  await panel.getByRole("textbox", { name: /Flow, minimum/ }).fill("500");
  await panel.getByRole("textbox", { name: /Flow, minimum/ }).press("Enter");
  await expect(page).toHaveURL(/min\.flow=500/);
  const shared = page.url();
  await page.goto(shared);
  await expect(page.getByRole("link", { name: `Booster C ${tag}` }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: `Pump A ${tag}` })).toHaveCount(0);
});

test("the table shows comparable attributes as columns, and no results offers Clear filters", async ({ page }) => {
  const tag = Math.random().toString(36).slice(2, 8);
  const path = await setUp(tag);
  await page.goto(`${path}?view=table`);
  const table = page.getByRole("region", { name: "Products as a table" });
  await expect(table.getByRole("columnheader", { name: "Flow" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Seal" })).toHaveCount(0);
  await expect(table.getByRole("row", { name: new RegExp(`Pump B ${tag}`) })).toContainText("400 L/min");
  await noPrice(page);
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => v.id),
  ).toEqual([]);

  await page.goto(`${path}?min.flow=900`);
  await expect(page.getByRole("heading", { name: "No products match these filters" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(page.getByRole("list", { name: "Products" }).locator(":scope > li")).toHaveCount(3);
});

test("the listing has its designed loading and error states", async ({ page }) => {
  const path = await setUp(Math.random().toString(36).slice(2, 8));
  for (const state of ["loading", "error"]) {
    await page.goto(`${path}?state=${state}`);
    await expect(page.locator(`section[data-state=${state}]`)).toBeVisible();
  }
  await page.goto(`${path}?state=error`);
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.goto(`${path}?state=empty`);
  await expect(page.getByRole("heading", { name: "No products match these filters" })).toBeVisible();
});
