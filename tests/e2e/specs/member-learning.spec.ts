import { expect, test } from "../fixtures";
import { signInMember } from "../helpers/join";
import { newEmail, ownIp } from "../helpers/sign-in";

// Step 7.5 DONE WHEN: reading to the end of a chapter updates progress on both pages; the three member pages show
// their designed empty, loading and error states.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function member(page: import("@playwright/test").Page, name: string) {
  await signInMember(page, newEmail(name));
  await page.goto("/member/welcome");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page).toHaveURL(/\/member$/);
}

test("finishing a chapter shows on the chapter page and on Hydrogen 101", async ({ page }) => {
  await member(page, "learn");
  await page.goto("/knowledge/hydrogen-101");
  const first = page.locator("main a[href^='/knowledge/hydrogen-101/']").first();
  test.skip((await first.count()) === 0, "no chapters published");
  await first.click();
  // Reaching the end marks it done; a short chapter is at its end at once, so the button may already be gone.
  const mark = page.getByRole("button", { name: "Mark chapter as done" });
  await expect(mark.or(page.getByText("Chapter done"))).toBeVisible();
  if (await mark.isVisible()) await mark.click();
  await expect(page.getByText("Chapter done")).toBeVisible();
  await page.reload();
  await expect(page.getByText(/1 of \d+ chapters done/)).toBeVisible();
  await page.goto("/member/hydrogen-101");
  await expect(page.getByRole("heading", { name: /1 of \d+ chapters done/ })).toBeVisible();
  await expect(page.getByText("Done").first()).toBeVisible();
});

test("empty, loading and error states", async ({ page }) => {
  await member(page, "states");
  await page.goto("/member/events");
  await expect(page.getByText("No registrations yet")).toBeVisible();
  await page.goto("/member/applications");
  await expect(page.getByText("You haven't applied for any jobs yet")).toBeVisible();
  await page.goto("/member/events?state=error");
  await expect(page.getByText("We couldn't load your registrations")).toBeVisible();
  await page.goto("/member/hydrogen-101?state=loading");
  await expect(page.getByRole("heading", { name: "Hydrogen 101" })).toBeVisible();
});
