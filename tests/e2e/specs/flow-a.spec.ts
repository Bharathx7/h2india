import { expect, test, type Browser, type Page } from "../fixtures";
import { backOfficeContext, signInOperator } from "../helpers/cms";
import { freshGstin, reachCompanyStep, typeGstin } from "../helpers/join";
import { signInExisting } from "../helpers/rfq";
import { enterCode, newEmail, ownIp, requestCode, withDb } from "../helpers/sign-in";

// Flow A (Figma page 18, 365:23; playbook step 9.9): a buyer from search to an accepted-quote decision. Home search →
// category listing → compare 3 → RFQ wizard while signed out → sign in with the draft kept → join and set up the
// company → RFQ sent → an operator approves → two suppliers quote → Quote received email → comparison → accept-quote
// confirmation, ending as C8 decides (Confirm off at Launch 1), or on the created order where ordering is on (A176). Needs the app, the worker (GSTIN checks) and Mailpit;
// runs in CI and on staging at 1440 and 390 with video.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
test.use({ video: "on" });

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

/** Two verified suppliers with three live products in a fresh category, and a person at each who can quote. */
async function setUp(tag: string) {
  const people = [newEmail(`flow-a-s1-${tag}`), newEmail(`flow-a-s2-${tag}`)];
  return withDb(async (db) => {
    const cat = (
      await db.query<{ id: string }>(
        `INSERT INTO core.catalogue_categories (id, class_id, slug, label, position) VALUES (gen_random_uuid(), 'equipment', $1, $2, 93) RETURNING id`,
        [`diaphragm-${tag}`, `Diaphragm compressors ${tag}`],
      )
    ).rows[0]?.id;
    const suppliers: { org: string; name: string; email: string }[] = [];
    for (const [i, email] of people.entries()) {
      const name = [`Pranava ${tag}`, `Sahyadri ${tag}`][i] ?? "";
      const org = (
        await db.query<{ id: string }>(
          `INSERT INTO core.organisations (id, kind, legal_name, verification, state) VALUES (gen_random_uuid(), 'supplier', $1, 'Verified', 'Maharashtra') RETURNING id`,
          [name],
        )
      ).rows[0]?.id;
      await db.query(`INSERT INTO core.company_profiles (organisation_id, slug, trade_name) VALUES ($1, $2, $3)`, [
        org,
        name.toLowerCase().replace(/\W+/g, "-"),
        name,
      ]);
      const user = (
        await db.query<{ id: string }>(
          // A supplier who joined through the app has a profile type, so sign-in returns them to the page they asked for.
          `INSERT INTO core.users (id, email, name, email_verified, profile_type) VALUES (gen_random_uuid(), $1, $2, true, 'supplier') RETURNING id`,
          [email, `Quoter ${String(i + 1)}`],
        )
      ).rows[0]?.id;
      await db.query(
        `INSERT INTO core.memberships (id, organisation_id, user_id, role) VALUES (gen_random_uuid(), $1, $2, 'Sales')`,
        [org, user],
      );
      suppliers.push({ org: org ?? "", name, email });
    }
    for (const [i, s] of [suppliers[0], suppliers[0], suppliers[1]].entries())
      await db.query(
        `INSERT INTO core.products (id, organisation_id, category_id, slug, name, status, published_at, lead_time_min_weeks, lead_time_max_weeks)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'Live', now(), 12, 18)`,
        [s?.org, cat, `pdc-${String(i)}-${tag}`, `PDC ${String(500 + i * 50)} ${tag}`],
      );
    return { category: `diaphragm-${tag}`, suppliers };
  });
}

async function quote(browser: Browser, email: string, unitPrice: string, lead: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signInExisting(page, email, "/supplier/rfqs?tab=quote");
  await page
    .getByRole("link", { name: /Write quote/ })
    .first()
    .click();
  await page.getByLabel(/Unit price, before GST/).fill(unitPrice);
  await page.getByLabel(/GST rate/).fill("18");
  await page.getByLabel(/HSN code/).fill("8414 80 90");
  await page.getByLabel(/Freight/).fill("60000");
  await page.getByLabel(/Lead time/).fill(lead);
  await page.getByLabel(/Delivery terms/).fill("Delivered to site, freight included");
  await page.getByLabel(/Payment schedule/).selectOption({ label: "30% with order, 70% before dispatch" });
  await page.getByLabel(/Warranty/).fill("24");
  await page.getByLabel(/Valid until/).fill(new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Send quote" }).click();
  await expect(page.getByText(/Sent · v1/)).toBeVisible();
  await ctx.close();
}

async function quoteEmail(page: Page, to: string) {
  await expect
    .poll(
      async () => {
        const res = await page.request.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}" subject:"quote for"`)}`,
        );
        return ((await res.json()) as { messages?: unknown[] }).messages?.length ?? 0;
      },
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0);
}

