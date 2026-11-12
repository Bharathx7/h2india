import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("India’s hydrogen ecosystem, in one place");
});

test("health endpoint answers", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ status: "ok" });
});

test("every response carries a request ID for the audit log, and a safe incoming ID is kept", async ({ request }) => {
  const fresh = await request.get("/api/health");
  expect(fresh.headers()["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  const kept = await request.get("/api/health", { headers: { "x-request-id": "lb-abc12345" } });
  expect(kept.headers()["x-request-id"]).toBe("lb-abc12345");
  const unsafe = await request.get("/api/health", { headers: { "x-request-id": "<script>" } });
  expect(unsafe.headers()["x-request-id"]).not.toBe("<script>");
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
