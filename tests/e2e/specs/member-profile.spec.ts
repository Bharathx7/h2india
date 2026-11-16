import { expect, test } from "../fixtures";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp } from "../helpers/sign-in";

// Step 7.4: a member fills in their profile and turns on Public profile; only then do signed-in visitors find them in
// the people directory. Preferences save, and Download my data returns their own records.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("profile, public listing and preferences", async ({ page }) => {
  const name = `Rohan ${String(Date.now())}`;
  await signInNew(page, newEmail("profile"));
  await page.goto("/member/welcome");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.goto("/member/profile");
  await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
  await page.getByRole("radio", { name: "Researcher" }).click();
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Headline").fill("Research scientist, electrolyser materials");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Enter your affiliation")).toBeVisible();
  await page.getByLabel("Affiliation").fill("Indus Institute of Energy Research");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();

  // Private: not in the directory.
  await page.goto(`/directory/people?q=${encodeURIComponent(name)}`);
  await expect(page.getByText(name)).toHaveCount(0);

  await page.goto("/member/profile");
  await page.getByRole("switch", { name: "Public profile" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();
  await page.goto(`/directory/people?q=${encodeURIComponent(name)}`);
  await expect(page.getByText(name).first()).toBeVisible();

  await page.goto("/member/preferences");
  await expect(page.getByRole("heading", { name: "Newsletters and notifications" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Updates from what you follow by Email" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();

  const res = await page.request.get("/api/member/export");
  expect(res.status()).toBe(200);
  const data = (await res.json()) as { account: { name: string } };
  expect(data.account.name).toBe(name);
});
