import { expect, test } from "../fixtures";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp } from "../helpers/sign-in";

// Member Sign-in and security and Join a company (founder QC, 17 Nov 2026): both menu items led to "not found".

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("Sign-in and security shows how the member signs in and this device", async ({ page }) => {
  const email = newEmail("member-security");
  await signInNew(page, email);
  await page.goto("/member/security");
  await expect(page.getByRole("heading", { level: 1, name: "Sign-in and security" })).toBeVisible();
  await expect(page.getByRole("region", { name: "How you sign in" }).getByText(email).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Signed-in devices" }).getByText("This device")).toBeVisible();
  await expect(page.getByText("You're signed in only on this device.")).toBeVisible();
});

test("Join a company searches companies and explains when none match", async ({ page }) => {
  await signInNew(page, newEmail("member-join"));
  await page.goto("/member/join-company");
  await expect(page.getByRole("heading", { level: 1, name: "Join a company" })).toBeVisible();
  await page.getByLabel("Company name or GSTIN").fill("zz-no-such-company-anywhere");
  await expect(page.getByText("No company found")).toBeVisible();
});

test("the member menu's Sign-in and security and Join a company open real pages", async ({ page, isMobile }) => {
  test.skip(isMobile, "the desktop sidebar");
  await signInNew(page, newEmail("member-menu"));
  await page.goto("/member/saved");
  for (const [name, heading] of [
    ["Sign-in and security", "Sign-in and security"],
    ["Join a company", "Join a company"],
  ] as const) {
    await page.getByRole("navigation", { name: "Member workspace" }).getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});
