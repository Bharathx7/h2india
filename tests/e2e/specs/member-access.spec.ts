import { expect, test } from "../fixtures";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Membership access (founder QC, 17 Nov 2026): the Directory, the member area, Follow, Save and alerts are for
// members. A buyer or supplier joins as a member with one click on the same account and comes back to what they
// asked for; staff have all access.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL to make a buyer");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

/** A signed-in buyer who hasn't joined as a member (profile type buyer, no member_since). */
async function signInBuyer(page: Parameters<typeof signInNew>[0]) {
  const email = newEmail("access-buyer");
  await signInNew(page, email);
  await withDb((db) => db.query(`UPDATE core.users SET profile_type = 'buyer' WHERE email = $1`, [email]));
  return email;
}

test("a buyer sees the Directory is for members, joins in one click and comes back", async ({ page }) => {
  await signInBuyer(page);
  await page.goto("/directory/companies?state=Gujarat");
  await expect(page.getByRole("heading", { level: 1, name: "The Directory is for members" })).toBeVisible();
  await page.getByRole("link", { name: "Join as member" }).click();
  await expect(page).toHaveURL(/\/member\/join\?next=/);
  await expect(page.getByRole("heading", { level: 1, name: "Join as a member" })).toBeVisible();
  await page.getByRole("button", { name: "Join as member" }).click();
  await page.waitForURL(/\/directory\/companies\?state=Gujarat/);
  await expect(page.getByRole("heading", { level: 1, name: "The Directory is for members" })).toHaveCount(0);
});

test("the member area sends a buyer to Join as member, keeping where they were going", async ({ page }) => {
  await signInBuyer(page);
  await page.goto("/member/alerts?type=tenders");
  await expect(page).toHaveURL(/\/member\/join\?next=%2Fmember%2Falerts%3Ftype%3Dtenders/);
  await expect(page.getByRole("heading", { level: 1, name: "Join as a member" })).toBeVisible();
});

test("a buyer without membership has no Directory menu; once a member, the menu is there", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-1440", "The section nav is desktop");
  const email = await signInBuyer(page);
  await page.goto("/news");
  await expect(page.getByRole("button", { name: "Directory" })).toHaveCount(0);
  await withDb((db) => db.query(`UPDATE core.users SET member_since = now() WHERE email = $1`, [email]));
  await page.goto("/news");
  await expect(page.getByRole("button", { name: "Directory" })).toBeVisible();
});
