import { expect, test } from "../fixtures";
import { setup } from "../helpers/orders";
import { signInExisting } from "../helpers/rfq";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Workspace QC 2 · Buyer (founder QC, 17 Nov 2026): a clean dashboard with a summary row, project lists with the
// lists on the left, alerts as a table, and Company as tabs with the shared Team panel and order limits.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("the buyer dashboard, lists, alerts and Company · Team are laid out as reviewed", async ({ page }) => {
  test.setTimeout(120_000);
  const d = await setup();
  await signInExisting(page, d.buyerEmail, "/buyer");
  const summary = page.getByRole("list", { name: "Summary" });
  await expect(summary.getByText("Open quote requests")).toBeVisible();
  await expect(summary.getByText("Quotes to review")).toBeVisible();
  await expect(summary.getByText("Project lists")).toBeVisible();

  await page.goto("/buyer/lists");
  await expect(page.getByRole("heading", { level: 1, name: "Project lists" })).toBeVisible();

  await page.goto("/buyer/alerts");
  await expect(page.getByRole("heading", { level: 1, name: "Alerts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Watch a category" }).first()).toBeVisible();

  await page.goto("/buyer/company");
  const tabs = page.getByRole("navigation", { name: "Company settings" });
  await tabs.getByRole("link", { name: "Team" }).click();
  await expect(page).toHaveURL(/section=users/);
  await expect(page.getByRole("button", { name: "Add member" })).toBeVisible();
  await expect(page.getByText("Full access").first()).toBeVisible();
  // A199: with no one limited there are no order limits and no Approval rules tab (orders need no approval).
  await expect(page.getByRole("heading", { name: "Order limits" })).toHaveCount(0);
  await expect(tabs.getByRole("link", { name: "Approval rules" })).toHaveCount(0);

  // Once someone has custom access, their order limit and the Approval rules tab appear.
  await withDb(async (db) => {
    const user = (
      await db.query<{ id: string }>(
        `INSERT INTO core.users (id, email, name, email_verified, profile_type) VALUES (gen_random_uuid(), $1, $2, true, 'buyer') RETURNING id`,
        [newEmail(`qc-limited-${d.tag}`), `Limited ${d.tag}`],
      )
    ).rows[0]?.id;
    await db.query(
      `INSERT INTO core.memberships (id, organisation_id, user_id, role, permissions)
       SELECT gen_random_uuid(), m.organisation_id, $1, 'Custom', ARRAY['rfq.view','rfq.create','order.view','order.place']
       FROM core.memberships m JOIN core.users u ON u.id = m.user_id WHERE u.email = $2`,
      [user, d.buyerEmail],
    );
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Order limits" })).toBeVisible();
  await expect(page.getByText(`Limited ${d.tag}`).first()).toBeVisible();
  await tabs.getByRole("link", { name: "Approval rules" }).click();
  await expect(page).toHaveURL(/section=rules/);
});
