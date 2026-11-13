import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  addAuthenticator,
  emailCount,
  enterCode,
  latestCode,
  newEmail,
  ownIp,
  requestCode,
  withDb,
} from "../helpers/sign-in";

// Step 3.2: Sign in (Figma 524:1773, 526:508), Enter code (524:1840), wrong code (524:1930), locked (524:2036),
// the sign-in code email (671:428), and decisions A1 to A3.

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${String(v.nodes.length)} × ${v.help}`)).toEqual([]);
}

test("a new user signs in with an email code, adds a passkey, signs out and signs back in with it", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "the full journey runs once, at desktop width");
  await addAuthenticator(page);
  const email = newEmail("new-buyer");

  // Decision A1: an email with no account still gets a code; the account is made when the code is entered,
  // and the new person goes on to Join (step 3.3).
  await page.goto("/sign-in?next=/buyer");
  await enterCode(page, await requestCode(page, email));

  await expect(page.getByRole("heading", { name: "Set up a passkey" })).toBeVisible();
  await page.getByRole("button", { name: "Create passkey" }).click();
  await expect(page).toHaveURL(/\/join$/);

  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name === "h2.session_token");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");

  // Signed-in people who open the sign-in page go straight on (to Join, until they have joined).
  await page.goto("/sign-in?next=/buyer");
  await expect(page).toHaveURL(/\/join$/);

  await page.goto("/sign-out");
  await expect(page).toHaveURL(/\/$/);
  expect((await page.context().cookies()).some((c) => c.name === "h2.session_token")).toBe(false);

  // Back with only the passkey: no email needed.
  await page.goto("/sign-in?next=/buyer");
  await page.getByRole("button", { name: "Continue with passkey" }).click();
  await expect(page).toHaveURL(/\/join$/);
});

test("Not now skips the passkey offer, and it is not offered again on this device", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop only");
  test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL to skip the 30-second resend wait");
  await addAuthenticator(page);
  const email = newEmail("later");
  await page.goto("/sign-in?next=/member");
  await enterCode(page, await requestCode(page, email));
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(page).toHaveURL(/\/join$/);

  await page.goto("/sign-out");
  await withDb((db) => db.query("DELETE FROM core.sign_in_throttle WHERE key = $1", [`sign-in:gap:${email}`]));
  await page.goto("/sign-in?next=/member");
  await enterCode(page, await requestCode(page, email));
  await expect(page).toHaveURL(/\/join$/);
});

test("a wrong code says how many tries are left; five pause sign-in for 15 minutes", async ({ page }) => {
  const email = newEmail("wrong");
  await page.goto("/sign-in");
  const right = await requestCode(page, email);
  const wrong = right === "000000" ? "111111" : "000000";

  for (let left = 4; left >= 1; left--) {
    await enterCode(page, wrong);
    const alert = page.getByRole("main").getByRole("alert").filter({ hasText: "That code didn't work" });
    await expect(alert).toContainText(
      `You have ${String(left)} ${left === 1 ? "try" : "tries"} left before we pause sign-in for 15 minutes.`,
    );
    await expect(page.getByRole("textbox", { name: "Digit 1 of 6" })).toHaveAttribute("aria-invalid", "true");
  }
  if (test.info().project.name === "desktop-1440") await axe(page);

  await enterCode(page, wrong);
  await expect(page.getByRole("heading", { name: "Sign-in paused for 15 minutes" })).toBeVisible();
  await expect(page.getByText(`There were too many wrong codes for ${email}.`)).toBeVisible();
  await expect(page.getByText(/you can try again at \d{1,2}:\d{2} (AM|PM)\./)).toBeVisible();
  await expect(page.getByRole("link", { name: "Not you trying? Contact support" })).toBeVisible();
  await axe(page);

  // Even the right code, or a new code, is refused during the pause.
  await page.getByRole("button", { name: "Back to sign in" }).click();
  const before = await emailCount(page, email);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("heading", { name: "Sign-in paused for 15 minutes" })).toBeVisible();
  expect(await emailCount(page, email)).toBe(before);
});

test("an expired code says so, and Resend code sends a new one", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop only");
  test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL to age the code");
  const email = newEmail("expired");
  await page.goto("/sign-in");
  const code = await requestCode(page, email);
  await withDb((db) =>
    db.query("UPDATE core.verifications SET expires_at = now() - interval '1 minute' WHERE identifier = $1", [
      `sign-in-otp-${email}`,
    ]),
  );
  await enterCode(page, code);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("That code has expired");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Resend a new one.");

  // Resend waits 30 seconds (decision A2).
  await withDb((db) => db.query("DELETE FROM core.sign_in_throttle WHERE key = $1", [`sign-in:gap:${email}`]));
  await page.clock.install();
  await page.clock.fastForward(31_000);
  const sentAfter = Date.now() - 1000;
  await page.getByRole("button", { name: "Resend code" }).click();
  const fresh = await latestCode(page, email, sentAfter, code);
  await enterCode(page, fresh);
  await expect(page.getByRole("heading", { name: "Set up a passkey" })).toBeVisible();
});

test("Resend code waits 30 seconds, on the screen and on the server", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop only");
  const email = newEmail("resend");
  await page.clock.install();
  await page.goto("/sign-in");
  await requestCode(page, email);
  await expect(page.getByText(/^Resend code in 0:(30|29|28)$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Resend code" })).toHaveCount(0);

  // Move only the page's clock: the button comes back, but the server still counts real seconds.
  await page.clock.fastForward(31_000);
  await page.getByRole("button", { name: "Resend code" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Please wait before asking again");
});

test("after signing in you come back to the page you were on, but never to another site", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "desktop only");
  test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL to mark the person as joined");
  const email = newEmail("return");
  await page.goto("/sign-in");
  await enterCode(page, await requestCode(page, email));
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(page).toHaveURL(/\/join$/);
  // A person who has finished Join (here a member) returns to where they started.
  await withDb(async (db) => {
    await db.query("UPDATE core.users SET profile_type = 'member' WHERE email = $1", [email]);
    await db.query("DELETE FROM core.sign_in_throttle WHERE key = $1", [`sign-in:gap:${email}`]);
  });
  await page.goto("/sign-out");
  await page.goto("/sign-in?next=https://evil.example/steal");
  await enterCode(page, await requestCode(page, email));
  await expect(page).toHaveURL("http://localhost:3000/");

  await page.goto("/sign-out");
  await withDb((db) => db.query("DELETE FROM core.sign_in_throttle WHERE key = $1", [`sign-in:gap:${email}`]));
  // A public page with a query (the member home itself first offers onboarding, step 7.1).
  await page.goto("/sign-in?next=/opportunities/tenders%3Fstate%3Dgujarat");
  await enterCode(page, await requestCode(page, email));
  await expect(page).toHaveURL(/\/opportunities\/tenders\?state=gujarat$/);
});

test("Google sends you to Google, or explains when it is not set up here", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop only");
  await page.goto("/sign-in");
  const google = page.waitForRequest(/accounts\.google\.com/, { timeout: 5000 }).catch(() => null);
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const request = await google;
  if (request) {
    expect(new URL(request.url()).searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/callback/google",
    );
  } else {
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Google sign-in isn't available yet");
  }
});

test("the sign-in screens have no accessibility problems and work by keyboard", async ({ page }) => {
  await page.goto("/sign-in");
  await axe(page);
  await page.keyboard.press("Tab"); // logo
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Continue with passkey" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Work email")).toBeFocused();
  await page.keyboard.type(newEmail("keys"));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeFocused();
  await axe(page);
});

test("an email that is not an email is caught before sending", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Work email").fill("ravi@");
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText("Enter your work email, like you@company.com")).toBeVisible();
  await expect(page.getByLabel("Work email")).toHaveAttribute("aria-invalid", "true");
});
