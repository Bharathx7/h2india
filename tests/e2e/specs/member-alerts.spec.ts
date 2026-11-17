import { expect, test } from "../fixtures";
import { signInMember } from "../helpers/join";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Step 7.3: a member creates, pauses and deletes an alert; a "Create alert" link opens the modal filled in; a turn-off
// link with a bad token says so; buyers watch a category. Matching and sending are proved in alerts.int.test.ts.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

async function member(page: import("@playwright/test").Page, name: string) {
  const email = newEmail(name);
  await signInMember(page, email);
  await page.goto("/member/welcome");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page).toHaveURL(/\/member$/);
  return email;
}

/** Buyer pages need a buyer company (step 9.1): this person becomes the Admin of a new one. */
async function makeBuyer(email: string) {
  await withDb(async (db) => {
    const org = (
      await db.query<{ id: string }>(
        `INSERT INTO core.organisations (id, kind, legal_name, state) VALUES (gen_random_uuid(), 'buyer', $1, 'Gujarat') RETURNING id`,
        [`Alerts buyer ${String(Date.now())}`],
      )
    ).rows[0]?.id;
    await db.query(
      `INSERT INTO core.memberships (id, organisation_id, user_id, role) SELECT gen_random_uuid(), $1, id, 'Admin' FROM core.users WHERE email = $2`,
      [org, email],
    );
  });
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
  await makeBuyer(await member(page, "watch"));
  await page.goto("/buyer/alerts");
  await expect(page.getByText("No categories watched yet")).toBeVisible();
  await page.getByRole("button", { name: "Watch a category" }).first().click();
  await expect(page.getByRole("dialog", { name: "Watch a category" })).toBeVisible();
});
