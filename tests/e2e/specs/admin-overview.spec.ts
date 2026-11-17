import { expect, test } from "../fixtures";
import { signInOperator } from "../helpers/cms";
import { ownIp } from "../helpers/sign-in";

// Step 11.1: the back office opens on Overview; below 1024 px it asks for a larger screen (627:1001).
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("Overview shows the tiles, and phones see Use a larger screen", async ({ page }, info) => {
  await signInOperator(page, "Content editor");
  await page.goto("/admin");
  if (info.project.name.startsWith("mobile")) {
    await expect(page.getByRole("heading", { name: "Use a larger screen" })).toBeVisible();
    return;
  }
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  // Founder QC (17 Nov 2026): the week's publishing is a short card that opens the full calendar.
  await expect(page.getByRole("heading", { name: "Publishing this week" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open calendar" })).toHaveAttribute("href", "/admin/content/calendar");
  await expect(page.getByRole("link", { name: "Open CMS" })).toHaveCount(0);
  const nav = page.getByRole("navigation").first();
  await expect(nav.getByRole("link", { name: /Content/ })).toBeVisible();
  await expect(nav.getByRole("link", { name: /Money/ })).toHaveCount(0);
});

test("the sidebar badge is whole and a sidebar click doesn't reload the page", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "the back office is desktop only");
  await signInOperator(page, "Content editor");
  await page.goto("/admin");
  // The badge sits under the logo inside the 240 px rail (it was cut in half beside the logo).
  const rail = page.locator("aside").first();
  const badge = rail.getByText("Admin workspace", { exact: true });
  await expect(badge).toBeVisible();
  const [box, railBox] = await Promise.all([badge.boundingBox(), rail.boundingBox()]);
  expect(box && railBox && box.x + box.width <= railBox.x + railBox.width).toBe(true);
  // A marker on the window survives only if the click swaps the page without loading a new document.
  await page.evaluate(() => {
    (window as unknown as { kept?: boolean }).kept = true;
  });
  await rail.getByRole("link", { name: /Content/ }).click();
  await expect(page).toHaveURL(/\/admin\/content/);
  await expect(page.getByRole("heading", { level: 1, name: "Content" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { kept?: boolean }).kept)).toBe(true);
});
