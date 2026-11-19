import { expect, hydrated, test, type Page } from "../fixtures";
import { fillDetails, latestConfirmLink, latestResetLink, makeMember } from "../helpers/join";
import {
  enterCode,
  ensureAccount,
  newEmail,
  newPassword,
  ownIp,
  requestCode,
  signInWithPassword,
  withDb,
} from "../helpers/sign-in";

// Founder, 19 Nov 2026 (A195): buyers, suppliers and members sign up and sign in with email and password; the emailed
// code stays as the backup ("Email me a code instead"). No mobile number at Join.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL to reset the per-email limits");
test.skip(({ isMobile }) => isMobile, "the password journeys run once, at desktop width");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

/** Clears this email's sign-in and link limits, so a test can ask for another link at once. */
async function clearLimits(email: string) {
  await withDb((db) => db.query("DELETE FROM core.sign_in_throttle WHERE key LIKE $1", [`%${email}%`]));
}

const alert = (page: Page) => page.getByRole("main").getByRole("alert");

test("a new member signs up with a password, confirms by link, and later signs in with it", async ({ page }) => {
  const email = newEmail("pw-member");
  await page.goto("/join/member");
  await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  await expect(page.getByLabel("Mobile")).toHaveCount(0);
  const password = await fillDetails(page, { email, name: "Asha Iyer" });
  expect(password).not.toBe("");
  const sentAfter = Date.now() - 1000;
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await expect(page.getByText("Already have an account with this email?", { exact: false })).toBeVisible();

  // Only the password's hash waits on this browser's draft; no account exists until the link is opened.
  const drafts = await withDb((db) =>
    db.query<{ hashed: boolean; plain: boolean }>(
      `SELECT d.password_hash IS NOT NULL AS hashed, position($2 in d::text) > 0 AS plain
       FROM core.join_drafts d WHERE d.email = $1`,
      [email, password],
    ),
  );
  expect(drafts.rows).toEqual([{ hashed: true, plain: false }]);
  const accounts = await withDb((db) => db.query("SELECT 1 FROM core.users WHERE email = $1", [email]));
  expect(accounts.rowCount).toBe(0);

  await page.goto(await latestConfirmLink(page, email, sentAfter));
  await expect(page.getByRole("heading", { name: "Email confirmed" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "You're in, Asha" })).toBeVisible();

  await page.goto("/sign-out");
  await page.goto("/member/sign-in");
  await signInWithPassword(page, email, password);
  await page.waitForURL(/\/member(\/welcome)?$/);
});

test("a link opened in another browser confirms the email but asks for the password again", async ({
  page,
  browser,
}) => {
  // Founder review (A195, pre-hijacking): the link proves the inbox, not who chose the password, so a password chosen
  // in one browser is never set from a link opened in another.
  const email = newEmail("pw-elsewhere");
  await page.goto("/join/member");
  const first = await fillDetails(page, { email, name: "Ravi Menon" });
  const sentAfter = Date.now() - 1000;
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  const link = await latestConfirmLink(page, email, sentAfter);

  // Before the link is opened there is no account: the password sign-in says only that it's wrong.
  await page.goto("/member/sign-in");
  await signInWithPassword(page, email, first);
  await expect(alert(page)).toContainText("Email or password is wrong");

  const other = await browser.newContext();
  const elsewhere = await other.newPage();
  await elsewhere.goto(link);
  await expect(elsewhere.getByRole("heading", { name: "Email confirmed" })).toBeVisible();
  await elsewhere.getByRole("button", { name: "Continue" }).click();
  await expect(elsewhere).toHaveURL(/\/set-password\?join=1/);
  await expect(elsewhere.getByRole("heading", { name: "Set your password" })).toBeVisible();
  await expect(elsewhere.getByRole("link", { name: "Skip for now" })).toHaveCount(0);
  await hydrated(elsewhere);
  const second = newPassword();
  await elsewhere.getByLabel("New password").fill(second);
  await elsewhere.getByLabel("Type it again").fill(second);
  await elsewhere.getByRole("button", { name: "Set password" }).click();
  await expect(elsewhere.getByRole("heading", { name: "You're in, Ravi" })).toBeVisible();
  await other.close();

  // The password typed in the first browser was never set; the one chosen after the link works.
  await clearLimits(email);
  await page.goto("/member/sign-in");
  await signInWithPassword(page, email, first);
  await expect(alert(page)).toContainText("Email or password is wrong");
  await signInWithPassword(page, email, second);
  await page.waitForURL(/\/member(\/welcome)?$/);
});

test("five wrong passwords pause sign-in for 15 minutes", async ({ page }) => {
  const email = newEmail("pw-wrong");
  await ensureAccount(email);
  await page.goto("/buyer/sign-in");
  for (let left = 4; left >= 1; left--) {
    await signInWithPassword(page, email, `wrong-password-${String(left)}`);
    await expect(alert(page)).toContainText(
      `You have ${String(left)} ${left === 1 ? "try" : "tries"} left before we pause sign-in for 15 minutes.`,
    );
  }
  await signInWithPassword(page, email, "wrong-password-0");
  await expect(page.getByRole("heading", { name: "Sign-in paused for 15 minutes" })).toBeVisible();
  await expect(page.getByText(`There were too many wrong passwords for ${email}.`, { exact: false })).toBeVisible();
});

test("forgot password: the emailed link sets a new password, then it signs in", async ({ page }) => {
  // An account that always signed in with a code: Forgot password is how it sets its first password.
  const email = newEmail("pw-forgot");
  await ensureAccount(email);
  await makeMember(email);
  await page.goto("/member/sign-in");
  await expect(page.getByText("First time with a password? Set one with Forgot password.")).toBeVisible();
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
  await hydrated(page);
  await page.getByRole("main").getByLabel("Email", { exact: true }).fill(email);
  const sentAfter = Date.now() - 1000;
  await page.getByRole("button", { name: "Send link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText(`If an account exists for ${email}`, { exact: false })).toBeVisible();

  await page.goto(await latestResetLink(page, email, sentAfter));
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  await page.getByLabel("New password").fill("short");
  await page.getByLabel("Type it again").fill("short");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Use at least 8 characters", { exact: true })).toBeVisible();
  const password = newPassword();
  await page.getByLabel("New password").fill(password);
  await page.getByLabel("Type it again").fill(password);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByRole("heading", { name: "Password changed" })).toBeVisible();

  await page.getByRole("main").getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/member\/sign-in/);
  await signInWithPassword(page, email, password);
  await page.waitForURL(/\/member(\/welcome)?$/);
});

test("Email me a code instead still signs in with a code", async ({ page }) => {
  const email = newEmail("pw-code");
  await ensureAccount(email);
  await page.goto("/buyer/sign-in");
  await hydrated(page);
  await page.getByRole("button", { name: "Email me a code instead" }).click();
  await expect(page.getByRole("button", { name: "Send code" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with a password instead" })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
  await enterCode(page, await requestCode(page, email));
  // A confirmed account that never finished joining carries on with the buyer sign-up.
  await expect(page).toHaveURL(/\/join\/buyer$/);
});
