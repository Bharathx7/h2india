import { expect, test } from "@playwright/test";
import { cms, newAuthor, paragraph, signInOperator } from "../helpers/cms";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp, withDb } from "../helpers/sign-in";

// Steps 4.1 and 4.2 DONE WHEN: an editor can create, preview and save a draft of each article type; a Content editor cannot
// publish, an Editor-in-chief can; media without alt text cannot be saved; a scheduled article publishes within a
// minute; a piece needing legal check can't be published until it passes; a correction shows a dated note.
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
test.skip(({ isMobile }) => isMobile, "the CMS is checked at desktop width");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

const TYPES = [
  { type: "news", extra: {} },
  { type: "analysis", extra: {} },
  { type: "explainer", extra: {} },
  { type: "interview", extra: { interviewee: { name: "Rakesh Desai", role: "Plant manager" } } },
  { type: "press_release", extra: { issuer: "Pranava H2" }, label: "Press release" },
  { type: "sponsored", extra: { sponsor: { name: "Hydrotek Systems" } }, label: "Sponsored" },
] as const;

test("a Content editor drafts and previews every article type but can't publish", async ({ page }) => {
  await signInOperator(page, "Content editor");
  const author = await newAuthor(page.request);
  for (const t of TYPES) {
    const title = `CMS test ${t.type} ${String(Date.now())}`;
    const created = await cms(page.request, "POST", "articles?draft=true", {
      type: t.type,
      title,
      dek: "Six months after start-up, the plant manager talks stack hours.",
      body: paragraph("The plant has run for 4,100 hours since May."),
      authors: [author],
      ...t.extra,
    });
    expect(created.status, `${t.type}: ${JSON.stringify(created.body.errors)}`).toBe(201);
    const id = created.body.doc?.id ?? 0;
    await page.goto(`/cms-preview/articles/${String(id)}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Preview · draft");
    if ("label" in t) await expect(page.getByRole("main")).toContainText(t.label);

    const published = await cms(page.request, "PATCH", `articles/${String(id)}`, { _status: "published" });
    expect(published.status).toBe(403);
    expect(published.body.errors?.[0]?.message).toBe(
      "Only an Editor-in-chief can publish. Send it for review instead.",
    );
  }
});

test("an Editor-in-chief publishes through the workflow; sponsored pieces need the legal check first", async ({
  page,
}) => {
  await signInOperator(page, "Editor-in-chief");
  const author = await newAuthor(page.request, "Vikram Bose");
  const base = { dek: "Standfirst.", body: paragraph("Body."), authors: [author] };
  const flow = (id: number | undefined, action: string, extra: object = {}) =>
    cms(page.request, "POST", `articles/${String(id)}/workflow`, { action, ...extra });

  const news = await cms(page.request, "POST", "articles?draft=true", {
    ...base,
    type: "news",
    title: `News ${String(Date.now())}`,
  });
  const id = news.body.doc?.id;
  // Payload's own publish is replaced by the workflow.
  const direct = await cms(page.request, "PATCH", `articles/${String(id)}`, { _status: "published" });
  expect(direct.body.errors?.[0]?.message).toBe(
    "Publish from the Workflow panel, so the legal check and schedule are kept.",
  );
  expect((await flow(id, "publish")).body.errors?.[0]?.message).toBe("An article that is draft can't do that.");
  expect((await flow(id, "submit")).status).toBe(200);
  expect((await flow(id, "publish")).body.errors?.[0]?.message).toBe("Add at least one source before publishing.");
  await cms(page.request, "PATCH", `articles/${String(id)}?draft=true`, {
    sources: [{ title: "PIB release, 3 Nov 2026", url: "https://pib.gov.in" }],
  });
  const published = await flow(id, "publish");
  expect(published.status).toBe(200);
  expect(published.body.doc?._status).toBe("published");

  // A correction adds a dated note on the article and an entry in the Corrections queue.
  expect((await flow(id, "correct", { note: "The plant ran 4,100 hours, not 4,000." })).status).toBe(200);
  await page.goto(`/cms-preview/articles/${String(id)}`);
  await expect(page.getByRole("heading", { name: "Corrections" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("The plant ran 4,100 hours, not 4,000.");
  const queue = await cms(page.request, "GET", `corrections?where[article][equals]=${String(id)}`);
  expect((queue.body as unknown as { totalDocs: number }).totalDocs).toBe(1);
  const audited = await withDb(async (db) => {
    const r = await db.query<{ action: string }>(
      "SELECT action FROM core.audit_log WHERE resource_type = 'article' AND resource_id = $1 ORDER BY at",
      [String(id)],
    );
    return r.rows.map((x) => x.action);
  });
  expect(audited).toEqual(["article.submit", "article.publish", "article.correct"]);

  const sponsored = await cms(page.request, "POST", "articles?draft=true", {
    ...base,
    type: "sponsored",
    title: `Sponsored ${String(Date.now())}`,
    sponsor: { name: "Hydrotek Systems" },
    sources: [{ title: "Hydrotek datasheet" }],
  });
  const sid = sponsored.body.doc?.id;
  await flow(sid, "submit");
  const soon = new Date(Date.now() + 3000).toISOString();
  expect((await flow(sid, "schedule", { publishAt: soon })).body.errors?.[0]?.message).toBe(
    "This piece needs a legal check before it's scheduled.",
  );
  expect((await flow(sid, "send-to-legal")).status).toBe(200);
  expect((await flow(sid, "pass-legal")).status).toBe(200);
  expect((await flow(sid, "schedule", { publishAt: soon })).status).toBe(200);
  // The worker publishes it at its time (it checks every minute).
  await expect
    .poll(
      async () =>
        (await cms(page.request, "GET", `articles/${String(sid)}?draft=true`)).body as unknown as { workflow: string },
      {
        timeout: 90_000,
        intervals: [2000],
      },
    )
    .toMatchObject({ workflow: "Published" });
});

test("media can't be saved without alt text", async ({ page }) => {
  await signInOperator(page, "Content editor");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==",
    "base64",
  );
  const without = await page.request.post("/api/cms/media", {
    multipart: { file: { name: "plant.png", mimeType: "image/png", buffer: png }, _payload: JSON.stringify({}) },
  });
  expect(without.status()).toBe(400);
  expect(JSON.stringify(await without.json())).toContain("alt");
  const withAlt = await page.request.post("/api/cms/media", {
    multipart: {
      file: { name: "plant.png", mimeType: "image/png", buffer: png },
      _payload: JSON.stringify({ alt: "Electrolyser stacks at the Mundra plant" }),
    },
  });
  expect(withAlt.status()).toBe(201);
});

test("the CMS opens for editors and is closed to everyone else", async ({ page, browser }) => {
  await signInOperator(page, "Editor-in-chief");
  await page.goto("/cms");
  await expect(page.getByRole("link", { name: "Articles" }).first()).toBeVisible({ timeout: 20_000 });

  const visitor = await browser.newPage();
  await visitor.goto("/cms");
  await expect(visitor).toHaveURL(/\/sign-in\?next=(%2F|\/)cms/);
  await signInNew(visitor, newEmail("not-editor"));
  await visitor.goto("/cms");
  await expect(visitor).not.toHaveURL(/\/cms/);
  await visitor.close();
});

test("records: status follows the dates, verification is recorded, stale records are listed", async ({ page }) => {
  await signInOperator(page, "Content editor");
  const stamp = String(Date.now());
  // A30: a Content editor publishes record changes.
  const tender = await cms(page.request, "POST", "tenders", {
    _status: "published",
    title: `Supply and commissioning of a 5 MW PEM electrolyser ${stamp}`,
    issuer: "Northern Refineries Limited, Panipat",
    tenderId: `NRL/PNP/GH2/${stamp}`,
    bidDueAt: new Date(Date.now() + 2500).toISOString(),
    description: "Supply, installation and commissioning.",
    sourceUrl: "https://eprocure.gov.in",
  });
  expect(tender.status, JSON.stringify(tender.body.errors)).toBe(201);
  const id = tender.body.doc?.id;
  const read = async () =>
    (await cms(page.request, "GET", `tenders/${String(id)}`)).body as unknown as {
      status: string;
      sourceUrl: string;
      verification?: { at?: string };
    };
  expect((await read()).status).toBe("Closing soon");
  // Nobody touches it: at the deadline it is closed.
  await expect.poll(async () => (await read()).status, { timeout: 10_000 }).toBe("Closed");

  const verified = await cms(page.request, "POST", `tenders/${String(id)}/verify`, { note: "Checked the portal." });
  expect(verified.status).toBe(200);
  const after = await read();
  expect(after.sourceUrl).toBe("https://eprocure.gov.in");
  expect(after.verification?.at).toBeTruthy();

  const old = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  const scheme = (name: string, verifiedDaysAgo: number) =>
    cms(page.request, "POST", "schemes", {
      _status: "published",
      name,
      runBy: "SECI, for MNRE",
      summary: "A per-kg incentive.",
      sourceUrl: "https://seci.co.in",
      verification: { at: old(verifiedDaysAgo) },
    });
  await scheme(`Odisha green hydrogen policy ${stamp}`, 73);
  await scheme(`Hydrogen valley clusters ${stamp}`, 37);
  await scheme(`Recently checked ${stamp}`, 2);
  const quality = await page.request.get("/api/cms/data-quality");
  expect(quality.status()).toBe(200);
  const stale = ((await quality.json()) as { stale: { title: string; days: number; tone: string }[] }).stale.filter(
    (r) => r.title.endsWith(stamp),
  );
  expect(stale.map((r) => [r.title.replace(` ${stamp}`, ""), r.days, r.tone])).toEqual([
    ["Odisha green hydrogen policy", 73, "error"],
    ["Hydrogen valley clusters", 37, "warning"],
  ]);
});
