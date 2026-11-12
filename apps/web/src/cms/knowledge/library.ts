import { createHmac, timingSafeEqual } from "node:crypto";
import { parseServerEnv } from "@h2india/config";
import type { Payload } from "payload";
import { publicWhere } from "../sample";
import type { LinkableTerm } from "./glossary-links";

// Knowledge helpers (step 4.4): chapter neighbours, the glossary for hover-cards, and report download links.

/** Report PDFs sit under this prefix in the private bucket. */
export const REPORTS_PREFIX = "cms-reports";

/** A Hydrogen 101 chapter with the chapters before and after it (by chapter number). Published only, unless draft. */
export async function chapterWithNeighbours(payload: Payload, slug: string, opts: { draft?: boolean } = {}) {
  const draft = opts.draft ?? false;
  const found = await payload.find({
    collection: "chapters",
    where: draft ? { slug: { equals: slug } } : { and: [{ slug: { equals: slug } }, publicWhere()] },
    limit: 1,
    draft,
  });
  const chapter = found.docs[0];
  if (!chapter) return null;
  const pick = { title: true, slug: true, order: true } as const;
  const [previous, next] = await Promise.all([
    payload.find({
      collection: "chapters",
      where: { and: [{ order: { less_than: chapter.order } }, publicWhere()] },
      sort: "-order",
      limit: 1,
      select: pick,
    }),
    payload.find({
      collection: "chapters",
      where: { and: [{ order: { greater_than: chapter.order } }, publicWhere()] },
      sort: "order",
      limit: 1,
      select: pick,
    }),
  ]);
  const brief = (d: { title: string; slug: string; order: number } | undefined) =>
    d ? { title: d.title, slug: d.slug, order: d.order } : null;
  return { chapter, previous: brief(previous.docs[0]), next: brief(next.docs[0]) };
}

// Kept between requests and refreshed when the glossary changes (a new term, an edit, a deletion). The check is one
// small query; the cache lives per server process, so it can't rely on hooks running in the same module.
let cache: { key: string; terms: LinkableTerm[] } | null = null;

/** Published glossary terms that link automatically. */
export async function glossaryTerms(payload: Payload): Promise<LinkableTerm[]> {
  const latest = await payload.find({
    collection: "glossary",
    sort: "-updatedAt",
    limit: 1,
    depth: 0,
    select: { updatedAt: true },
  });
  const key = `${String(latest.totalDocs)}:${latest.docs[0]?.updatedAt ?? ""}`;
  if (cache?.key === key) return cache.terms;
  const res = await payload.find({
    collection: "glossary",
    where: { and: [publicWhere(), { autoLink: { not_equals: false } }] },
    depth: 0,
    pagination: false,
    select: { term: true, slug: true, expansion: true, short: true, aliases: true },
  });
  const terms = res.docs.map((d) => ({
    term: d.term,
    slug: d.slug,
    expansion: d.expansion ?? null,
    short: d.short,
    match: [d.term, ...(d.aliases ?? [])],
  }));
  cache = { key, terms };
  return terms;
}

// The link in the emailed copy (A33): signed by us and valid 7 days; each click gets a fresh 5-minute storage link,
// so the email never holds a storage address.
export const EMAIL_LINK_DAYS = 7;

function sign(leadId: string, expires: number): string {
  return createHmac("sha256", parseServerEnv().AUTH_SECRET)
    .update(`report:${leadId}:${String(expires)}`)
    .digest("base64url");
}

export function reportLink(leadId: string, now = Date.now()): string {
  const expires = now + EMAIL_LINK_DAYS * 86_400_000;
  const env = parseServerEnv();
  const query = new URLSearchParams({ lead: leadId, e: String(expires), t: sign(leadId, expires) });
  return `${env.APP_URL}/api/v1/reports/download?${query.toString()}`;
}

export function checkReportLink(leadId: string, expires: string, token: string, now = Date.now()): boolean {
  const e = Number(expires);
  if (!leadId || !Number.isFinite(e) || e < now) return false;
  const expected = Buffer.from(sign(leadId, e));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** "Deleted 24 months after the download" (A33). The worker calls this daily. */
export async function purgeReportLeads(payload: Payload, now = new Date()): Promise<number> {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 24);
  const res = await payload.delete({
    collection: "report-leads",
    where: { createdAt: { less_than: cutoff.toISOString() } },
  });
  return res.docs.length;
}
