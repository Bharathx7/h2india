import { expect, test } from "@playwright/test";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp } from "../helpers/sign-in";

// Step 7.3: a member creates, pauses and deletes an alert; a "Create alert" link opens the modal filled in; a turn-off
// link with a bad token says so; buyers watch a category. Matching and sending are proved in alerts.int.test.ts.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function member(page: import("@playwright/test").Page, name: string) {
  await signInNew(page, newEmail(name));
  await page.goto("/member/welcome");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page).toHaveURL(/\/member$/);
}

test("create, pause and delete an alert", async ({ page }) => {
  await member(page, "alerts");
  await page.goto("/member/alerts");
  await expect(page.getByText("No alerts yet")).toBeVisible();
  await page.getByRole("button", { name: "Create alert" }).click();
  const dialog = page.getByRole("dialog", { name: "Create alert" });
  await dialog.getByRole("radio", { name: "Tenders" }).click();
  await dialog.getByRole("button", { name: "Continue" }).click();
  await dialog.getByLabel("Words to match").fill("electrolyser");
  await dialog.getByRole("button", { name: "Gujarat" }).click();
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expect(dialog.getByText("Alert for")).toBeVisible();
  await dialog.getByRole("radio", { name: "Daily digest" }).click();
  await dialog.getByRole("button", { name: "Save alert" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "Tenders · Electrolyser" })).toBeVisible();
  await expect(page.getByText("Daily · email")).toBeVisible();
  await page.getByRole("switch", { name: "Pause Tenders · Electrolyser" }).click();
  await expect(page.getByText(/Paused by you on/)).toBeVisible();
  await page.getByRole("button", { name: "Delete Tenders · Electrolyser" }).click();
  await page.getByRole("button", { name: "Delete alert" }).click();
  await expect(page.getByText("No alerts yet")).toBeVisible();
});

test("a Create alert link opens the modal for that type", async ({ page }) => {
  await member(page, "alert-link");
  await page.goto("/member/alerts?type=grants");
  const dialog = page.getByRole("dialog", { name: "Create alert" });
  await expect(dialog.getByLabel("Words to match")).toBeVisible();
});

test("a turn-off link that doesn't check out says so", async ({ page }) => {
  await page.goto("/alerts/off?token=nope.nope");
  await expect(page.getByText("This link doesn't work")).toBeVisible();
});

test("buyer alerts start empty and offer Watch a category", async ({ page }) => {
  await member(page, "watch");
  await page.goto("/buyer/alerts");
  await expect(page.getByText("No categories watched yet")).toBeVisible();
  await page.getByRole("button", { name: "Watch a category" }).first().click();
  await expect(page.getByRole("dialog", { name: "Watch a category" })).toBeVisible();
});
