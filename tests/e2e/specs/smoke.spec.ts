import { expect, test } from "../fixtures";

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

// /sign-in is the real page since step 3.2. The workspaces (built in Stages 7 to 11) ask a signed-out visitor to sign
// in and bring them back afterwards.
test("route group /sign-in loads its page", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in to H2 India");
});
for (const path of ["/buyer", "/supplier", "/member", "/admin"] as const) {
  test(`route group ${path} asks a signed-out visitor to sign in`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/sign-in\\?next=(%2F|/)${path.slice(1)}`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in to H2 India");
  });
}
