import config from "@payload-config";
import { getDb } from "@h2india/core";
import { companyDocuments, type CompanyDocument } from "@h2india/core/search";
import { getPayload, type Where } from "payload";
import { publicWhere, showSample } from "@/cms/sample";
import type { Grant, Job, Tender } from "@/payload-types";

// Tenders, grants and jobs readers may see (step 5.5): published, and not sample where samples are hidden (A37).
// There are tens to hundreds of each, so the lists are filtered in memory, like the schemes hub.

const payload = () => getPayload({ config });
const and = (...parts: Where[]): Where => ({ and: [publicWhere(), ...parts] });

export async function allTenders(): Promise<Tender[]> {
  const res = await (
    await payload()
  ).find({ collection: "tenders", where: publicWhere(), sort: "bidDueAt", limit: 1000, depth: 1 });
  return res.docs;
}

export async function getTender(slug: string): Promise<Tender | null> {
  const res = await (
    await payload()
  ).find({ collection: "tenders", where: and({ slug: { equals: slug } }), limit: 1, depth: 1 });
  return res.docs[0] ?? null;
}

export async function allGrants(): Promise<Grant[]> {
  const res = await (
    await payload()
  ).find({ collection: "grants", where: publicWhere(), sort: "deadline", limit: 500, depth: 0 });
  return res.docs;
}

export async function getGrant(slug: string): Promise<Grant | null> {
  const res = await (
    await payload()
  ).find({ collection: "grants", where: and({ slug: { equals: slug } }), limit: 1, depth: 0 });
  return res.docs[0] ?? null;
}

/** Published jobs, live and expired; the list shows live ones, an expired job's page still opens (465:7367). */
export async function allJobs(): Promise<Job[]> {
  const res = await (
    await payload()
  ).find({ collection: "jobs", where: publicWhere(), sort: "-postedAt", limit: 1000, depth: 0 });
  return res.docs;
}

export async function getJob(slug: string): Promise<Job | null> {
  const res = await (
    await payload()
  ).find({ collection: "jobs", where: and({ slug: { equals: slug } }), limit: 1, depth: 0 });
  return res.docs[0] ?? null;
}

/** Public company profiles by slug (About the company 465:6591, winners 459:3621). Profile fields only. */
export async function companiesBySlug(slugs: string[]): Promise<Map<string, CompanyDocument>> {
  const wanted = [...new Set(slugs.filter(Boolean))];
  if (!wanted.length) return new Map();
  const docs = await companyDocuments(getDb(), { includeSample: showSample() });
  const out = new Map<string, CompanyDocument>();
  for (const d of docs) {
    const slug = d.href.split("/").at(-1) ?? "";
    if (wanted.includes(slug)) out.set(slug, d);
  }
  return out;
}

/** "Companies that could bid" (457:3222): listed companies whose categories or types match the tender's category. */
export async function companiesFor(words: string[], limit = 2): Promise<CompanyDocument[]> {
  const needles = words.map((w) => w.trim().toLowerCase()).filter((w) => w.length > 2);
  if (!needles.length) return [];
  const docs = await companyDocuments(getDb(), { includeSample: showSample() });
  return docs
    .filter((d) =>
      [...d.categories, ...d.types, d.summary].some((c) => needles.some((n) => c.toLowerCase().includes(n))),
    )
    .sort((a, b) => Number(b.verified) - Number(a.verified))
    .slice(0, limit);
}
