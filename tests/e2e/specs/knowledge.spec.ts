import { expect, test } from "../fixtures";
import { cms, newAuthor, paragraph, signInOperator } from "../helpers/cms";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Step 4.4 DONE WHEN: a glossary term used in an article shows the hover-card; downloading a gated report records
// consent and sends the file; a Hydrogen 101 chapter knows its previous and next chapter.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
test.skip(({ isMobile }) => isMobile, "the CMS is checked at desktop width");

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
// A one-page PDF with a cross-reference table (the CMS checks for one).
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
const unique = () => `${String(Date.now())}${String(Math.floor(Math.random() * 1000))}`;

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

test("a glossary term used in an article shows the hover-card", async ({ page }) => {
  await signInOperator(page, "Content editor");
  const word = `Hydrolyx${unique()}`;
  // Glossary terms are reference records: Content editors publish them (A30).
  const term = await cms(page.request, "POST", "glossary", {
    term: word,
    expansion: "Hydrolyx test unit",
    short: "a made-up machine used by this test.",
    _status: "published",
  });
  expect(term.status, JSON.stringify(term.body.errors)).toBe(201);
  const slug = (term.body.doc as { slug?: string } | undefined)?.slug ?? "";

  const author = await newAuthor(page.request);
  const article = await cms(page.request, "POST", "articles?draft=true", {
    type: "explainer",
    title: `Glossary test ${word}`,
    dek: "What it is.",
    body: paragraph(`The ${word} ran for 4,100 hours. A second ${word} followed.`),
    authors: [author],
  });
  expect(article.status).toBe(201);
  await page.goto(`/cms-preview/articles/${String(article.body.doc?.id)}`);

  // First mention only.
  const links = page.locator("a[data-glossary]");
  await expect(links).toHaveCount(1);
  await expect(links).toHaveText(word);
  await expect(links).toHaveAttribute("href", `/knowledge/glossary/${slug}`);

  await links.hover();
  const card = page.getByText("Hydrolyx test unit: a made-up machine used by this test.");
  await expect(card).toBeVisible();
  await expect(page.getByRole("link", { name: "Open in glossary →" })).toHaveAttribute(
    "href",
    `/knowledge/glossary/${slug}`,
  );

  // Keyboard users get the same card on focus.
  await page.mouse.move(0, 0);
  await expect(card).toBeHidden();
  await links.focus();
  await expect(card).toBeVisible();
});

test("a Hydrogen 101 chapter knows its previous and next chapter", async ({ page, request }) => {
  await signInOperator(page, "Editor-in-chief");
  const base = Date.now() * 10;
  const make = async (offset: number, status: "published" | "draft") => {
    const title = `Chapter ${String(offset)} ${unique()}`;
    const res = await cms(page.request, "POST", `chapters${status === "draft" ? "?draft=true" : ""}`, {
      order: base + offset,
      title,
      summary: "A short summary.",
      body: paragraph("Hydrogen is the lightest element."),
      _status: status,
    });
    expect(res.status, JSON.stringify(res.body.errors)).toBe(201);
    return { title, slug: (res.body.doc as { slug?: string } | undefined)?.slug ?? "" };
  };
  const first = await make(0, "published");
  const second = await make(2, "published");
  await make(3, "draft"); // drafts are skipped
  const third = await make(4, "published");

  const res = await request.get(`/api/cms/chapters/${second.slug}/neighbours`);
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({
    chapter: { slug: second.slug, order: base + 2 },
    previous: { slug: first.slug, title: first.title },
    next: { slug: third.slug, title: third.title },
  });
  expect((await request.get(`/api/cms/chapters/no-such-chapter-${unique()}/neighbours`)).status()).toBe(404);
});

