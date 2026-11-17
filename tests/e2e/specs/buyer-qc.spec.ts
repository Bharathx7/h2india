import { expect, test } from "../fixtures";
import { setup } from "../helpers/orders";
import { signInExisting } from "../helpers/rfq";
import { ownIp } from "../helpers/sign-in";

// Workspace QC 2 · Buyer (founder QC, 17 Nov 2026): a clean dashboard with a summary row, project lists with the
// lists on the left, alerts as a table, and Company as tabs with the shared Team panel and order limits.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("the buyer dashboard, lists, alerts and Company · Team are laid out as reviewed", async ({ page }) => {
  test.setTimeout(120_000);
  const d = await setup();
  await signInExisting(page, d.buyerEmail, "/buyer");
  const summary = page.getByRole("list", { name: "Summary" });
  await expect(summary.getByText("Open quote requests")).toBeVisible();
  await expect(summary.getByText("Quotes to review")).toBeVisible();
  await expect(summary.getByText("Project lists")).toBeVisible();

  await page.goto("/buyer/lists");
  await expect(page.getByRole("heading", { level: 1, name: "Project lists" })).toBeVisible();

  await page.goto("/buyer/alerts");
  await expect(page.getByRole("heading", { level: 1, name: "Alerts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Watch a category" }).first()).toBeVisible();

  await page.goto("/buyer/company");
  const tabs = page.getByRole("navigation", { name: "Company settings" });
  await tabs.getByRole("link", { name: "Team" }).click();
  await expect(page).toHaveURL(/section=users/);
  await expect(page.getByRole("button", { name: "Add member" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Order limits" })).toBeVisible();
  await expect(page.getByText("Full access").first()).toBeVisible();
});
