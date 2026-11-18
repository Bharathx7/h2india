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

test("a buyer opening the Directory joins as a member in one click and comes back", async ({ page }) => {
  await signInBuyer(page);
  // Old website addresses redirect into the member workspace (founder, 18 Nov 2026), keeping the filters.
  await page.goto("/directory/companies?state=Gujarat");
  await expect(page).toHaveURL(/\/member\/join\?next=%2Fmember%2Fdirectory%3Fstate%3DGujarat/);
  await expect(page.getByRole("heading", { level: 1, name: "Join as a member" })).toBeVisible();
  await page.getByRole("button", { name: "Join as member" }).click();
  await page.waitForURL(/\/member\/directory\?state=Gujarat/);
  await expect(page.getByRole("navigation", { name: "Directory" })).toBeVisible();
});

test("the member area sends a buyer to Join as member, keeping where they were going", async ({ page }) => {
  await signInBuyer(page);
  await page.goto("/member/alerts?type=tenders");
  await expect(page).toHaveURL(/\/member\/join\?next=%2Fmember%2Falerts%3Ftype%3Dtenders/);
  await expect(page.getByRole("heading", { level: 1, name: "Join as a member" })).toBeVisible();
});
