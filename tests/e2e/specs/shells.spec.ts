import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Step 2.4: workspace shells from Figma 194:1190 and 194:1191.

test("each workspace shows its navigation groups", async ({ page, isMobile }) => {
  test.skip(isMobile, "the full sidebar is checked at desktop width; phones use the menu drawer");
  const expected: Record<string, string[]> = {
    supplier: ["Catalogue", "Selling", "Business", "Company"],
    buyer: ["Buying", "Lists and alerts", "Company"],
    admin: ["Manage", "Commerce", "System"],
    member: ["Following", "Learning", "Account", "Explore"],
  };
  for (const [area, headings] of Object.entries(expected)) {
    await page.goto(`/dev/shells/workspace?area=${area}`);
    const nav = page.getByRole("navigation", { name: new RegExp(`${area} workspace`, "i") });
    for (const h of headings) await expect(nav.locator("p").filter({ hasText: new RegExp(`^${h}$`) })).toBeVisible();
  }
});

test("workspace shell has no accessibility violations", async ({ page }) => {
  await page.goto("/dev/shells/workspace?area=supplier");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
});

test("on a phone the menu drawer traps focus and returns it on close", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone only");
  await page.goto("/dev/shells/workspace?area=member");
  const open = page.getByRole("button", { name: "Open menu" });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Member menu" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 30; i++) await page.keyboard.press("Tab");
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
});
