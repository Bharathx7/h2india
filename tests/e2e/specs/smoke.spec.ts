import { expect, test } from "@playwright/test";

test("home placeholder loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Public website");
});

test("health endpoint answers", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ status: "ok" });
});

// /sign-in is the real page since step 3.2; the workspaces are still placeholders.
for (const [path, title] of [
  ["/sign-in", "Sign in to H2 India"],
  ["/buyer", "Buyer workspace"],
  ["/supplier", "Supplier workspace"],
  ["/member", "Member workspace"],
  ["/admin", "Admin back office"],
] as const) {
  test(`route group ${path} loads its page`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  });
}