test("flow A: a buyer from search to choosing a quote", async ({ page, browser }, info) => {
  test.setTimeout(420_000);
  const tag = `${String(Date.now()).slice(-6)}${info.project.name.startsWith("mobile") ? "m" : "d"}`;
  const data = await setUp(tag);
  const buyerEmail = newEmail("flow-a-buyer");

  // 1 Home search → the category listing.
  await page.goto("/");
  await page.goto(`/marketplace/equipment/${data.category}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Diaphragm compressors");

  // 2 Compare three (no price anywhere).
  const ids = await withDb(async (db) =>
    (
      await db.query<{ id: string }>(
        `SELECT p.id FROM core.products p JOIN core.catalogue_categories c ON c.id = p.category_id WHERE c.slug = $1`,
        [data.category],
      )
    ).rows.map((r) => r.id),
  );
  await page.goto(`/marketplace/compare?ids=${ids.join(",")}`);
  await expect(page.getByText(/₹/)).toHaveCount(0);

  // 3 RFQ wizard while signed out: the draft is kept in the browser.
  await page.goto(`/rfq/new?category=${data.category}`);
  await page.getByLabel("Title").fill(`2 × diaphragm compressors ${tag}`);
  await page.getByLabel("Quantity").fill("2");
  await page.getByRole("button", { name: "Continue" }).click();
  for (const s of data.suppliers) await page.getByText(s.name, { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Delivery state").selectOption("Maharashtra");
  await page.getByLabel("Required on site by").fill(new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10));
  await page.getByLabel("Offer deadline").fill(new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Continue" }).click();
  // 4 Sign in to send (the draft stays in this browser), join a buyer company, add a delivery site.
  await page.getByRole("checkbox", { name: "Your contact details are shared only with suppliers who quote." }).check();
  await page.getByRole("button", { name: "Sign in to send" }).click();
  await page.waitForURL(/\/sign-in/);
  await enterCode(page, await requestCode(page, buyerEmail));
  // A new person is offered a passkey ("Not now") and then Join H2 India, as in signInNew().
  const notNow = page.getByRole("button", { name: "Not now" });
  await expect(notNow.or(page.getByRole("heading", { name: "Join H2 India" }))).toBeVisible();
  if (await notNow.isVisible()) await notNow.click();
  await reachCompanyStep(page, "Buyer company", "Ravi Kulkarni");
  await typeGstin(page, freshGstin());
  await page.getByRole("button", { name: "Create company" }).click();
  await expect(page.getByText("is set up as a buyer company.", { exact: false })).toBeVisible();
  await page.goto("/buyer/company?section=sites");
  await page.getByRole("button", { name: "Add a delivery site" }).click();
  await page.getByLabel("Site name").fill("Talegaon plant");
  await page.getByLabel("Address").fill("Plot 14, Talegaon MIDC Phase II");
  await page.getByLabel("State").fill("Maharashtra");
  await page.getByRole("button", { name: "Save site" }).click();
  // Wait for the save: leaving at once could cancel it, and the request would have no delivery site.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Talegaon plant").first()).toBeVisible();
  await page.goto("/rfq/new");
  await expect(page.getByText("Welcome back, your request is ready to send")).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue(`2 × diaphragm compressors ${tag}`);

  // 5 Send: two suppliers, so it goes to moderation.
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  // The consent ticked before sign-in came back with the draft.
  await expect(
    page.getByRole("checkbox", { name: "Your contact details are shared only with suppliers who quote." }),
  ).toBeChecked();
  await page.getByRole("button", { name: /Send RFQ to 2 suppliers/ }).click();
  await expect(page.getByRole("heading", { name: "Your request is in moderation" })).toBeVisible();

  // 6 An operator approves it.
  const op = await backOfficeContext(browser);
  const opPage = await op.newPage();
  await signInOperator(opPage, "Super admin");
  await opPage.goto("/admin/queues/rfqs");
  await opPage
    .getByRole("link", { name: new RegExp(`Review.*RFQ-`) })
    .first()
    .click();
  await opPage.getByRole("button", { name: "Approve and send" }).click();
  // Wait for the approval to land before closing the operator's browser.
  await expect
    .poll(
      () =>
        withDb(async (db) => {
          const r = await db.query<{ status: string }>(
            `SELECT status FROM core.rfqs WHERE title = $1 AND status <> 'Draft'`,
            [`2 × diaphragm compressors ${tag}`],
          );
          return r.rows[0]?.status;
        }),
      { timeout: 20_000 },
    )
    .toBe("Sent");
  await op.close();

  // 7 Two suppliers quote; the buyer gets Quote received.
  await quote(browser, data.suppliers[0]?.email ?? "", "39,80,000", "18");
  await quote(browser, data.suppliers[1]?.email ?? "", "41,20,000", "12");
  await quoteEmail(page, buyerEmail);

  // 8 The comparison highlights the best values, and accepting ends as C8 decides.
  await page.goto("/buyer/rfqs?tab=quotes");
  await page.getByRole("link", { name: new RegExp(`2 × diaphragm compressors ${tag}`) }).click();
  await expect(page.getByRole("region", { name: "Quote comparison" })).toBeVisible();
  await expect(page.getByText("Lowest").first()).toBeVisible();
  await expect(page.getByText("Shortest")).toBeVisible();
  await page.getByRole("link", { name: "Accept quote" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Accept");
  // Ordering is on in local and staging with the simulated payment partner (A176): accepting creates the order and
  // the supplier is asked to confirm it. With transactions off (production before Launch 2) Confirm stays off (C8).
  if (process.env.FLAG_TRANSACTIONS === "true") {
    await page.getByRole("button", { name: /^Accept/ }).click();
    await page.waitForURL(/\/buyer\/orders\//);
    await expect(page.getByRole("heading", { name: /Waiting for .* to confirm/ })).toBeVisible();
  } else {
    await expect(page.getByText("Ordering opens in Launch 2")).toBeVisible();
    await expect(page.getByRole("button", { name: /Accept/ })).toBeDisabled();
  }
});
