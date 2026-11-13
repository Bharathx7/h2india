import { expect, test } from "@playwright/test";
import { signInOperator } from "../helpers/cms";
import { ownIp } from "../helpers/sign-in";

// Stage 11 (11.4, 11.7, 11.8): the Users, Compliance, Reports and System settings screens open for a Super admin and
// show their designed states. Desktop only (the back office asks phones for a larger screen).
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "desktop only (627:1001)");
  await ownIp(context, info);
});

test("Users, roles and the audit log", async ({ page }) => {
  await signInOperator(page, "Super admin");
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { level: 1, name: "Users" })).toBeVisible();
  await page.getByRole("link", { name: "Operator roles" }).click();
  await expect(page.getByRole("region", { name: /permissions/ })).toBeVisible();
  await page.getByRole("link", { name: "Audit log" }).click();
  await expect(page.getByRole("region", { name: "Audit log" }).or(page.getByText("Nothing matches"))).toBeVisible();
});

test("Compliance tabs and a data-rights request", async ({ page }) => {
  await signInOperator(page, "Super admin");
  await page.goto("/admin/compliance?tab=data-rights");
  await page.getByLabel("Request").selectOption("erase");
  await page.getByLabel("Their email").fill(`nobody-${String(Date.now())}@example.com`);
  await page.getByRole("button", { name: "Log request" }).click();
  await expect(page.getByText("Request logged with a DRR reference")).toBeVisible();
  await expect(page.getByText(/^DRR-\d{4}-\d{4}$/).first()).toBeVisible();
});

test("Reports and System settings", async ({ page }) => {
  await signInOperator(page, "Super admin");
  await page.goto("/admin/reports");
  await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible();
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { level: 2, name: "Switches" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Clocks" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Failed jobs" })).toBeVisible();
});
