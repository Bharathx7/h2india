import { expect, test } from "../fixtures";
import { backOfficeContext, signInOperator } from "../helpers/cms";
import { signInExisting } from "../helpers/rfq";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Supplier QC (16 Nov 2026): a supplier requests a category the catalogue lacks; a Catalogue moderator approves it in
// the Category requests queue, which adds it; the supplier sees it approved. Company details lists the GSTINs.

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function supplier() {
  const tag = String(Date.now()).slice(-7);
  const email = newEmail(`qc-supplier-${tag}`);
  await withDb(async (db) => {
    const one = async (sql: string, args: unknown[]) => (await db.query<{ id: string }>(sql, args)).rows[0]?.id ?? "";
    const org = await one(
      `INSERT INTO core.organisations (id, kind, legal_name, verification, state) VALUES (gen_random_uuid(), 'supplier', $1, 'Verified', 'Gujarat') RETURNING id`,
      [`Kutch Sensors ${tag}`],
    );
    const user = await one(
      `INSERT INTO core.users (id, email, name, email_verified, profile_type) VALUES (gen_random_uuid(), $1, 'Isha Catalogue', true, 'supplier') RETURNING id`,
      [email],
    );
    await db.query(
      `INSERT INTO core.memberships (id, organisation_id, user_id, role) VALUES (gen_random_uuid(), $1, $2, 'Admin')`,
      [org, user],
    );
    await db.query(
      `INSERT INTO core.organisation_gstins (id, organisation_id, gstin, state_code, place, portal_status, is_default) VALUES (gen_random_uuid(), $1, $2, '24', 'Bhuj, Gujarat', 'Active', true)`,
      [org, `24QCSUP${tag}1Z5`.slice(0, 15)],
    );
  });
  return { email, tag };
}

test("a supplier requests a category; a catalogue moderator approves it; the supplier can list in it", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const s = await supplier();
  const label = `Leak sensors ${s.tag}`;
  await signInExisting(page, s.email, "/supplier/products/new");
  await page.getByRole("link", { name: "Request a new category" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Request a category" })).toBeVisible();
  await page.getByLabel("Category name").fill(label);
  await page.getByLabel("What products is it for?").fill("Fixed and portable hydrogen leak detectors");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Request sent")).toBeVisible();
  await expect(page.getByText(label)).toBeVisible();
  await expect(page.getByText("Waiting for review")).toBeVisible();

  const back = await backOfficeContext(browser);
  const op = await back.newPage();
  await signInOperator(op, "Catalogue moderator");
  await op.goto("/admin/queues/categories");
  await op
    .getByRole("row", { name: new RegExp(label) })
    .getByRole("link")
    .first()
    .click();
  await expect(op.getByRole("heading", { level: 1, name: label })).toBeVisible();
  await op.getByRole("button", { name: "Approve and add category" }).click();
  await expect(op).toHaveURL(/\/admin\/queues\/categories$/);
  await expect
    .poll(() =>
      withDb(
        async (db) =>
          (await db.query<{ status: string }>(`SELECT status FROM core.category_requests WHERE label = $1`, [label]))
            .rows[0]?.status,
      ),
    )
    .toBe("Approved");
  await back.close();

  await page.reload();
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Add a product in this category" }).click();
  await expect(page).toHaveURL(/\/supplier\/products\/new\?category=/);
});

test("Company details lists the supplier's GSTINs with the default", async ({ page }) => {
  const s = await supplier();
  await signInExisting(page, s.email, "/supplier/company");
  await expect(page.getByRole("heading", { level: 1, name: "GSTINs" })).toBeVisible();
  const table = page.getByRole("region", { name: "GSTINs" });
  await expect(table.getByText(`24QCSUP${s.tag}1Z5`.slice(0, 15))).toBeVisible();
  await expect(table.getByText("Default")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add a GSTIN" })).toBeVisible();
});

test("a supplier admin changes a team member's role from the row's actions", async ({ page }) => {
  const s = await supplier();
  const colleague = `Ravi Viewer ${s.tag}`;
  await withDb(async (db) => {
    const user = (
      await db.query<{ id: string }>(
        `INSERT INTO core.users (id, email, name, email_verified, profile_type) VALUES (gen_random_uuid(), $1, $2, true, 'supplier') RETURNING id`,
        [newEmail(`qc-viewer-${s.tag}`), colleague],
      )
    ).rows[0]?.id;
    await db.query(
      `INSERT INTO core.memberships (id, organisation_id, user_id, role)
       SELECT gen_random_uuid(), m.organisation_id, $1, 'Viewer' FROM core.memberships m JOIN core.users u ON u.id = m.user_id WHERE u.email = $2`,
      [user, s.email],
    );
  });
  await signInExisting(page, s.email, "/supplier/team");
  await page.getByRole("button", { name: `Actions for ${colleague}` }).click();
  await page.getByRole("menuitem", { name: "Make Sales" }).click();
  await expect
    .poll(() =>
      withDb(
        async (db) =>
          (
            await db.query<{ role: string }>(
              `SELECT m.role FROM core.memberships m JOIN core.users u ON u.id = m.user_id WHERE u.name = $1`,
              [colleague],
            )
          ).rows[0]?.role,
      ),
    )
    .toBe("Sales");
});
