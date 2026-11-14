import { expect, test } from "@playwright/test";
import { backOfficeContext, signInOperator } from "../helpers/cms";
import { signInNew } from "../helpers/join";
import { latestCode, newEmail, ownIp, withDb } from "../helpers/sign-in";

// Step 6.7 DONE WHEN: flow J end to end (claim by company email, an operator approves, the claimant manages the
// profile); a claimed profile can't be claimed again and the person is offered a join request; the contact tab hides
// contact details from signed-out visitors.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

const tag = Math.random().toString(36).slice(2, 8);
const domain = `flowj-${tag}.example.com`;
const slug = `flowj-${tag}`;

test.beforeAll(async () => {
  await withDb(async (db) => {
    const org = (
      await db.query<{ id: string }>(
        `INSERT INTO core.organisations (id, kind, legal_name, state) VALUES (gen_random_uuid(), 'supplier', $1, 'Tamil Nadu') RETURNING id`,
        [`Shakti ${tag} Private Limited`],
      )
    ).rows[0]?.id;
    await db.query(
      `INSERT INTO core.company_profiles (organisation_id, slug, trade_name, website, city, types, claim_status) VALUES ($1, $2, $3, $4, 'Coimbatore', '{Manufacturer}', 'Unclaimed')`,
      [org, slug, `Shakti ${tag}`, `https://${domain}`],
    );
  });
});

test("flow J: claim by company email, an operator approves, and the profile is claimed", async ({ page, browser }) => {
  // Two people sign in and the whole journey runs, so it gets more than the default 30 seconds.
  test.setTimeout(120_000);
  // Signed out, the contact tab hides contact details and the profile offers the claim.
  await page.goto(`/directory/companies/${slug}?tab=contact`);
  await expect(page.getByRole("heading", { name: "Sign in to see contact details" })).toBeVisible();
  await expect(page.getByText(domain)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Claim this profile" })).toBeVisible();

  const me = newEmail("claimant");
  await signInNew(page, me);
  await page.goto(`/directory/companies/${slug}/claim`);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/Your email on/).fill(`meera@gmail.com`);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText(`Use an email address on ${domain}`)).toBeVisible();
  const work = `meera.${tag}@${domain}`;
  await page.getByLabel(/Your email on/).fill(work);
  await page.getByRole("button", { name: "Send code" }).click();
  const code = await latestCode(page, work);
  await page.getByRole("textbox").first().click();
  await page.keyboard.type(code);
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText("We're checking your claim")).toBeVisible();

  // An operator approves it.
  const ops = await backOfficeContext(browser);
  const opPage = await ops.newPage();
  await signInOperator(opPage, "Super admin");
  await opPage.goto("/admin/verification");
  const row = opPage.getByRole("listitem").filter({ hasText: `Shakti ${tag}` });
  await expect(row.getByText(`Company email verified: ${work}`)).toBeVisible();
  await row.getByRole("button", { name: "Approve" }).click();
  // Decided claims leave the waiting list.
  await expect(row).toHaveCount(0);
  await ops.close();

  await page.reload();
  await expect(page.getByText(`You manage Shakti ${tag} now`)).toBeVisible();
  await page.goto(`/directory/companies/${slug}`);
  await expect(page.getByRole("link", { name: "Claim this profile" })).toHaveCount(0);
});

test("a claimed profile can't be claimed again: the person can ask to join", async ({ page }) => {
  await signInNew(page, newEmail("latecomer"));
  await page.goto(`/directory/companies/${slug}/claim`);
  await expect(page.getByRole("heading", { name: "This profile has already been claimed" })).toBeVisible();
  await page.getByRole("button", { name: "Ask to join the team" }).click();
  await expect(page.getByText("Request sent")).toBeVisible();
});
