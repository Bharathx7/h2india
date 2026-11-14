import { expect, test } from "@playwright/test";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp } from "../helpers/sign-in";

// Step 7.2 DONE WHEN: the feed shows items from what the member follows, saving from a link lands in Saved items and
// can be removed, unfollowing doesn't remove saved items, and a follow's level can be changed.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function skipOnboarding(page: import("@playwright/test").Page) {
  await page.goto("/member/welcome");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page).toHaveURL(/\/member$/);
}

test("an empty feed points to follows, and topics can be followed and set to digest", async ({ page }) => {
  await signInNew(page, newEmail("feed"));
  await skipOnboarding(page);
  await expect(page.getByText("Your feed is empty")).toBeVisible();
  await page.getByRole("link", { name: "Follow topics and companies" }).click();
  await page.getByRole("link", { name: /^Topics/ }).click();
  await page.getByRole("button", { name: "Follow Electrolysers" }).click();
  await expect(page.getByRole("combobox", { name: "Notifications for Electrolysers" })).toBeVisible();
  await page.getByRole("combobox", { name: "Notifications for Electrolysers" }).selectOption("digest");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Notifications for Electrolysers" })).toHaveValue("digest");
  await page.goto("/member");
  await expect(page.getByText("Updates from 1 topic, 0 states and 0 organisations you follow.")).toBeVisible();
});

test("a save link that points at nothing says so and saves nothing", async ({ page }) => {
  await signInNew(page, newEmail("saved"));
  await skipOnboarding(page);
  await page.goto("/member/saved?tender=no-such-tender");
  await expect(page.getByText("That item isn't available any more.")).toBeVisible();
  await expect(page).toHaveURL(/\/member\/saved$/);
  await expect(page.getByText("No saved articles yet")).toBeVisible();
});

test("saved items and follows work on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInNew(page, newEmail("saved-phone"));
  await skipOnboarding(page);
  await page.goto("/member/saved?state=loading");
  await expect(page.getByRole("heading", { name: "Saved items" })).toBeVisible();
  await page.goto("/member/follows?tab=state");
  await expect(page.getByRole("heading", { name: "Manage follows" })).toBeVisible();
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scroll).toBeLessThanOrEqual(390);
});
