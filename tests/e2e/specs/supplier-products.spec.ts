import { expect, test } from "@playwright/test";
import { signInOperator } from "../helpers/cms";
import { ownIp } from "../helpers/sign-in";

// Step 8.3: the Listings queue opens for a catalogue moderator. The supplier side (add, submit, needs changes,
// approval) runs in flow C (step 8.8) and editor.int.test.ts.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("a catalogue moderator opens the Listings queue", async ({ page }) => {
  await signInOperator(page, "Catalogue moderator");
  await page.goto("/admin/queues");
  await expect(page).toHaveURL(/\/admin\/queues\/listings$/);
  await expect(page.getByRole("heading", { level: 1, name: "Queues" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Past SLA" })).toBeVisible();
});
