import { expect, test } from "../fixtures";
import { signInOperator } from "../helpers/cms";
import { ownIp } from "../helpers/sign-in";

// Founder (20 Nov 2026: the CMS was too confusing): /admin/content opens on a content home with what needs attention,
// Create something new, Recently changed and one search; a side menu lists the sections in plain words; each section
// page explains every kind of content and offers Open and New. Desktop only (627:1001).
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "desktop only (627:1001)");
  await ownIp(context, info);
});

test("the content home leads to a section, a new record and search results", async ({ page }) => {
  await signInOperator(page, "Content editor");
  await page.goto("/admin/content");
  await expect(page.getByRole("heading", { level: 1, name: "Content" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create something new" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recently changed" })).toBeVisible();

  const menu = page.getByRole("navigation", { name: "Content sections" });
  await expect(menu.getByRole("link", { name: "Content home" })).toHaveAttribute("aria-current", "page");
  await menu.getByRole("link", { name: "Tracker" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Tracker" })).toBeVisible();
  await expect(page.getByText("Hydrogen refuelling stations.")).toBeVisible();
  await page.locator('a[href="/admin/content/tracker-stations/new"]').click();
  await expect(page).toHaveURL(/\/admin\/content\/tracker-stations\/new$/);

  await page.goto("/admin/content");
  await page.getByRole("searchbox", { name: "Search all content" }).fill("hydrogen");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/content\?q=hydrogen/);
  await expect(page.getByRole("heading", { level: 1, name: /Results for/ })).toBeVisible();
});

test("a type's list says what it is and leads back to its section", async ({ page }) => {
  await signInOperator(page, "Content editor");
  await page.goto("/admin/content/glossary");
  await expect(
    page.getByText("Terms explained; they show as hover cards in articles.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Knowledge" }).first().click();
  await expect(page).toHaveURL(/\/admin\/content\?section=knowledge$/);
  await expect(page.getByRole("heading", { level: 1, name: "Knowledge" })).toBeVisible();
});
