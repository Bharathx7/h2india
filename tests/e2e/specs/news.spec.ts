import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "../fixtures";
import { cms, newAuthor, paragraph, signInOperator } from "../helpers/cms";
import { ownIp } from "../helpers/sign-in";

// Step 5.3 DONE WHEN: publishing an article in the CMS shows it on the site within a minute without a deploy; sponsored
// and press-release labels appear on cards and article pages; structured data validates for an article. Also the live
// explainer updating without a page reload, the rule that an article can't take a section's address, and axe on the
// newsroom pages at 1440 and 390. Every test makes its own content, so it runs with sample content hidden (CI).

test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

const tag = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function newSection(request: APIRequestContext, name: string) {
  const res = await cms(request, "POST", "topics", { name, order: 90 });
  expect(res.status, JSON.stringify(res.body.errors)).toBe(201);
  return res.body.doc as { id: number; slug?: string };
}

interface Draft {
  title: string;
  type?: string;
  topics?: number[];
  extra?: Record<string, unknown>;
}

/** Writes an article and takes it through the workflow to Published, as the Editor-in-chief. */
async function publish(page: Page, d: Draft) {
  const author = await newAuthor(page.request, "Meera Iyer");
  const created = await cms(page.request, "POST", "articles?draft=true", {
    type: d.type ?? "news",
    title: d.title,
    dek: `Standfirst for ${d.title}.`,
    body: paragraph("Body of the story."),
    authors: [author],
    topics: d.topics ?? [],
    sources: [{ title: "Official notice", url: "https://seci.co.in" }],
    ...d.extra,
  });
  expect(created.status, JSON.stringify(created.body.errors)).toBe(201);
  const id = created.body.doc?.id;
  const flow = (action: string) => cms(page.request, "POST", `articles/${String(id)}/workflow`, { action });
  expect((await flow("submit")).status).toBe(200);
  if (d.type === "sponsored" || d.type === "press_release") {
    expect((await flow("send-to-legal")).status).toBe(200);
    expect((await flow("pass-legal")).status).toBe(200);
  }
  const published = await flow("publish");
  expect(published.status, JSON.stringify(published.body.errors)).toBe(200);
  const slug = (published.body.doc as { slug?: string } | undefined)?.slug ?? "";
  return { id, slug, flow };
}

