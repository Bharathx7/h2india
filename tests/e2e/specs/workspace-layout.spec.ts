import { expect, test } from "../fixtures";
import { signInOperator } from "../helpers/cms";
import { signInMember } from "../helpers/join";
import { newEmail, ownIp } from "../helpers/sign-in";

// Founder (20 Nov 2026): a sidebar click reloaded the whole page. The frame (sidebar, top bar) now lives in each
// workspace's layout: the same sidebar stays on screen while only the page part changes, and the lit item follows.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("the back office sidebar stays while pages change", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "the back office is desktop only");
  await signInOperator(page, "Super admin");
  await page.goto("/admin");
  const rail = page.locator("aside").first();
  await expect(rail).toBeVisible();
  // A mark on the sidebar element survives only if the sidebar isn't drawn again.
  await rail.evaluate((el) => {
    el.setAttribute("data-kept", "yes");
  });
  await rail.getByRole("link", { name: /Content/ }).click();
  await expect(page).toHaveURL(/\/admin\/content/);
  await expect(page.getByRole("heading", { level: 1, name: "Content" })).toBeVisible();
  await rail.getByRole("link", { name: /Catalogue/ }).click();
  await expect(page).toHaveURL(/\/admin\/catalogue/);
  await expect(page.locator('aside[data-kept="yes"]')).toHaveCount(1);
  await expect(rail.getByRole("link", { name: /Catalogue/ })).toHaveAttribute("aria-current", "page");
});

test("the member sidebar stays while pages change", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "the sidebar is a drawer on phones");
  await signInMember(page, newEmail("layout-member"));
  await page.goto("/member/saved");
  const rail = page.locator("aside").first();
  await rail.evaluate((el) => {
    el.setAttribute("data-kept", "yes");
  });
  await rail.getByRole("link", { name: /Alerts/ }).click();
  await expect(page).toHaveURL(/\/member\/alerts/);
  await expect(page.locator('aside[data-kept="yes"]')).toHaveCount(1);
});
