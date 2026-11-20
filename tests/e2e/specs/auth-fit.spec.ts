import { expect, test } from "../fixtures";
import { ownIp } from "../helpers/sign-in";

// Founder (20 Nov 2026): every sign-in, create-account and join page has one design, told apart by role, and fits one
// screen. Desktop (1440 × 900): no page scroll on any of them, and the role panel names the role. Phones (390 × 844):
// the sign-in pages fit without scrolling and show the role badge.

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

const ROLES = [
  ["/buyer/sign-in", "Buyer"],
  ["/supplier/sign-in", "Supplier"],
  ["/member/sign-in", "Member"],
  ["/join/buyer", "Buyer"],
  ["/join/supplier", "Supplier"],
  ["/join/member", "Member"],
  ["/sign-in/staff", "H2 Economy staff"],
] as const;

const fits = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);

for (const [path, role] of ROLES) {
  test(`${path} fits one screen and names its role`, async ({ page }, info) => {
    const phone = info.project.name.startsWith("mobile");
    test.skip(phone && path.startsWith("/join"), "A join form can be longer than a phone screen; it scrolls there");
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (phone) await expect(page.locator("main").locator("xpath=..").getByText(role, { exact: true })).toBeVisible();
    else await expect(page.getByRole("complementary", { name: role })).toBeVisible();
    expect(await fits(page), `${path} scrolls`).toBe(true);
  });
}
