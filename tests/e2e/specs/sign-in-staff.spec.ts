import { expect, test } from "../fixtures";
import { latestPasswordLink } from "../helpers/join";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Staff sign-in (founder, 17 Nov 2026, A183): the back office signs H2 Economy staff in with email and password; passkeys
// were removed. A new operator sets a password from an emailed link; non-staff emails get "Email or password is
// wrong"; five wrong passwords pause the email like five wrong codes.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL to make an operator");
test.skip(({ isMobile }) => isMobile, "the back office is desktop only");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

/** An account with an operator role, made as Join and a role grant would make it. */
async function operator(): Promise<string> {
  const email = newEmail("staff");
  await withDb(async (db) => {
    await db.query(
      `INSERT INTO core.users (id, email, name, email_verified, profile_type) VALUES (gen_random_uuid(), $1, 'Staff Person', true, 'member')`,
      [email],
    );
    await db.query(
      `INSERT INTO core.operator_roles (user_id, role_id)
       SELECT u.id, r.id FROM core.users u, core.roles r WHERE u.email = $1 AND r.scope = 'operator' AND r.name = 'Super admin'`,
      [email],
    );
  });
  return email;
}

test("staff set a password from the emailed link, then sign in to the back office with it", async ({ page }) => {
  const email = await operator();
  await page.goto("/sign-in/staff");
  await page.getByRole("link", { name: "Set or forgot your password?" }).click();
  await page.getByLabel("Work email").fill(email);
  const sentAfter = Date.now() - 1000;
  await page.getByRole("button", { name: "Send link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  await page.goto(await latestPasswordLink(page, email, sentAfter));
  await expect(page.getByRole("heading", { name: "Choose a password" })).toBeVisible();
  await page.getByLabel("New password").fill("short");
  await page.getByLabel("Type it again").fill("short");
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(page.getByText("Use at least 8 characters")).toBeVisible();
  const password = `Pw-${String(Date.now())}-staff`;
  await page.getByLabel("New password").fill(password);
  await page.getByLabel("Type it again").fill(password);
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(page.getByRole("heading", { name: "Password set" })).toBeVisible();

  await page.getByRole("link", { name: "Sign in" }).click();
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin/);
});

test("a wrong password says how many tries are left; anyone who isn't staff gets the same message", async ({
  page,
}) => {
  const email = await operator();
  await page.goto("/sign-in/staff");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Email or password is wrong");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("4 tries left");

  await page.getByLabel("Work email").fill(newEmail("not-staff"));
  await page.getByLabel("Password", { exact: true }).fill("anything-at-all");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Email or password is wrong");
});

test("the general sign-in has no passkey and links staff to the password sign-in", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: /passkey/i })).toHaveCount(0);
  await page.getByRole("link", { name: "Sign in with your password" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to the H2 Economy back office" })).toBeVisible();
});
