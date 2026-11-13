import { expect, test } from "@playwright/test";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp } from "../helpers/sign-in";

// Step 7.1 DONE WHEN: a new member completes onboarding and their choices appear on the home; skipping leaves a usable
// home; the phone flow matches 539:768 (the same steps at 390).
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("a new member picks a persona, topics and states, and lands on the home", async ({ page }) => {
  await signInNew(page, newEmail("onboard"));
  await page.goto("/member");
  await expect(page).toHaveURL(/\/member\/welcome$/);
  await page.getByRole("radio", { name: /Researcher/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "What do you want to follow?" })).toBeVisible();
  await page.getByRole("button", { name: "Electrolysers" }).click();
  await page.getByRole("button", { name: "Gujarat" }).click();
  await expect(page.getByText("1 topic and 1 state selected")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Suggested for you" })).toBeVisible();
  await expect(page.getByText("Research calls and grants")).toBeVisible();
  await page.getByRole("button", { name: "Go to my feed" }).click();
  await expect(page).toHaveURL(/\/member$/);
  await expect(page.getByText(/Electrolysers/).first()).toBeVisible();
  // Not offered again.
  await page.goto("/member/welcome");
  await expect(page).toHaveURL(/\/member$/);
});

test("skipping leaves a usable, empty home", async ({ page }) => {
  await signInNew(page, newEmail("skip"));
  await page.goto("/member/welcome");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page).toHaveURL(/\/member$/);
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
});
