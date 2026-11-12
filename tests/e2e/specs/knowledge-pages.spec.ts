import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cms, paragraph, signInOperator } from "../helpers/cms";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Step 5.6 DONE WHEN: every frame on page 09 has a route that matches; each tracker figure shows its source and as-of
// date (and sample records stay hidden where samples are off: tracker.spec.ts); submitting the gated form stores
// consent with its wording version and starts the download. Each test makes its own records.

test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

const tag = () => `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const PDF = Buffer.from(
  [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj",
    "xref",
    "0 4",
    "0000000000 65535 f ",
    "trailer<</Size 4/Root 1 0 R>>",
    "startxref",
    "0",
    "%%EOF",
    "",
  ].join("\n"),
);

async function seriousIssues(page: Page) {
  const axe = await new AxeBuilder({ page }).include("main").analyze();
  return axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id);
}

test("the gated report form records consent with its version and starts the download", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await signInOperator(page, "Editor-in-chief");
  const t = tag();
  const upload = await page.request.post("/api/cms/report-files", {
    multipart: {
      file: { name: `survey-${t}.pdf`, mimeType: "application/pdf", buffer: PDF },
      _payload: JSON.stringify({ pages: 36 }),
    },
  });
  expect(upload.status(), await upload.text()).toBe(201);
  const created = await cms(page.request, "POST", "reports", {
    title: `Buyer survey ${t}`,
    kicker: "Survey",
    publishedOn: "2026-11-04T00:00:00.000Z",
    summary: "We asked 62 people who buy electrolysers.",
    findings: [{ finding: "Lead time beat price." }],
    gated: true,
    file: ((await upload.json()) as { doc: { id: number } }).doc.id,
    sponsor: { name: "Hydrotek Systems", disclosure: "Hydrotek Systems paid for this survey." },
    _status: "published",
  });
  expect(created.status, JSON.stringify(created.body.errors)).toBe(201);
  const slug = (created.body.doc as unknown as { slug: string }).slug;

  const reader = await browser.newContext();
  const p = await reader.newPage();
  await p.goto(`/knowledge/reports/${slug}`);
  await expect(p.getByRole("heading", { level: 1 })).toHaveText(`Buyer survey ${t}`);
  await expect(p.getByText("Hydrotek Systems paid for this survey.")).toBeVisible();
  expect(await seriousIssues(p)).toEqual([]);
  await p.getByRole("button", { name: "Get the report" }).click();
  await expect(p.getByText("Enter your full name")).toBeVisible({ timeout: 20_000 });
  const email = newEmail("reader");
  await p.getByPlaceholder("Your full name").fill("Ravi Kulkarni");
  await p.getByPlaceholder("name@company.in").fill(email);
  await p.getByPlaceholder("Your company, lab or agency").fill("Greenfield H2");
  await p.getByRole("checkbox", { name: /Hydrotek Systems, the sponsor, may contact me/ }).click();
  const download = p.waitForEvent("download").catch(() => null);
  await p.getByRole("button", { name: "Get the report" }).click();
  await expect(p.getByRole("heading", { name: "Your report is ready" })).toBeVisible({ timeout: 15_000 });
  await download;
  await expect(p.getByRole("link", { name: "Download the PDF" })).toHaveAttribute("href", /survey-/);
  await reader.close();

  const lead = await withDb(async (db) => {
    const r = await db.query<{ consent_text: string | null; consent_version: string | null }>(
      "SELECT consent_text, consent_version FROM cms.report_leads WHERE email = $1",
      [email],
    );
    return r.rows[0];
  });
  expect(lead).toEqual({
    consent_text: "Hydrotek Systems, the sponsor, may contact me about this report",
    consent_version: "report-sponsor-v1",
  });
});

test("tracker views and records show every figure with its source and as-of date", async ({ page }) => {
  test.setTimeout(120_000);
  await signInOperator(page, "Content editor");
  const t = tag();
  const created = await cms(page.request, "POST", "tracker-projects", {
    name: `Green ammonia ${t}`,
    company: `Coastal Ammonia ${t}`,
    product: "Green ammonia",
    location: "Kakinada",
    state: "andhra-pradesh",
    capacityTpa: 12_345,
    technology: "Alkaline",
    stage: "Awarded",
    statusDate: "2026-08-01T00:00:00.000Z",
    source: {
      name: `SECI result notice ${t}`,
      url: "https://example.org/seci/result",
      tier: "official",
      asOf: "2026-11-09T00:00:00.000Z",
    },
    _status: "published",
  });
  expect(created.status, JSON.stringify(created.body.errors)).toBe(201);
  const slug = (created.body.doc as unknown as { slug: string }).slug;

  await page.goto("/tracker/projects?state=andhra-pradesh");
  await expect(page.getByRole("heading", { level: 1, name: "Green hydrogen projects in India" })).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: `Green ammonia ${t}` });
  await expect(row).toContainText("12,345");
  await expect(row.getByRole("link", { name: /Official/ })).toHaveAttribute("href", "https://example.org/seci/result");
  expect(await seriousIssues(page)).toEqual([]);

  const csv = await page.request.get("/tracker/projects/csv?state=andhra-pradesh");
  const text = await csv.text();
  expect(text).toContain(`Green ammonia ${t}`);
  expect(text).toContain(`SECI result notice ${t}`);
  expect(text).toContain("2026-11-0");

  await page.goto(`/tracker/projects/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Green ammonia ${t}`);
  await expect(page.getByRole("link", { name: `SECI result notice ${t}` })).toHaveAttribute(
    "href",
    "https://example.org/seci/result",
  );
  await expect(page.getByText(/as of \d{1,2} Nov 2026/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Changes to this record" })).toBeVisible();

  await page.goto("/tracker");
  await expect(page.getByRole("heading", { level: 1, name: "India Hydrogen Tracker" })).toBeVisible();
  // Turning every layer off shows the drawn empty state.
  for (const label of ["Projects", "Electrolyser factories", "Refuelling stations", "Hubs and valleys"]) {
    const box = page.getByRole("checkbox", { name: label });
    if ((await box.getAttribute("aria-checked")) === "true") await box.click();
  }
  await expect(page.getByText("Turn on a layer to see the map")).toBeVisible();
  await page.goto("/tracker/methodology");
  await expect(page.getByRole("heading", { name: "What each status means" })).toBeVisible();
  await page.goto("/tracker/changes?view=Projects");
  await expect(page.getByRole("link", { name: `Green ammonia ${t}` }).first()).toBeVisible();
});

test("knowledge pages: chapter with quiz, glossary term, standard, video and podcast", async ({ page }) => {
  test.setTimeout(150_000);
  await signInOperator(page, "Editor-in-chief");
  const t = tag();
  const term = await cms(page.request, "POST", "glossary", {
    term: `Stack life ${t}`,
    category: "Technology",
    short: "How long a stack runs before it needs replacing.",
    formula: "Stack life = hours until voltage rises 10%",
    _status: "published",
  });
  expect(term.status, JSON.stringify(term.body.errors)).toBe(201);
  const termSlug = (term.body.doc as unknown as { slug: string }).slug;
  const chapter = await cms(page.request, "POST", "chapters", {
    order: 900_000 + Math.floor(Math.random() * 99_999),
    title: `Stacks ${t}`,
    summary: "What a stack is.",
    body: paragraph("A stack is many cells pressed together."),
    keyTerms: [(term.body.doc as unknown as { id: number }).id],
    quiz: [{ question: "What is a stack?", options: [{ option: "One cell" }, { option: "Many cells" }], answer: 2 }],
    _status: "published",
  });
  expect(chapter.status, JSON.stringify(chapter.body.errors)).toBe(201);
  const standard = await cms(page.request, "POST", "standards", {
    code: `ISO ${t}`,
    title: `Electrolyser safety ${t}`,
    kind: "Standard",
    issuer: "ISO",
    summary: "Safety of electrolysers.",
    scope: [{ point: "Electrolyser makers" }],
    sourceUrl: "https://example.org/iso/standard",
    _status: "published",
  });
  expect(standard.status, JSON.stringify(standard.body.errors)).toBe(201);
  const video = await cms(page.request, "POST", "videos", {
    title: `Stack test line ${t}`,
    kind: "Explainer",
    description: "How every stack is tested.",
    url: "https://www.youtube.com/watch?v=example",
    chapters: [{ at: "0:00", title: "Why test" }],
    _status: "published",
  });
  expect(video.status, JSON.stringify(video.body.errors)).toBe(201);
  const podcast = await cms(page.request, "POST", "podcasts", {
    title: `Factories ${t}`,
    show: "Hydrogen Leaders",
    episode: 99,
    description: "Making electrolysers at scale.",
    url: "https://example.org/podcast/ep.mp3",
    transcript: "Host:\nWelcome.\nGuest:\nThanks.\nHost:\nFirst question.",
    _status: "published",
  });
  expect(podcast.status, JSON.stringify(podcast.body.errors)).toBe(201);
  const slugOf = (r: { body: { doc?: unknown } }) => (r.body.doc as { slug: string }).slug;

  await page.goto(`/knowledge/hydrogen-101/${slugOf(chapter)}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Stacks ${t}`);
  await expect(page.getByRole("link", { name: `Stack life ${t}` })).toBeVisible();
  await page.getByRole("radio", { name: "Many cells" }).click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("Correct.")).toBeVisible();
  expect(await seriousIssues(page)).toEqual([]);

  await page.goto(`/knowledge/glossary/${termSlug}`);
  await expect(page.getByText("How it's worked out")).toBeVisible();
  await expect(page.getByText("Stack life = hours until voltage rises 10%")).toBeVisible();
  await page.goto(`/knowledge/glossary?q=${t}`);
  await expect(page.getByRole("link", { name: new RegExp(`Stack life ${t}`) })).toBeVisible();

  await page.goto(`/knowledge/standards?q=${t}`);
  await page.getByRole("link", { name: new RegExp(`Electrolyser safety ${t}`) }).click();
  await expect(page.getByText("This is our summary, not the official text")).toBeVisible();
  await expect(page.getByRole("link", { name: /Open on example\.org/ })).toHaveAttribute(
    "href",
    "https://example.org/iso/standard",
  );

  await page.goto(`/knowledge/media/videos/${slugOf(video)}`);
  // No third-party player before M9: the video opens on its host.
  await expect(page.getByRole("link", { name: /Watch on YouTube/ })).toHaveAttribute(
    "href",
    "https://www.youtube.com/watch?v=example",
  );
  await expect(page.locator("iframe")).toHaveCount(0);

  await page.goto(`/knowledge/media/podcasts/${slugOf(podcast)}`);
  await expect(page.locator("audio")).toHaveAttribute("src", "https://example.org/podcast/ep.mp3");
  await page.getByText("Show the full transcript").click();
  await expect(page.getByText("First question.")).toBeVisible();

  for (const path of [
    "/knowledge",
    "/knowledge/guides",
    "/knowledge/reports",
    "/knowledge/media",
    "/knowledge/standards",
    "/knowledge/glossary",
  ]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
  }
});
