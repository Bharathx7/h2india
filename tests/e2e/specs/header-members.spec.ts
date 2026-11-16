import { expect, test } from "../fixtures";
import { enterCode, newEmail, ownIp, requestCode } from "../helpers/sign-in";

// Public QC, 16 Nov 2026: the header's rows come back on any scroll up (no click needed); the top strip reads For
// Buyers, For Members, For Suppliers; For Members leads to Join with Member picked, and members have their own
// sign-in page, separate from /sign-in.

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("the header rows hide while scrolling down and come back on a scroll up", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-1440", "The top strip and section nav are desktop only");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  const strip = page.getByRole("link", { name: "For Members" }).first();
  await expect(nav).toBeVisible();
  await expect(strip).toBeVisible();
  // Move the pointer off the header, so nothing in it is hovered or focused.
  await page.mouse.move(700, 600);
  await page.mouse.wheel(0, 1200);
  await expect(nav).toBeHidden();
  await page.mouse.wheel(0, -200);
  await expect(nav).toBeVisible();
  await expect(strip).toBeVisible();
});

test("the top strip reads For Buyers, For Members, For Suppliers", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-1440", "The top strip is desktop; the phone menu uses the same list");
  await page.goto("/news");
  const labels = await page
    .locator("header")
    .getByRole("link", { name: /^For (Buyers|Members|Suppliers)$/ })
    .allInnerTexts();
  expect(labels.slice(0, 3)).toEqual(["For Buyers", "For Members", "For Suppliers"]);
});

test("For Members explains membership and leads to Join with Member picked", async ({ page }) => {
  await page.goto("/for-members");
  await expect(page.getByRole("heading", { level: 1, name: "Join H2 India as a member" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What members can do" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Open the directory" })).toBeVisible();
  await page.getByRole("link", { name: "Join as a member" }).first().click();
  await expect(page).toHaveURL(/\/join\?as=member$/);
  await expect(page.getByRole("radio", { name: /Individual member/ })).toBeChecked();
});

test("members sign in on their own page and a new person joins with Member picked", async ({ page }) => {
  await page.goto("/for-members");
  await page.getByRole("link", { name: "Member sign in" }).first().click();
  await expect(page).toHaveURL(/\/member\/sign-in$/);
  await expect(page.getByRole("heading", { level: 1, name: "Member sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Join as a member" })).toHaveAttribute("href", "/join?as=member");
  await expect(page.getByRole("link", { name: "Sign in here" })).toHaveAttribute("href", "/sign-in");

  await enterCode(page, await requestCode(page, newEmail("member-door")));
  const notNow = page.getByRole("button", { name: "Not now" });
  await expect(notNow.or(page.getByRole("heading", { name: "Join H2 India" }))).toBeVisible();
  if (await notNow.isVisible()) await notNow.click();
  await expect(page).toHaveURL(/\/join\?as=member$/);
  await expect(page.getByRole("radio", { name: /Individual member/ })).toBeChecked();
});

test("the main sign-in page is for buyers and suppliers and links to the member page", async ({ page }) => {
  await page.goto("/sign-in?next=/marketplace");
  await expect(page.getByRole("heading", { level: 1, name: "Sign in to H2 India" })).toBeVisible();
  await expect(page.getByText("For buyers and suppliers.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Member sign in" })).toHaveAttribute(
    "href",
    "/member/sign-in?next=%2Fmarketplace",
  );
});
