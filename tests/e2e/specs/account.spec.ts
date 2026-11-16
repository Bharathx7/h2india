import { expect, test } from "../fixtures";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp } from "../helpers/sign-in";

// Account (public QC, 16 Nov 2026): "Account" in the site header's avatar menu opens a real page, not "not found".

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("signed out, Account sends people to sign in and back", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Faccount|\/sign-in\?next=\/account/);
});

test("Account in the avatar menu opens the Account page", async ({ page, isMobile }) => {
  test.skip(isMobile, "the avatar menu is in the desktop header; phones reach Account from the workspace menu");
  const email = newEmail("account");
  await signInNew(page, email);
  await page.goto("/");
  await page.getByRole("button", { name: /^Account: / }).click();
  await page.getByRole("menuitem", { name: "Account" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
  // A person who hasn't joined yet has no name, so the header shows the email too: look in Your details only.
  await expect(page.getByRole("region", { name: "Your details" }).getByText(email).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Notification settings" })).toHaveAttribute(
    "href",
    "/notifications?tab=email",
  );
});
