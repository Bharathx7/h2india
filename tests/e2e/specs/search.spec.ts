import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "../fixtures";
import { cms, newAuthor, paragraph, signInOperator } from "../helpers/cms";
import { ownIp, withDb } from "../helpers/sign-in";

// Step 5.2 DONE WHEN, end to end with the worker running: a search with a typo finds the right results across types;
// unpublishing an article removes it from search within one minute; zero-result searches appear in the log. Also the
// header overlay (372:16695, 372:16870, 372:16991) by keyboard at 1440 and by touch at 390, and the /search page.

test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

interface Answer {
  groups: { label: string; items: { title: string; href: string }[] }[];
  total: number;
}

async function suggestTitles(request: APIRequestContext, q: string, scope = "all"): Promise<string[]> {
  const res = await request.get(`/api/v1/search/suggest?${new URLSearchParams({ q, scope }).toString()}`);
  expect(res.status()).toBe(200);
  const body = (await res.json()) as Answer;
  return body.groups.flatMap((g) => g.items.map((i) => i.title));
}

/** A word no other test or seed uses, so results are this test's own. */
const word = () =>
  `zq${Date.now()
    .toString(36)
    .replace(/[0-9]/g, (d) => "abcdefghij"[Number(d)] ?? "")}`;

async function openOverlay(page: Page) {
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  if (mobile) await page.getByRole("banner").getByRole("button", { name: "Search", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Search H2 India" });
  // The "/" shortcut works once the page has hydrated; press again until it has.
  if (!mobile) {
    await expect(async () => {
      if (!(await dialog.isVisible())) await page.keyboard.press("/");
      await expect(dialog).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15_000 });
  }
  await expect(dialog).toBeVisible();
  return dialog;
}

test("a published record is found with a typo; the overlay opens it by keyboard or touch", async ({ page }) => {
  test.setTimeout(90_000);
  await signInOperator(page, "Content editor");
  const tag = word();
  const title = `Hydrogen compressor skid ${tag}`;
  const tender = await cms(page.request, "POST", "tenders", {
    _status: "published",
    title,
    issuer: "Northern Refineries Limited, Panipat",
    tenderId: `NRL/${tag}`,
    bidDueAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    description: "Supply of a diaphragm compressor skid.",
    sourceUrl: "https://eprocure.gov.in",
  });
  expect(tender.status, JSON.stringify(tender.body.errors)).toBe(201);

  // The save queued an index change; the worker applies it within seconds (and the minute sweep catches the rest).
  await expect.poll(() => suggestTitles(page.request, `compresor skid ${tag}`), { timeout: 70_000 }).toContain(title);

  await page.goto("/");
  const dialog = await openOverlay(page);
  await page.keyboard.type(`compresor skid ${tag}`);
  const option = dialog.getByRole("option", { name: new RegExp(title) });
  await expect(option).toBeVisible();
  await expect(dialog.getByRole("group", { name: "Tenders" })).toContainText(title);
  await page.keyboard.press("ArrowDown");
  await expect(option).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/opportunities\/tenders\//);
});

test("unpublishing an article removes it from search within one minute", async ({ page }) => {
  test.setTimeout(180_000);
  await signInOperator(page, "Editor-in-chief");
  const tag = word();
  const author = await newAuthor(page.request, "Meera Iyer");
  const created = await cms(page.request, "POST", "articles?draft=true", {
    type: "analysis",
    title: `Electrolyser tranche explained ${tag}`,
    dek: "What the tranche means for buyers.",
    body: paragraph("Body."),
    authors: [author],
    sources: [{ title: "SECI notice", url: "https://seci.co.in" }],
  });
  const id = created.body.doc?.id;
  const flow = (action: string) => cms(page.request, "POST", `articles/${String(id)}/workflow`, { action });
  expect((await flow("submit")).status).toBe(200);

  // A draft is never searchable.
  expect(await suggestTitles(page.request, `electrolyzer ${tag}`, "news")).toEqual([]);

  expect((await flow("publish")).status).toBe(200);
  await expect
    .poll(() => suggestTitles(page.request, `electrolyzer ${tag}`, "news"), { timeout: 70_000 })
    .toContain(`Electrolyser tranche explained ${tag}`);

  expect((await flow("unpublish")).status).toBe(200);
  const unpublishedAt = Date.now();
  await expect.poll(() => suggestTitles(page.request, `electrolyzer ${tag}`, "news"), { timeout: 60_000 }).toEqual([]);
  expect(Date.now() - unpublishedAt).toBeLessThan(60_000);
});

test("a search with no results shows its designed state and is logged without who searched", async ({ page }) => {
  const tag = word();
  await page.goto("/");
  const dialog = await openOverlay(page);
  await page.keyboard.type(`${tag} flare stak`);
  await expect(dialog.getByText(`No matches for “${tag} flare stak”`)).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Request a quote" })).toHaveAttribute(
    "href",
    `/rfq/new?q=${encodeURIComponent(`${tag} flare stak`).replace(/%20/g, "+")}`,
  );
  // Half-typed words are not logged; Enter runs the search, which is.
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/search\?/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Results for “${tag} flare stak”`);
  await expect(page.getByText(`No products match “${tag} flare stak”`)).toBeVisible();

  const logged = await withDb(async (db) => {
    const r = await db.query<{ query: string; scope: string; source: string }>(
      "SELECT query, scope, source FROM core.search_misses WHERE query LIKE $1",
      [`${tag}%`],
    );
    return r.rows;
  });
  expect(logged).toEqual([{ query: `${tag} flare stak`, scope: "all", source: "header" }]);
});

test("the search page lists suppliers and passes axe", async ({ page }) => {
  await page.goto("/search?q=hydrogen&tab=suppliers");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Results for “hydrogen”");
  await expect(page.getByRole("link", { name: /^Suppliers · \d+$/ })).toHaveAttribute("aria-current", "page");
  const results = await new AxeBuilder({ page }).include("main").analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);

  // The designed loading and error states (127:6835, 127:6870), forced in development and on the dev-pages build.
  await page.goto("/search?q=hydrogen&state=error");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("We couldn’t load search results");
  await expect(page.getByRole("link", { name: "Try again" })).toBeVisible();
});
