import { expect, test } from "../fixtures";
import { signInMember } from "../helpers/join";
import { newEmail, ownIp } from "../helpers/sign-in";

// Founder (20 Nov 2026): one profile picture for everyone, set on Account and shown on the person's avatar.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("Account offers a profile picture", async ({ page }) => {
  await signInMember(page, newEmail("photo"));
  await page.goto("/account");
  await expect(page.getByRole("button", { name: "Upload picture" })).toBeVisible();
  await expect(page.getByText("JPG or PNG, square, up to 2 MB.")).toBeVisible();
});

test("an uploaded picture shows on the avatar", async ({ page }) => {
  test.skip(!process.env.E2E_STORAGE, "needs object storage and the virus scanner (E2E_STORAGE=1)");
  await signInMember(page, newEmail("photo-upload"));
  await page.goto("/account");
  // A 1×1 PNG.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  await page
    .getByLabel("Upload a profile picture")
    .setInputFiles({ name: "me.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText("Picture saved.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("img", { name: "Your profile picture" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
});
