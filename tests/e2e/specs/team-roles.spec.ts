import { expect, test } from "../fixtures";
import { cms, signInOperator } from "../helpers/cms";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Team and roles (founder, 20 Nov 2026): a Super admin adds a team member in four steps (the account is made for
// them), limits an editor to content sections, and makes a custom role from a built-in one. A199 (founder, 21 Nov
// 2026): Add a team member starts on Super admin and offers only custom roles besides it. An editor limited to the
// Tracker reads everything but can't create content elsewhere, on screen or through the CMS API. Desktop only.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "desktop only (627:1001)");
  await ownIp(context, info);
});

test("a Super admin adds a Tracker-only editor in four steps", async ({ page }) => {
  test.setTimeout(120_000);
  await signInOperator(page, "Super admin");
  // To limit someone, a Super admin first makes a custom role (here from Content editor).
  const role = `Tracker editor ${String(Date.now())}`;
  await page.goto(`/admin/users/roles/role?from=${encodeURIComponent("Content editor")}`);
  await page.getByLabel("Role name").fill(role);
  await page.getByLabel("Reason").fill("Tracker desk");
  await page.getByRole("button", { name: "Create role" }).click();
  await expect(page).toHaveURL(/\/admin\/users\/roles\?role=/, { timeout: 20_000 });
  await page.goto("/admin/users/roles");
  await expect(page.getByRole("heading", { name: "Team", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Add a team member" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Add a team member" })).toBeVisible();

  const email = newEmail("tracker-desk");
  await page.getByLabel("Name").fill("Asha Iyer");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Full access (Super admin) is chosen unless you pick a custom role; the other built-in roles aren't offered.
  await expect(page.getByRole("radio", { name: /^Super admin/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /^Content editor/ })).toHaveCount(0);
  await page.getByRole("radio", { name: new RegExp(`^${role}`) }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("radio", { name: /Only the sections I choose/ }).click();
  await page.getByRole("checkbox", { name: /^Tracker/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Tracker", { exact: true }).last()).toBeVisible();
  await page.getByLabel("Reason").fill("Tracker desk");
  await page.getByRole("button", { name: "Add to the team" }).click();
  await expect(page.getByText(`Asha Iyer is on the team as ${role}`)).toBeVisible({ timeout: 20_000 });

  const sections = await withDb(async (db) => {
    const r = await db.query<{ section: string }>(
      `SELECT s.section FROM core.operator_sections s JOIN core.users u ON u.id = s.user_id WHERE u.email = $1`,
      [email],
    );
    return r.rows.map((x) => x.section);
  });
  expect(sections).toEqual(["tracker"]);

  // The Team table is paged (founder, 20 Nov 2026): the database check above proves the add; here the way back works.
  await page.getByRole("link", { name: "Back to the team" }).click();
  await expect(page).toHaveURL(/\/admin\/users\/roles$/);
  await expect(page.getByRole("heading", { name: "Team", exact: true })).toBeVisible();
});

test("an editor limited to the Tracker can't create content in other sections", async ({ page }) => {
  const email = await signInOperator(page, "Content editor");
  await withDb((db) =>
    db.query(
      `INSERT INTO core.operator_sections (user_id, section) SELECT id, 'tracker' FROM core.users WHERE email = $1`,
      [email],
    ),
  );
  await page.goto("/admin/content?section=opportunities");
  await expect(page.getByRole("heading", { level: 1, name: "Opportunities" })).toBeVisible();
  await expect(page.locator('a[href="/admin/content/tenders/new"]')).toHaveCount(0);
  await page.goto("/admin/content?section=tracker");
  await expect(page.locator('a[href="/admin/content/tracker-stations/new"]')).toHaveCount(1);

  // The CMS itself refuses, whatever screen is used.
  const refused = await cms(page.request, "POST", "glossary", {
    term: `Outside ${String(Date.now())}`,
    slug: `outside-${String(Date.now())}`,
    shortDefinition: "Should not be saved.",
  });
  expect(refused.status).toBe(403);
});

test("a Super admin copies a built-in role into a custom one", async ({ page }) => {
  await signInOperator(page, "Super admin");
  const name = `Tracker desk ${String(Date.now())}`;
  await page.goto(`/admin/users/roles/role?from=${encodeURIComponent("Content editor")}`);
  await expect(page.getByRole("heading", { level: 1, name: "New role from Content editor" })).toBeVisible();
  await page.getByLabel("Role name").fill(name);
  await page.getByLabel("Reason").fill("New desk");
  await page.getByRole("button", { name: "Create role" }).click();
  await expect(page).toHaveURL(/\/admin\/users\/roles\?role=/, { timeout: 20_000 });
  await expect(page.getByRole("navigation", { name: "Roles" }).getByText(name)).toBeVisible();
});
