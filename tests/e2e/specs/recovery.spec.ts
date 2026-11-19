import { expect, test } from "../fixtures";
import { ownIp } from "../helpers/sign-in";

// Step 3.5: account recovery (Figma 528:8), Flow I. The changed-mobile journey was removed with the mobile number
// (founder, 19 Nov 2026, A195); Forgot password is covered by password-sign-in.spec.ts.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL to set up accounts");
test.skip(({ isMobile }) => isMobile, "recovery journeys run once, at desktop width");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("the recovery hub offers Forgot password and support, no passkey (A183) and no mobile change (A195)", async ({
  page,
}) => {
  await page.goto("/forgot-access");
  await expect(page.getByRole("link", { name: /Forgot password/ })).toHaveAttribute("href", "/forgot-password");
  await expect(page.getByRole("link", { name: /Can't reach your email\? Contact support/ })).toHaveAttribute(
    "href",
    "/forgot-access/email",
  );
  await expect(page.getByRole("link", { name: /passkey/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /mobile number/i })).toHaveCount(0);
  const gone = await page.request.get("/forgot-access/passkey");
  expect(gone.status()).toBe(404);
  // Old links to "I changed my mobile number" (removed with the mobile number, A195) come back to the hub.
  await page.goto("/forgot-access/mobile");
  await expect(page).toHaveURL(/\/forgot-access$/);
});