test("a published article is on the site within a minute, with valid structured data; unpublished, it's gone", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signInOperator(page, "Editor-in-chief");
  const title = `Hydrogen valley shortlist ${tag()}`;
  const { slug, flow } = await publish(page, { title });

  // No deploy: the CMS refreshes the newsroom's cache when it publishes.
  await expect
    .poll(async () => (await page.request.get("/news/latest")).text(), { timeout: 60_000, intervals: [2000] })
    .toContain(title);

  await page.goto(`/news/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  const json = await page.locator('script[type="application/ld+json"]').first().textContent();
  const data = JSON.parse(json ?? "{}") as Record<string, unknown>;
  expect(data).toMatchObject({ "@context": "https://schema.org", "@type": "NewsArticle", headline: title });
  expect(Number.isNaN(Date.parse(String(data.datePublished)))).toBe(false);
  expect(data.author).toEqual([expect.objectContaining({ "@type": "Person", name: "Meera Iyer" })]);

  expect((await flow("unpublish")).status).toBe(200);
  await expect
    .poll(async () => (await page.request.get(`/news/${slug}`)).status(), { timeout: 60_000, intervals: [2000] })
    .toBe(404);
});

test("sponsored and press-release labels show on cards and article pages", async ({ page }) => {
  test.setTimeout(180_000);
  await signInOperator(page, "Editor-in-chief");
  const t = tag();
  const section = await newSection(page.request, `Section ${t}`);
  const sponsored = await publish(page, {
    title: `Buffer tanks for bus depots ${t}`,
    type: "sponsored",
    topics: [section.id],
    extra: { sponsor: { name: "Sahyadri Gas Controls", about: "Valves and regulators for hydrogen." } },
  });
  const release = await publish(page, {
    title: `Narmada wins compressor package ${t}`,
    type: "press_release",
    topics: [section.id],
    extra: { issuer: "Narmada Compression Works" },
  });

  await page.goto(`/news/section-${t}`);
  const sponsoredCard = page.getByRole("article").filter({ hasText: `Buffer tanks for bus depots ${t}` });
  await expect(sponsoredCard).toContainText("Sponsored");

  await page.goto("/news/press-releases");
  const releaseCard = page.getByRole("article").filter({ hasText: `Narmada wins compressor package ${t}` });
  await expect(releaseCard).toContainText("Press release");

  await page.goto(`/news/${sponsored.slug}`);
  await expect(page.getByRole("main")).toContainText(
    "Paid for by Sahyadri Gas Controls and produced by the H2 India Partner Studio, not the newsroom.",
  );
  await expect(page.getByLabel("About the sponsor")).toContainText("Sponsored");

  await page.goto(`/news/${release.slug}`);
  await expect(page.getByRole("main")).toContainText(
    "Supplied by Narmada Compression Works and published as received. H2 India has not edited or verified its claims.",
  );
});

test("an article can't take a section's address", async ({ page }) => {
  await signInOperator(page, "Content editor");
  const t = tag();
  await newSection(page.request, `Clash ${t}`);
  const author = await newAuthor(page.request);
  const res = await cms(page.request, "POST", "articles?draft=true", {
    type: "news",
    title: "Any title",
    slug: `clash-${t}`,
    dek: "Standfirst.",
    body: paragraph("Body."),
    authors: [author],
  });
  expect(res.status).toBe(400);
  expect(JSON.stringify(res.body.errors)).toContain("is the address of a news section");
});

test("a live explainer updates without a page reload", async ({ page }) => {
  test.setTimeout(180_000);
  await signInOperator(page, "Editor-in-chief");
  const t = tag();
  const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
  const { id, slug, flow } = await publish(page, {
    title: `Live: auction results ${t}`,
    extra: {
      live: {
        status: "live",
        summary: [{ point: "Three of seven lots awarded." }],
        updates: [{ at: at(30), title: "Auction opens", text: "Seven regional lots." }],
      },
    },
  });
  await page.goto(`/news/${slug}`);
  await expect(page.getByRole("main")).toContainText("Live");
  await expect(page.getByRole("main")).toContainText("Auction opens");
  await page.evaluate(() => {
    (window as unknown as { stayed: boolean }).stayed = true;
  });

  // The editor adds an update (saved as a draft), then presses "Publish live update": only the live block goes out.
  const updated = await cms(page.request, "PATCH", `articles/${String(id)}?draft=true`, {
    live: {
      status: "live",
      summary: [{ point: "Five of seven lots awarded." }],
      updates: [
        { at: at(30), title: "Auction opens", text: "Seven regional lots." },
        { at: at(0), title: `Lowest bid so far ${t}`, text: "Odisha lot." },
      ],
    },
  });
  expect(updated.status, JSON.stringify(updated.body.errors)).toBe(200);
  const pushed = await flow("live-update");
  expect(pushed.status, JSON.stringify(pushed.body.errors)).toBe(200);

  await expect(page.getByRole("main")).toContainText(`Lowest bid so far ${t}`, { timeout: 60_000 });
  // Same page, not a reload: the marker set before the update is still there.
  expect(await page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed)).toBe(true);
  // Newest first.
  const updates = page.getByRole("listitem").filter({ hasText: /IST/ });
  await expect(updates.first()).toContainText(`Lowest bid so far ${t}`);
});

test("the newsroom pages have no serious accessibility issues", async ({ page }) => {
  test.setTimeout(120_000);
  for (const path of ["/news", "/news/latest", "/news/press-releases", "/knowledge/insights"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).include("main").analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, `${path}: ${serious.map((v) => v.id).join(", ")}`).toEqual([]);
  }
});
