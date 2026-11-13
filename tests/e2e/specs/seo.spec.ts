import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ownIp } from "../helpers/sign-in";

// Step 5.10 DONE WHEN: robots.txt and the split sitemaps answer; every 301 redirect lands on a real page; unknown
// addresses get the designed 404 with a 404 status; pages carry canonical links, share images and structured data;
// the maintenance page exists (the proxy shows it with a 503 while FLAG_MAINTENANCE is on).

const redirects = JSON.parse(
  readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../apps/web/src/seo/redirects.json"),
    "utf8",
  ),
) as { from: string; to: string }[];

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("robots.txt and the sitemaps", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  // Indexing stays off until Launch 1 (searchIndexing flag).
  expect(robots).toMatch(/User-Agent: \*/i);
  const index = await (await request.get("/sitemap.xml")).text();
  for (const type of [
    "pages",
    "news",
    "knowledge",
    "opportunities",
    "events",
    "tracker",
    "help",
    "newsletter",
    "google-news",
  ]) {
    expect(index).toContain(`/sitemaps/${type}.xml`);
    const res = await request.get(`/sitemaps/${type}.xml`);
    expect(res.status(), type).toBe(200);
    expect(res.headers()["content-type"]).toContain("xml");
  }
  expect(await (await request.get("/sitemaps/pages.xml")).text()).toContain("/legal/grievance-officer</loc>");
  expect((await request.get("/sitemaps/unknown.xml")).status()).toBe(404);
});

test("every redirect is a 301 to a page that exists", async ({ request }) => {
  test.setTimeout(240_000);
  for (const r of redirects) {
    const res = await request.get(r.from, { maxRedirects: 0 });
    expect(res.status(), r.from).toBe(301);
    expect(new URL(res.headers().location ?? "", "http://x").pathname, r.from).toBe(r.to);
    // A pattern row (/brands/:slug, A147) has no single page to open; its 301 and target pattern are checked above.
    if (!r.to.includes(":")) expect((await request.get(r.to)).status(), r.to).toBe(200);
  }
});

test("unknown addresses get the designed 404", async ({ page }) => {
  const res = await page.goto("/no-such-page-anywhere");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "We couldn’t find that page" })).toBeVisible();
  await expect(page.getByText("Error 404")).toBeVisible();
  await expect(page.getByRole("link", { name: "Request a quote" }).last()).toBeVisible();
  // A missing record inside the site gets the same page.
  const missing = await page.goto("/help/no-such-article");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "We couldn’t find that page" })).toBeVisible();
});

test("canonical, share image and structured data", async ({ page, request }) => {
  await page.goto("/");
  const types = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((els) => els.map((e) => (JSON.parse(e.textContent) as { "@type"?: string })["@type"]));
  expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite"]));

  await page.goto("/about/mission");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/about\/mission$/);
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect((await request.get(og ?? "")).headers()["content-type"]).toBe("image/png");
  const crumbs = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((els) =>
      els.map((e) => JSON.parse(e.textContent) as { "@type"?: string; itemListElement?: unknown[] }),
    );
  expect(crumbs.find((c) => c["@type"] === "BreadcrumbList")?.itemListElement).toHaveLength(3);

  await page.goto("/events");
  const first = page
    .locator('main a[href^="/events/"]')
    .filter({ hasNotText: /Submit|Calendar|Webinars|Training|Past/ })
    .first();
  const href = await first.getAttribute("href");
  if (href && !/\/events\/(submit|webinars|training|past)/.test(href)) {
    await page.goto(href);
    const ev = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((els) => els.map((e) => (JSON.parse(e.textContent) as { "@type"?: string })["@type"]));
    expect(ev).toContain("Event");
  }
});

test("the maintenance page", async ({ page }) => {
  await page.goto("/maintenance");
  await expect(page.getByRole("heading", { name: "We're upgrading H2 India" })).toBeVisible();
  await expect(page.getByText("Planned maintenance")).toBeVisible();
});
