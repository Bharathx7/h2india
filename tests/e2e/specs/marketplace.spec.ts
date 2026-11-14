import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ownIp, withDb } from "../helpers/sign-in";
import { expectStates } from "../helpers/states";

// Step 6.2 DONE WHEN: all five class pages and every application page render from one template each; counts match
// live listings (none yet, so none are shown); no price appears on any of these pages (automated check below).
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

const RUPEES = /₹|\bRs\.?\s?\d|\bINR\s?\d/;

async function noPrice(page: Page) {
  const text = await page.locator("main").innerText();
  expect(text, "no price on marketplace pages").not.toMatch(RUPEES);
}

async function seriousIssues(page: Page) {
  const axe = await new AxeBuilder({ page }).include("main").analyze();
  return axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id);
}

test("the landing shows the live catalogue and no price", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(
    page.getByRole("heading", { level: 1, name: /Hydrogen equipment, components and services/ }),
  ).toBeVisible();
  const classes = page.getByRole("region", { name: "Product classes" });
  for (const name of ["Systems", "Components", "Equipment", "Services", "Materials"]) {
    await expect(classes.getByRole("link", { name: new RegExp(`^.*${name}`) }).first()).toBeVisible();
  }
  await expect(page.getByRole("link", { name: /Green hydrogen production/ })).toBeVisible();
  // Ports & shipping shows on the landing, as drawn (A105).
  await expect(page.getByRole("main").getByRole("link", { name: /Ports & shipping/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Tanks & cylinders/ }).first()).toHaveAttribute(
    "href",
    "/marketplace/components/tanks-cylinders",
  );
  await noPrice(page);
  expect(await seriousIssues(page)).toEqual([]);
  const screen = page.viewportSize()?.width ?? 0;
  expect(await page.evaluate(() => Math.max(window.innerWidth, document.documentElement.scrollWidth))).toBe(screen);
});

test("every class and application page renders from its template, without a price", async ({ page }) => {
  const apps = await withDb(async (db) =>
    (await db.query<{ id: string }>("SELECT id FROM core.catalogue_applications WHERE hidden_at IS NULL")).rows.map(
      (r) => r.id,
    ),
  );
  for (const id of ["systems", "components", "equipment", "services", "materials"]) {
    const res = await page.goto(`/marketplace/${id}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: "Categories" })).toBeVisible();
    await noPrice(page);
  }
  for (const id of apps) {
    const res = await page.goto(`/marketplace/applications/${id}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("link", { name: "Request a quote" }).last()).toBeVisible();
    await noPrice(page);
  }
  expect(await seriousIssues(page)).toEqual([]);
});

test("a category hidden in admin leaves the class page and the menu at once", async ({ page }) => {
  const slug = `e2e-hidden-${String(Date.now()).slice(-6)}`;
  await withDb((db) =>
    db.query(
      `INSERT INTO core.catalogue_categories (id, class_id, slug, label, position) VALUES (gen_random_uuid(), 'materials', $1, $2, 99)`,
      [slug, `Coatings ${slug.slice(-6)}`],
    ),
  );
  await page.goto("/marketplace/materials");
  const tile = page.getByRole("link", { name: new RegExp(`Coatings ${slug.slice(-6)}`) });
  await expect(tile).toBeVisible();
  await withDb((db) => db.query(`UPDATE core.catalogue_categories SET hidden_at = now() WHERE slug = $1`, [slug]));
  await page.reload();
  await expect(tile).toHaveCount(0);
});

test("the landing and class pages have their designed states", async ({ page }) => {
  await expectStates(page, "/marketplace");
  await expectStates(page, "/marketplace/systems");
});
