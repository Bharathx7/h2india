import { expect, test } from "../fixtures";
import { backOfficeContext, signInOperator } from "../helpers/cms";
import { signInExisting } from "../helpers/rfq";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Supplier QC (16 Nov 2026): a supplier requests a category the catalogue lacks; a Catalogue moderator approves it in
// the Category requests queue, which adds it; the supplier sees it approved. Company details shows the one GSTIN.

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

test("Company details shows the company's one GSTIN, verified and locked (A189)", async ({ page }) => {
  const s = await supplier();
  await signInExisting(page, s.email, "/supplier/company");
  await expect(page.getByRole("heading", { level: 1, name: "Company details" })).toBeVisible();
  await expect(page.getByRole("region", { name: "From your GST records" }).getByText("Legal name")).toBeVisible();
  const card = page.getByRole("region", { name: "Company GSTIN", exact: true });
  await expect(card.getByText(`24QCSUP${s.tag}1Z5`.slice(0, 15))).toBeVisible();
  await expect(card.getByText("Your GSTIN is verified and locked.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /Add|Replace/ })).toHaveCount(0);
});

test("a supplier admin limits a member with custom access, and new members start with full access (A199)", async ({
  page,
}) => {
  const s = await supplier();
  const colleague = `Ravi Colleague ${s.tag}`;
  await withDb(async (db) => {
    const user = (
      await db.query<{ id: string }>(
        `INSERT INTO core.users (id, email, name, email_verified, profile_type) VALUES (gen_random_uuid(), $1, $2, true, 'supplier') RETURNING id`,
        [newEmail(`qc-colleague-${s.tag}`), colleague],
      )
    ).rows[0]?.id;
    await db.query(
      `INSERT INTO core.memberships (id, organisation_id, user_id, role)
       SELECT gen_random_uuid(), m.organisation_id, $1, 'Admin' FROM core.memberships m JOIN core.users u ON u.id = m.user_id WHERE u.email = $2`,
      [user, s.email],
    );
  });
  const seat = () =>
    withDb(
      async (db) =>
        (
          await db.query<{ role: string; permissions: string[] | null }>(
            `SELECT m.role, m.permissions FROM core.memberships m JOIN core.users u ON u.id = m.user_id WHERE u.name = $1`,
            [colleague],
          )
        ).rows[0],
    );
  await signInExisting(page, s.email, "/supplier/team");
  // Everyone starts with full access; turning it off and ticking boxes makes them Custom, with exactly those ticks.
  await page.getByRole("button", { name: `Edit access for ${colleague}` }).click();
  const drawer = page.getByRole("dialog", { name: `What ${colleague} can do` });
  const full = drawer.getByRole("switch", { name: "Full access (Admin)" });
  await expect(full).toBeChecked();
  await expect(drawer.getByRole("group", { name: "Presets" })).toHaveCount(0);
  await full.click();
  await drawer.getByRole("checkbox", { name: /See quote requests/i }).click();
  await drawer.getByRole("checkbox", { name: /Answer quote requests/i }).click();
  await drawer.getByRole("button", { name: "Save access" }).click();
  await expect.poll(async () => (await seat())?.role).toBe("Custom");
  expect((await seat())?.permissions).toEqual(["rfq.view", "quote.send"]);
  await expect(page.getByText(/Custom: 2 of \d+/)).toBeVisible();

  // Add member: full access unless the admin chooses otherwise, sent as an invitation.
  const invitee = newEmail(`qc-invite-${s.tag}`);
  await page.getByRole("button", { name: "Add member" }).click();
  const add = page.getByRole("dialog", { name: "Add a team member" });
  await add.getByLabel("Work email").fill(invitee);
  await expect(add.getByRole("switch", { name: "Full access (Admin)" })).toBeChecked();
  await add.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByRole("heading", { name: "Waiting to accept" })).toBeVisible();
  await expect(page.getByText(invitee, { exact: true })).toBeVisible();
  const invited = await withDb(
    async (db) =>
      (await db.query<{ role: string }>(`SELECT role FROM core.invitations WHERE email = $1`, [invitee])).rows[0]?.role,
  );
  expect(invited).toBe("Admin");
});
