import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "../fixtures";

// Founder (20 Nov 2026): For Buyers, For Members and For Suppliers share one layout (hero without dots and with a
// preview, equal cards, why, how it works); the buyers page never offers supplier sign-up and the suppliers page never
// offers buyer sign-up; Pricing keeps plans open and locks commission and add-ons behind Contact us.

async function seriousIssues(page: Page) {
  const axe = await new AxeBuilder({ page }).include("main").analyze();
  return axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id);
}

for (const [path, heading, can] of [
  ["/for-buyers", "Source hydrogen equipment with confidence", "What buyers can do"],
  ["/for-members", "Join H2 Economy as a member", "What members can do"],
  ["/for-suppliers", "Reach India’s hydrogen buyers", "What suppliers get"],
] as const) {
  test(`${path} follows the common layout`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole("heading", { name: can })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "How it works" }).or(page.getByRole("heading", { name: "Live in 4 steps" })),
    ).toBeVisible();
    await expect(page.locator("main .depth-dot-grid")).toHaveCount(0);
    expect(await seriousIssues(page), path).toEqual([]);
  });
}

test("the buyers page offers no supplier sign-up, and the suppliers page no buyer sign-up", async ({ page }) => {
  await page.goto("/for-buyers");
  const buyers = page.locator("main");
  await expect(
    buyers.locator('a[href^="/join/supplier"], a[href^="/supplier/"], a[href="/list-your-company"]'),
  ).toHaveCount(0);
  await page.goto("/for-suppliers");
  const suppliers = page.locator("main");
  await expect(suppliers.locator('a[href^="/join/buyer"], a[href^="/buyer/"]')).toHaveCount(0);
});

test("pricing locks commission and add-ons behind Contact us", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { level: 1, name: "Free for buyers. Simple for suppliers." })).toBeVisible();
  await expect(page.getByText("Commission rates are shared on request")).toBeVisible();
  await expect(page.getByText("Add-on prices are shared on request")).toBeVisible();
  const contact = page.getByRole("link", { name: "Contact us for details" });
  await expect(contact).toHaveCount(2);
  await expect(contact.first()).toHaveAttribute("href", "/contact?about=supplier");
});
