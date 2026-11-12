import { expect, test } from "@playwright/test";
import { cms, newAuthor, paragraph, signInOperator } from "../helpers/cms";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp } from "../helpers/sign-in";

// Step 4.1 DONE WHEN: an editor can create, preview and save a draft of each article type; a Content editor cannot
// publish, an Editor-in-chief can; media without alt text cannot be saved.
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

test("an Editor-in-chief publishes; sponsored and press-release pieces need the legal check first", async ({
  page,
}) => {
  await signInOperator(page, "Editor-in-chief");
  const author = await newAuthor(page.request, "Vikram Bose");
  const base = { dek: "Standfirst.", body: paragraph("Body."), authors: [author] };
  const news = await cms(page.request, "POST", "articles?draft=true", {
    ...base,
    type: "news",
    title: `News ${String(Date.now())}`,
  });
  const noSources = await cms(page.request, "PATCH", `articles/${String(news.body.doc?.id)}`, { _status: "published" });
  expect(noSources.body.errors?.[0]?.message).toBe("Add at least one source before publishing.");
  const ok = await cms(page.request, "PATCH", `articles/${String(news.body.doc?.id)}`, {
    _status: "published",
    sources: [{ title: "PIB release, 3 Nov 2026", url: "https://pib.gov.in" }],
  });
  expect(ok.status).toBe(200);
  expect(ok.body.doc?._status).toBe("published");

  const sponsored = await cms(page.request, "POST", "articles?draft=true", {
    ...base,
    type: "sponsored",
    title: `Sponsored ${String(Date.now())}`,
    sponsor: { name: "Hydrotek Systems" },
    sources: [{ title: "Hydrotek datasheet" }],
  });
  const blocked = await cms(page.request, "PATCH", `articles/${String(sponsored.body.doc?.id)}`, {
    _status: "published",
  });
  expect(blocked.status).toBe(400);
  expect(blocked.body.errors?.[0]?.message).toBe("This piece needs a legal check before it's published.");
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
