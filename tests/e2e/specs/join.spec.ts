import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "../fixtures";
import {
  fillDetails,
  freshGstin,
  GSTIN,
  latestConfirmLink,
  reachCompanyStep,
  signInNew,
  typeGstin,
} from "../helpers/join";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Step 3.3: Join (Figma 525:8), the eight GSTIN states (526:8), Verify email (365:27778), Join request (365:27779).

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function axe(page: Page) {
  // After an in-app page change Next.js adds the <title> just after the content: wait for it (it must still come).
  await expect(page).toHaveTitle(/\S/);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${String(v.nodes.length)} × ${v.help}`)).toEqual([]);
}

/** Messages in the card: errors and warnings are alerts, the rest are status messages. */
const alert = (page: Page) => page.getByRole("main").locator("[role=alert], [role=status]");

test("a new buyer joins from scratch: confirms the email by link and creates the company from its GSTIN", async ({
  page,
  isMobile,
}) => {
  const email = newEmail("neha");
  const gstin = freshGstin();
  await page.goto("/join");
  await expect(page.getByText("Step 1 of 4 · How you'll use H2 Economy")).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: "Continue" }).click(); // Buyer company is chosen by default

  await expect(page.getByRole("heading", { name: "Find your company" })).toBeVisible();
  await page.getByLabel("Company name or GSTIN").fill("zz-no-such-company");
  await expect(page.getByRole("button", { name: /Create a new company/ })).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: /Create a new company/ }).click();

  await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  await fillDetails(page, { email, name: "Neha Joshi" });
  if (!isMobile) await axe(page);
  const sentAfter = Date.now() - 1000;
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await expect(page.getByText(`We sent a link to ${email}.`)).toBeVisible();
  await expect(page.getByText(/You can resend in \d:\d\d\./)).toBeVisible();
  await axe(page);

  await page.goto(await latestConfirmLink(page, email, sentAfter));
  await expect(page.getByRole("heading", { name: "Email confirmed" })).toBeVisible();
  await expect(page.getByText(`Thanks, ${email} is confirmed.`)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // Public QC 3: company details stay on the buyer's own sign-up page, never the shared /join.
  await expect(page).toHaveURL(/\/join\/buyer\?step=company$/);
  await expect(page.getByText("Create a buyer account", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Company details" })).toBeVisible();
  await typeGstin(page, gstin);
  await expect(alert(page).filter({ hasText: "GSTIN is active" })).toBeVisible();
  await expect(page.getByText(`Test Hydrogen ${gstin.slice(2, 12)} Private Limited`)).toBeVisible();
  await expect(page.getByText("Verification runs in the background")).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: "Create company" }).click();

  await expect(page.getByRole("heading", { name: "You're in, Neha" })).toBeVisible();
  await expect(page.getByText(`Test Hydrogen ${gstin.slice(2, 12)} is set up as a buyer company.`)).toBeVisible();
  await expect(page.getByRole("link", { name: "Send your first quote request" })).toBeVisible();
  await axe(page);
  await page.getByRole("link", { name: "Go to your workspace" }).click();
  await expect(page).toHaveURL(/\/buyer$/);
});

test("the GSTIN step reaches every designed state", async ({ page, isMobile }) => {
  test.skip(isMobile, "the states are checked once, at desktop width");
  await signInNew(page, newEmail("states"));
  await reachCompanyStep(page, "Buyer company", "Ravi Kulkarni");

  // 2 · invalid format (wrong check character)
  await typeGstin(page, GSTIN.badCheck);
  await expect(page.getByText("A GSTIN has 15 characters, like 27AAKCG5521M1Z3")).toBeVisible();
  // 3 · not found
  await typeGstin(page, GSTIN.notFound);
  await expect(alert(page)).toContainText("We couldn't find this GSTIN");
  await expect(page.getByRole("button", { name: "Continue without a GSTIN" })).toBeVisible();
  // 4 · cancelled: a buyer may continue unverified
  await typeGstin(page, GSTIN.cancelled);
  await expect(alert(page)).toContainText("This GSTIN is cancelled");
  await expect(page.getByRole("button", { name: "Use another GSTIN" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue as unverified buyer" })).toBeVisible();
  // 7 · several GSTINs under one PAN
  await typeGstin(page, GSTIN.several);
  await expect(page.getByText("Your PAN AAKCS4410N has 3 GSTINs.")).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(3);
  // One GSTIN per company (founder QC, 17 Nov 2026, A189): choose one, no "add all".
  await expect(page.getByRole("checkbox", { name: /Add all/ })).toHaveCount(0);
  await axe(page);
  // 6 · the portal is down: continue, checked in the background
  await typeGstin(page, freshGstin("AAKCP"));
  await expect(alert(page)).toContainText("We'll check this in the background");
  // 1 · valid
  await typeGstin(page, freshGstin());
  await expect(alert(page)).toContainText("GSTIN is active");
  // 8 · no GSTIN yet (offered while no GSTIN has been accepted)
  await typeGstin(page, "");
  await page.getByRole("checkbox", { name: "I don't have a GSTIN yet" }).check();
  await expect(page.getByText("You can still use H2 Economy")).toBeVisible();
  await expect(page.getByLabel("Company name")).toBeVisible();
  // 5 · already registered is in the next test.
});

test("a second person from the same company gets a join request, not a second company", async ({
  page,
  browser,
  isMobile,
}) => {
  test.skip(isMobile, "desktop only");
  const gstin = freshGstin();
  await signInNew(page, newEmail("owner"));
  await reachCompanyStep(page, "Buyer company", "Meera Pillai");
  await typeGstin(page, gstin);
  await page.getByRole("button", { name: "Create company" }).click();
  await expect(page.getByRole("heading", { name: "You're in, Meera" })).toBeVisible();

  const other = await browser.newContext();
  const second = await other.newPage();
  await other.setExtraHTTPHeaders({ "x-forwarded-for": `10.200.${String(Date.now() % 250)}.7` });
  const secondEmail = newEmail("arjun");
  await signInNew(second, secondEmail);
  await reachCompanyStep(second, "Buyer company", "Arjun Shah");
  await typeGstin(second, gstin);
  await expect(alert(second)).toContainText(
    `Test Hydrogen ${gstin.slice(2, 12)} Private Limited is already on H2 Economy`,
  );
  await expect(alert(second)).toContainText("1 colleague has joined.");
  await second.getByRole("button", { name: "Request to join" }).click();

  await expect(second.getByRole("heading", { name: "Waiting for approval" })).toBeVisible();
  await expect(second.getByText(/We've asked Meera Pillai, the admin at Test Hydrogen/)).toBeVisible();
  await expect(second.getByText(`Requested by ${secondEmail}`, { exact: false })).toBeVisible();
  await axe(second);
  await second.getByRole("button", { name: "Send a reminder" }).click();
  await expect(alert(second)).toContainText("Reminder sent");
  await expect(second.getByRole("button", { name: "Send a reminder" })).toBeDisabled();

  if (process.env.DATABASE_URL) {
    const companies = await withDb((db) =>
      db.query("SELECT count(*)::int AS n FROM core.organisations WHERE pan = $1", [gstin.slice(2, 12)]),
    );
    expect(companies.rows[0]).toEqual({ n: 1 });

    // The admin's answer arrives later (company settings, step 7). Each designed outcome screen:
    const set = (status: string, extra = "") =>
      withDb((db) =>
        db.query(
          `UPDATE core.join_requests SET status = $1 ${extra} WHERE user_id = (SELECT id FROM core.users WHERE email = $2)`,
          [status, secondEmail],
        ),
      );
    await set("Rejected", ", reason = 'We only add people from the procurement team.'");
    await second.reload();
    await expect(second.getByRole("heading", { name: "Your request wasn't approved" })).toBeVisible();
    await expect(second.getByText("We only add people from the procurement team.")).toBeVisible();
    await expect(second.getByRole("link", { name: "Contact the admin" })).toHaveAttribute("href", /^mailto:/);
    await set("Expired");
    await second.reload();
    await expect(second.getByRole("heading", { name: "Your request expired" })).toBeVisible();
    await expect(second.getByRole("button", { name: "Send a new request" })).toBeVisible();
  }
  await other.close();
});

test("when the GST portal is down the person continues, and the background check finishes it", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "desktop only");
  test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL to watch the background check");
  const gstin = freshGstin("AAKCP");
  await signInNew(page, newEmail("slow"));
  await reachCompanyStep(page, "Supplier company", "Pratap Rao");
  await typeGstin(page, gstin);
  await expect(alert(page)).toContainText("We'll check this in the background");
  await page.getByLabel("Company name").fill("Pratap Test Works");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "You're in, Pratap" })).toBeVisible();
  await expect(page.getByText("Pratap Test Works is set up as a supplier company.")).toBeVisible();

  const status = () =>
    withDb((db) =>
      db.query<{ portal_status: string; verification: string }>(
        `SELECT g.portal_status, o.verification FROM core.organisation_gstins g
         JOIN core.organisations o ON o.id = g.organisation_id WHERE g.gstin = $1`,
        [gstin],
      ),
    ).then((r) => r.rows[0]);
  expect(await status()).toEqual({ portal_status: "Pending", verification: "Pending" });
  await expect.poll(status, { timeout: 45_000, intervals: [1000] }).toEqual({
    portal_status: "Active",
    verification: "GST verified",
  });
});

test("an individual member joins in two steps", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop only");
  await signInNew(page, newEmail("student"));
  await page.getByText("Individual member", { exact: true }).click();
  await expect(page.getByText("Step 1 of 2 · How you'll use H2 Economy")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  // Public QC 2: the choice sends people on to that account's own sign-up page, here one step.
  await expect(page).toHaveURL(/\/join\/member$/);
  await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  await expect(page.getByLabel("Work email")).toHaveAttribute("readonly", "");
  await fillDetails(page, { name: "Asha Iyer" });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "You're in, Asha" })).toBeVisible();
  await page.getByRole("link", { name: "Go to your home" }).click();
  await expect(page).toHaveURL(/\/member$/);
});

test("Your details checks every field before going on", async ({ page }) => {
  await page.goto("/join");
  await page.getByText("Individual member", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Enter your work email, like you@company.com")).toBeVisible();
  await expect(page.getByText("Confirm your mobile number with the code we send")).toBeVisible();
  await expect(page.getByText("Enter your full name")).toBeVisible();
  await expect(page.getByText("Choose your role from the list")).toBeVisible();
  await page.getByLabel("Mobile").fill("12345");
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText("Enter a 10-digit mobile number")).toBeVisible();
  await axe(page);
});

// Founder QC, 19 Nov 2026: a confirm link opened in another browser (or on a phone, or in the email app) lost the
// sign-up answers and fell back to the shared /join choice. The link now carries its draft.
test("a new supplier confirms the email in a different browser and goes straight on to company details", async ({
  page,
  browser,
}) => {
  const email = newEmail("ravi");
  await page.goto("/join/supplier");
  await page.getByLabel("Company name or GSTIN").fill("zz-no-such-company");
  await page.getByRole("button", { name: /Create a new company/ }).click();
  await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  await fillDetails(page, { email, name: "Ravi Menon" });
  const sentAfter = Date.now() - 1000;
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  const link = await latestConfirmLink(page, email, sentAfter);

  // A second browser that never saw the sign-up form.
  const other = await browser.newContext();
  const elsewhere = await other.newPage();
  await elsewhere.goto(link);
  await expect(elsewhere.getByRole("heading", { name: "Email confirmed" })).toBeVisible();
  await expect(elsewhere.getByText("Next: finish a supplier account for Ravi Menon.")).toBeVisible();
  await elsewhere.getByRole("button", { name: "Continue" }).click();
  await expect(elsewhere).toHaveURL(/\/join\/supplier\?step=company$/);
  await expect(elsewhere.getByRole("heading", { name: "Company details" })).toBeVisible();
  await other.close();
});
