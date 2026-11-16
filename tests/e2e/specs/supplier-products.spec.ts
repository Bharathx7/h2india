import { expect, test } from "../fixtures";
import { backOfficeContext, signInOperator } from "../helpers/cms";
import { ownIp } from "../helpers/sign-in";

// Step 8.3: the Listings queue opens for a catalogue moderator. The supplier side (add, submit, needs changes,
// approval) runs in flow C (step 8.8) and editor.int.test.ts.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test("a catalogue moderator opens the Listings queue", async ({ browser }, info) => {
  // The back office is desktop only (627:1001), so the moderator works on a computer in both projects.
  const context = await backOfficeContext(browser);
  await ownIp(context, info);
  const page = await context.newPage();
  await signInOperator(page, "Catalogue moderator");
  // Queues opens on its first tab, Suppliers (627:8, step 11.2); Listings is one of the tabs.
  await page.goto("/admin/queues");
  await expect(page).toHaveURL(/\/admin\/queues\/suppliers$/);
  await page
    .getByRole("link", { name: /^Listings/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/admin\/queues\/listings$/);
  await expect(page.getByRole("heading", { level: 1, name: "Queues" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Past SLA" })).toBeVisible();
  await context.close();
});
