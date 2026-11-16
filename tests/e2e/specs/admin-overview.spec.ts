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
  await expect(page.getByRole("heading", { name: "Publishing calendar" })).toBeVisible();
  const nav = page.getByRole("navigation").first();
  await expect(nav.getByRole("link", { name: /Content/ })).toBeVisible();
  await expect(nav.getByRole("link", { name: /Money/ })).toHaveCount(0);
});
