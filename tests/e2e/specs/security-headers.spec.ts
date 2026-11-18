import { expect, test, type Page } from "../fixtures";
import { signInOperator } from "../helpers/cms";

// Step 12.1: every page carries the security headers, and the content security policy blocks nothing the pages
// themselves need (scripts, styles, fonts, pictures, the advanced editor). A violation is a bug either way: a page
// loading something it shouldn't, or a policy too tight for the product.

const PAGES = [
  "/",
  "/news",
  "/marketplace",
  "/schemes",
  "/opportunities/tenders",
  "/events",
  "/knowledge",
  "/tracker",
  "/search?q=electrolyser",
  "/sign-in",
  "/join",
  "/rfq/new",
];

async function watchViolations(page: Page) {
  const seen: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy/i.test(m.text())) seen.push(m.text());
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      console.error(`Content Security Policy violation: ${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  return seen;
}

test("public pages carry the security headers and break no policy", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-1440", "Headers don't depend on the width");
  test.setTimeout(120_000);
  const seen = await watchViolations(page);
  for (const path of PAGES) {
    const res = await page.goto(path);
    const h = res?.headers() ?? {};
    expect(h["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"], path).toBe("nosniff");
    expect(h["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"], path).toContain("camera=()");
    await page.waitForLoadState("networkidle");
  }
  expect(seen).toEqual([]);
});

test("API answers carry the headers too", async ({ request }, info) => {
  test.skip(info.project.name !== "desktop-1440", "Headers don't depend on the width");
  const res = await request.get("/api/v1/search/suggest?q=valve");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["content-security-policy"]).toContain("object-src 'none'");
});

test("the advanced editor works under its policy", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-1440", "The back office is desktop only");
  test.setTimeout(120_000);
  const seen = await watchViolations(page);
  await signInOperator(page, "Content editor");
  await page.goto("/cms");
  await expect(page.getByRole("link", { name: /Articles/ }).first()).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  expect(seen).toEqual([]);
});
