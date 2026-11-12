import config from "@payload-config";
import { getPayload, type Where } from "payload";
import { publicWhere, showSample } from "@/cms/sample";
import type { TrackerSlug } from "@/cms/tracker/options";
import type { TrackerChange, TrackerMethodology, TrackerOverview } from "@/payload-types";

// The India Hydrogen Tracker's public reads (step 5.6): published records only, samples only where shown (A37),
// every record with its source and as-of date.

const payload = () => getPayload({ config });

export type TrackerRecord = Record<string, unknown> & {
  id: number;
  slug: string;
  source?: { name?: string | null; url?: string | null; tier?: string | null; asOf?: string | null } | null;
  updatedAt: string;
};

export async function trackerRecords(slug: TrackerSlug): Promise<TrackerRecord[]> {
  const res = await (
    await payload()
  ).find({ collection: slug, where: publicWhere(), limit: 2000, depth: 0, pagination: false, sort: "-updatedAt" });
  return res.docs as unknown as TrackerRecord[];
}

export async function trackerRecord(slug: TrackerSlug, recordSlug: string): Promise<TrackerRecord | null> {
  const res = await (
    await payload()
  ).find({
    collection: slug,
    where: { and: [publicWhere(), { slug: { equals: recordSlug } }] },
    limit: 1,
    depth: 1,
  });
  return (res.docs[0] as unknown as TrackerRecord | undefined) ?? null;
}

export async function recentChanges(
  opts: { view?: string; since?: Date; recordId?: number; slug?: TrackerSlug; limit?: number } = {},
): Promise<TrackerChange[]> {
  const parts: Where[] = [];
  if (opts.view) parts.push({ view: { equals: opts.view } });
  if (opts.since) parts.push({ at: { greater_than_equal: opts.since.toISOString() } });
  if (opts.recordId !== undefined && opts.slug) {
    parts.push({ "record.value": { equals: opts.recordId } }, { "record.relationTo": { equals: opts.slug } });
  }
  const res = await (
    await payload()
  ).find({
    collection: "tracker-changes",
    where: parts.length ? { and: parts } : {},
    sort: "-at",
    limit: opts.limit ?? 200,
    depth: 0,
    overrideAccess: false,
  });
  return res.docs;
}

export async function trackerOverview(): Promise<TrackerOverview | null> {
  const doc = await (await payload()).findGlobal({ slug: "tracker-overview", depth: 0 });
  if (doc.sample && !showSample()) return null;
  return doc;
}

export async function trackerMethodology(): Promise<TrackerMethodology> {
  return (await payload()).findGlobal({ slug: "tracker-methodology", depth: 0 });
}
