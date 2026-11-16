import { expect, test } from "../fixtures";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp } from "../helpers/sign-in";

// Account (public QC, 16 Nov 2026): a real page, not "not found". Since public QC 4 the site header's avatar menu
// has Dashboard and Sign out; Account is reached from Profile in the workspace.

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("signed out, Account sends people to sign in and back", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Faccount|\/sign-in\?next=\/account/);
});

test("the avatar menu has Dashboard and Sign out; the Account page stays reachable", async ({ page, isMobile }) => {
  test.skip(isMobile, "the avatar menu is in the desktop header; phones get Dashboard in the menu");
  const email = newEmail("account");
  await signInNew(page, email);
  await page.goto("/");
  await page.getByRole("button", { name: /^Account: / }).click();
  // Public QC 4: Dashboard opens the person's own workspace; Account is Profile inside the workspace.
  await expect(page.getByRole("menuitem", { name: "Account" })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Dashboard" }).click();
  await expect(page).not.toHaveURL(/\/account$/);
  await page.goto("/account");
  await expect(page.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
  // A person who hasn't joined yet has no name, so the header shows the email too: look in Your details only.
  await expect(page.getByRole("region", { name: "Your details" }).getByText(email).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Notification settings" })).toHaveAttribute(
    "href",
    "/notifications?tab=email",
  );
});
