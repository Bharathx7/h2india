import { expect, type APIRequestContext, type Browser, type Page, type TestInfo } from "@playwright/test";
import { signInNew } from "./join";
import { newEmail, ownIp, withDb } from "./sign-in";

// Step 4: an operator with a CMS role, and small helpers for the CMS REST API at /api/cms.

export async function signInOperator(
  page: Page,
  role: "Content editor" | "Editor-in-chief" | "Super admin" | "Catalogue moderator",
) {
  const email = newEmail(role.toLowerCase().replace(/\W+/g, "-"));
  await signInNew(page, email);
  await withDb((db) =>
    db.query(
      `INSERT INTO core.operator_roles (user_id, role_id)
       SELECT u.id, r.id FROM core.users u, core.roles r WHERE u.email = $1 AND r.scope = 'operator' AND r.name = $2`,
      [email, role],
    ),
  );
  return email;
}

export function paragraph(text: string) {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: [
        {
          type: "paragraph",
          format: "",
          indent: 0,
          version: 1,
          direction: "ltr",
          textFormat: 0,
          children: [{ type: "text", text, format: 0, style: "", mode: "normal", detail: 0, version: 1 }],
        },
      ],
    },
  };
}

export async function cms(request: APIRequestContext, method: "POST" | "PATCH" | "GET", path: string, data?: unknown) {
  const res = await request.fetch(`/api/cms/${path}`, {
    method,
    data: data === undefined ? undefined : JSON.stringify(data),
    headers: { "content-type": "application/json" },
  });
  const body = (await res.json().catch(() => ({}))) as {
    doc?: { id: number; _status?: string };
    errors?: { message: string }[];
  };
  return { status: res.status(), body };
}

export async function newAuthor(request: APIRequestContext, name = "Kavita Rao") {
  const res = await cms(request, "POST", "authors", { name, slug: `${name}-${String(Date.now())}`, kind: "staff" });
  expect(res.status).toBe(201);
  return res.body.doc?.id ?? 0;
}

/** A browser context for an operator: the back office is desktop only (627:1001), even in the phone project. */
export function backOfficeContext(browser: Browser) {
  return browser.newContext({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });
}

/**
 * Content some public-page tests read, published by an Editor-in-chief in a separate browser so the visitor's own
 * session is untouched. CI starts from an empty database, so a test that shows published content makes it first.
 * Placeholder wording only (no real legal text, CLAUDE.md).
 */
export async function asEditorInChief<T>(
  browser: Browser,
  info: TestInfo,
  work: (request: APIRequestContext) => Promise<T>,
): Promise<T> {
  const context = await browser.newContext();
  await ownIp(context, info);
  const page = await context.newPage();
  try {
    await signInOperator(page, "Editor-in-chief");
    return await work(page.request);
  } finally {
    await context.close();
  }
}

/** A published legal page with a version and its history (skipped when one is already published). */
export async function publishedLegalPage(request: APIRequestContext, slug: "terms", title: string) {
  const found = await cms(request, "GET", `legal-pages?where[slug][equals]=${slug}&limit=1`);
  const existing = (found.body as unknown as { docs?: { id: number; _status?: string }[] }).docs?.[0];
  if (existing?._status === "published") return;
  const today = new Date().toISOString();
  const data = {
    _status: "published",
    slug,
    title,
    version: "1.0",
    effectiveOn: today,
    sections: [{ heading: "Test section", body: "Placeholder text for the browser tests." }],
    history: [{ version: "1.0", date: today, changed: "First version (test)" }],
  };
  const res = existing
    ? await cms(request, "PATCH", `legal-pages/${String(existing.id)}`, data)
    : await cms(request, "POST", "legal-pages", data);
  expect(res.status, JSON.stringify(res.body.errors)).toBeLessThan(300);
}

/** A published help article with this title (the help centre is empty in a fresh database). */
export async function publishedHelpArticle(request: APIRequestContext, title: string) {
  // Sample articles (local seed data) can't be published, so look only at real ones.
  const found = await cms(
    request,
    "GET",
    `help-articles?where[title][equals]=${encodeURIComponent(title)}&where[sample][not_equals]=true&limit=1`,
  );
  const existing = (found.body as unknown as { docs?: { id: number; _status?: string }[] }).docs?.[0];
  if (existing?._status === "published") return;
  const data = {
    _status: "published",
    title,
    slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-e2e`,
    category: "account",
    intro: "Placeholder text for the browser tests.",
    sections: [{ heading: "Test section", text: "Placeholder text for the browser tests." }],
  };
  const res = existing
    ? await cms(request, "PATCH", `help-articles/${String(existing.id)}`, data)
    : await cms(request, "POST", "help-articles", data);
  expect(res.status, JSON.stringify(res.body.errors)).toBeLessThan(300);
}

/** A published India H₂ Weekly issue for the newsletter archive. */
export async function publishedIssue(request: APIRequestContext) {
  const n = 5000 + Math.floor(Math.random() * 4000);
  const res = await cms(request, "POST", "newsletter-issues", {
    _status: "published",
    list: "weekly",
    number: n,
    sentOn: new Date().toISOString(),
    title: `India H₂ Weekly #${String(n)}`,
    slug: `india-h2-weekly-${String(n)}-${String(Date.now())}`,
    highlights: [{ text: "Placeholder highlight for the browser tests." }],
  });
  expect(res.status, JSON.stringify(res.body.errors)).toBe(201);
}
