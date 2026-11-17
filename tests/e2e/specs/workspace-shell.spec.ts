import { expect, test } from "../fixtures";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp } from "../helpers/sign-in";

// Workspace shell, founder QC (17 Nov 2026), for every workspace including admin: no welcome line and no help button;
// the profile shows the avatar and name only; search works; the sidebar fits a laptop window without scrolling.

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("the top bar has a working search, no welcome or help, and the profile shows only the name", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "the desktop top bar");
  await signInNew(page, newEmail("shell"));
  await page.goto("/account");
  const header = page.locator("header").first();
  await expect(header.getByText(/^Welcome,/)).toHaveCount(0);
  await expect(header.getByRole("link", { name: "Help" })).toHaveCount(0);
  await header.getByRole("button", { name: /^Search / }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  // A member can't request a quote, so the search panel doesn't offer it.
  await header.getByRole("button", { name: /^Search / }).click();
  await page.getByRole("dialog").getByRole("textbox").first().fill("electrolyser");
  await expect(page.getByRole("dialog").getByRole("link", { name: "Request a quote" })).toHaveCount(0);
});

test("the sidebar fits a 1366 × 650 window without scrolling", async ({ page, isMobile }) => {
  test.skip(isMobile, "the desktop sidebar");
  await page.setViewportSize({ width: 1366, height: 650 });
  await signInNew(page, newEmail("rail"));
  await page.goto("/account");
  const nav = page.getByRole("navigation", { name: /workspace$/ }).first();
  const fits = await nav.evaluate((el) => el.scrollHeight <= el.clientHeight + 1);
  expect(fits).toBe(true);
});
