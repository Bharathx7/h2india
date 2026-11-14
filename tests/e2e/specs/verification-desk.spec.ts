import { expect, test } from "@playwright/test";
import { signInOperator } from "../helpers/cms";
import { ownIp } from "../helpers/sign-in";

// Step 8.2: the Verification desk (635:9) with its tabs; the full supplier path (upload, approve, badge on the profile)
// is in flow C (step 8.8) and supplier.int.test.ts.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("an operator opens the Verification desk", async ({ page }) => {
  await signInOperator(page, "Super admin");
  await page.goto("/admin/verification");
  await expect(page.getByRole("heading", { level: 1, name: "Verification" })).toBeVisible();
  for (const tab of ["Needs action", "Expiring in 60 days", "Verified", "Revoked"]) {
    await expect(page.getByRole("link", { name: new RegExp(`^${tab}`) })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Profile claims" })).toBeVisible();
});