test("downloading a gated report records consent and sends the file", async ({ page, request, baseURL }) => {
  await signInOperator(page, "Editor-in-chief");
  const upload = await page.request.post("/api/cms/report-files", {
    multipart: {
      file: { name: `electrolyser-buying-${unique()}.pdf`, mimeType: "application/pdf", buffer: PDF },
      _payload: JSON.stringify({ pages: 36 }),
    },
  });
  expect(upload.status(), await upload.text()).toBe(201);
  const fileId = ((await upload.json()) as { doc: { id: number } }).doc.id;
  const title = `Electrolyser buying in India 2026 ${unique()}`;
  const created = await cms(page.request, "POST", "reports", {
    title,
    kicker: "Survey",
    publishedOn: "2026-11-04T00:00:00.000Z",
    subtitle: "what 62 buyers told us",
    summary: "We asked 62 people who buy or specify electrolysers in India.",
    gated: true,
    file: fileId,
    sponsor: { name: "Hydrotek Systems", disclosure: "Hydrotek Systems paid for this survey. H2 Economy wrote it." },
    _status: "published",
  });
  expect(created.status, JSON.stringify(created.body.errors)).toBe(201);
  const slug = (created.body.doc as { slug?: string } | undefined)?.slug ?? "";

  const origin = new URL(baseURL ?? "http://localhost:3000").origin;
  const ip = `10.44.${String(Math.floor(Math.random() * 250))}.${String(Date.now() % 250)}`;
  const gate = (data: object, req = request) =>
    // A browser sends the form guard with the form (step 5.9); a request without it is refused as automated.
    req.post(`/api/v1/reports/${slug}/download`, {
      data: { guard: { website: "", elapsedMs: 5000 }, ...data },
      headers: { origin, "x-forwarded-for": ip },
    });

  // The form's checks.
  const missing = await gate({ email: "ravi@example.com", company: "Greenfield H2" });
  expect(missing.status()).toBe(400);
  expect(await missing.json()).toMatchObject({ error: { field: "name", message: "Enter your full name" } });
  expect((await request.post(`/api/v1/reports/${slug}/download`, { data: {} })).status()).toBe(403);

  // Ticked: the sponsor may contact them, in the words shown.
  const email = newEmail("report-reader");
  const ok = await gate({
    name: "Ravi Kulkarni",
    email,
    company: "Greenfield H2",
    role: "Procurement or purchase",
    sponsorConsent: true,
  });
  expect(ok.status()).toBe(200);
  const result = (await ok.json()) as { url: string; filename: string; emailed: boolean };
  expect(result.emailed).toBe(true);
  const file = await request.get(result.url);
  expect(file.status()).toBe(200);
  expect((await file.body()).subarray(0, 5).toString()).toBe("%PDF-");

  const lead = await withDb(async (db) => {
    const r = await db.query<{ sponsor_consent: boolean; consent_text: string | null; user_id: string | null }>(
      "SELECT sponsor_consent, consent_text, user_id FROM cms.report_leads WHERE email = $1",
      [email],
    );
    return r.rows[0];
  });
  expect(lead).toEqual({
    sponsor_consent: true,
    consent_text: "Hydrotek Systems, the sponsor, may contact me about this report",
    user_id: null,
  });

  // The emailed copy links back through us, never straight to storage.
  let link = "";
  await expect
    .poll(
      async () => {
        const list = (await (
          await request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}&limit=5`)
        ).json()) as { messages?: { ID: string; Subject: string }[] };
        const message = list.messages?.find((m) => m.Subject === `Your report: ${title}`);
        if (!message) return "";
        const full = (await (await request.get(`${MAILPIT}/api/v1/message/${message.ID}`)).json()) as {
          Text: string;
        };
        link = /https?:\/\/\S+\/api\/v1\/reports\/download\?[^\s)\]]+/.exec(full.Text)?.[0] ?? "";
        return link;
      },
      { timeout: 15_000 },
    )
    .toContain("/api/v1/reports/download?");
  const fromEmail = await request.get(new URL(link).pathname + new URL(link).search, { maxRedirects: 0 });
  expect(fromEmail.status()).toBe(303);
  expect(fromEmail.headers().location).toContain("cms-reports/");
  const tampered = new URL(link);
  tampered.searchParams.set("e", String(Date.now() + 999_999_999));
  expect((await request.get(tampered.pathname + tampered.search, { maxRedirects: 0 })).status()).toBe(410);

  // Unticked: the sponsor gets nothing.
  const other = newEmail("report-reader");
  expect((await gate({ name: "Asha Iyer", email: other, company: "IIT Bombay" })).status()).toBe(200);
  const unticked = await withDb(
    async (db) =>
      (
        await db.query<{ sponsor_consent: boolean; consent_text: string | null }>(
          "SELECT sponsor_consent, consent_text FROM cms.report_leads WHERE email = $1",
          [other],
        )
      ).rows[0],
  );
  expect(unticked).toEqual({ sponsor_consent: false, consent_text: null });

  // Members skip the form: recorded with their account, never with consent.
  const member = await page.context().browser()?.newContext({ baseURL });
  const memberPage = await member?.newPage();
  if (!memberPage) throw new Error("no browser");
  const memberEmail = newEmail("report-member");
  await signInNew(memberPage, memberEmail);
  expect((await gate({ sponsorConsent: true }, memberPage.request)).status()).toBe(200);
  const memberLead = await withDb(
    async (db) =>
      (
        await db.query<{ sponsor_consent: boolean; user_id: string | null; company: string | null }>(
          "SELECT sponsor_consent, user_id, company FROM cms.report_leads WHERE email = $1",
          [memberEmail],
        )
      ).rows[0],
  );
  expect(memberLead?.sponsor_consent).toBe(false);
  expect(memberLead?.user_id).toBeTruthy();
  expect(memberLead?.company).toBeNull();
  await member?.close();
});

test("report leads are deleted 24 months after the download", async ({ page, request }) => {
  await signInOperator(page, "Editor-in-chief");
  const email = newEmail("old-lead");
  const recent = newEmail("recent-lead");
  await withDb(async (db) => {
    const report = await db.query<{ id: number }>("SELECT id FROM cms.reports ORDER BY id DESC LIMIT 1");
    test.skip(!report.rows[0], "needs a report");
    for (const [who, age] of [
      [email, "25 months"],
      [recent, "23 months"],
    ] as const) {
      await db.query(
        `INSERT INTO cms.report_leads (report_id, name, email, sponsor_consent, created_at, updated_at)
         VALUES ($1, 'Reader', $2, false, now() - $3::interval, now() - $3::interval)`,
        [report.rows[0]?.id, who, age],
      );
    }
  });
  // The worker's daily call needs the worker's key; editors can run the same clean-up from the CMS.
  expect((await request.post("/api/internal/report-leads-prune")).status()).toBe(404);
  expect((await cms(request, "POST", "report-leads/purge-expired")).status).toBe(403);
  const res = await cms(page.request, "POST", "report-leads/purge-expired");
  expect(res.status).toBe(200);
  const left = await withDb(
    async (db) =>
      (await db.query<{ email: string }>("SELECT email FROM cms.report_leads WHERE email = ANY($1)", [[email, recent]]))
        .rows,
  );
  expect(left).toEqual([{ email: recent }]);
});

test("report files and images are virus-checked before they are stored", async ({ page }) => {
  await signInOperator(page, "Editor-in-chief");
  const eicar = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
  for (const [collection, file] of [
    ["report-files", { name: `bad-${unique()}.pdf`, mimeType: "application/pdf", buffer: eicar }],
    ["media", { name: `bad-${unique()}.png`, mimeType: "image/png", buffer: eicar }],
  ] as const) {
    const res = await page.request.post(`/api/cms/${collection}`, {
      multipart: { file, _payload: JSON.stringify({ alt: "Test", pages: 1 }) },
    });
    expect(res.status(), collection).toBe(400);
    expect(JSON.stringify(await res.json())).toContain("This file failed the virus check");
  }
});

test("only staff who export content see report leads", async ({ page }) => {
  await signInOperator(page, "Content editor");
  expect((await cms(page.request, "GET", "report-leads?limit=1")).status).toBe(403);
});
