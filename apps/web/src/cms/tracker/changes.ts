import type { CollectionAfterChangeHook, CollectionConfig, Payload, PayloadRequest, Where } from "payload";
import { canDelete, editorOf, has } from "../roles";
import { showSample } from "../sample";
import { diffRecord, type TrackedField } from "./format";
import { TRACKER_SLUGS, viewOf, type TrackerSlug } from "./options";

// Recent changes (740:841) and "Changes to this record" (740:20), step 4.5 and A34. Every time a tracker record is
// published, what changed since its last published state is written here: field, before, after, the record's source,
// the date and who. Nobody writes these by hand.

/** Readers never see changes to sample records unless samples are shown (A37). */
function changesRead({ req }: { req: PayloadRequest }): boolean | Where {
  if (has(req, "content.view") || showSample()) return true;
  return { or: [{ sample: { equals: false } }, { sample: { exists: false } }] };
}

export const TrackerChanges: CollectionConfig = {
  slug: "tracker-changes",
  labels: { singular: "Tracker change", plural: "Tracker changes" },
  admin: {
    useAsTitle: "recordTitle",
    group: "Tracker",
    defaultColumns: ["at", "recordTitle", "view", "field", "before", "after", "source"],
    description: "Written automatically when a tracker record is published. Feeds Recent changes.",
  },
  defaultSort: "-at",
  access: { read: changesRead, create: () => false, update: () => false, delete: canDelete },
  fields: [
    { name: "at", label: "Date", type: "date", required: true, index: true },
    { name: "record", type: "relationship", relationTo: [...TRACKER_SLUGS], required: true, index: true },
    { name: "recordTitle", label: "Record", type: "text", required: true },
    { name: "recordSlug", type: "text" },
    { name: "view", type: "text", required: true, index: true },
    { name: "field", type: "text", required: true },
    { name: "before", type: "text" },
    { name: "after", type: "text" },
    { name: "source", type: "text" },
    { name: "sourceUrl", type: "text" },
    { name: "changedBy", type: "relationship", relationTo: "editors" },
    { name: "sample", type: "checkbox", defaultValue: false, index: true },
  ],
};

type Doc = Record<string, unknown> & { id: number | string; _status?: string; updatedAt?: string };

/** The record as it was last published before this save (null when this is the first publish). */
async function previousPublished(payload: Payload, slug: TrackerSlug, doc: Doc, req: PayloadRequest) {
  const versions = await payload.findVersions({
    collection: slug,
    where: { and: [{ parent: { equals: doc.id } }, { "version._status": { equals: "published" } }] },
    sort: "-createdAt",
    limit: 2,
    depth: 0,
    req,
  });
  // The newest published version is the one this save just wrote.
  const older = versions.docs[1];
  return older ? (older.version as unknown as Record<string, unknown>) : null;
}

export function logChanges(slug: TrackerSlug, tracked: TrackedField[], titleField: string): CollectionAfterChangeHook {
  return async ({ doc, req, context }): Promise<Doc> => {
    const d = doc as Doc;
    if (d._status !== "published" || context.skipTrackerLog) return d;
    const before = await previousPublished(req.payload, slug, d, req);
    const changes = diffRecord(before, d, tracked);
    const source = (d.source ?? {}) as { name?: string; url?: string };
    const editor = editorOf(req);
    const at = new Date().toISOString();
    for (const c of changes) {
      await req.payload.create({
        collection: "tracker-changes",
        data: {
          at,
          record: { relationTo: slug, value: d.id as number },
          recordTitle: typeof d[titleField] === "string" ? d[titleField] : "",
          recordSlug: typeof d.slug === "string" ? d.slug : null,
          view: viewOf(slug),
          field: c.field,
          before: c.before,
          after: c.after,
          source: source.name ?? null,
          sourceUrl: source.url ?? null,
          changedBy: editor ? Number(editor.id) : null,
          sample: d.sample === true,
        },
        overrideAccess: true,
        req,
      });
    }
    return d;
  };
}

/** Recent changes, newest first: all views, one view, or one record (740:841, the side panels, 740:20). */
export async function recentChanges(
  payload: Payload,
  opts: { view?: string; record?: { slug: TrackerSlug; id: number | string }; limit?: number } = {},
) {
  const where: Where[] = [];
  if (opts.view) where.push({ view: { equals: opts.view } });
  if (opts.record) {
    where.push({ "record.relationTo": { equals: opts.record.slug } }, { "record.value": { equals: opts.record.id } });
  }
  if (!showSample()) where.push({ or: [{ sample: { equals: false } }, { sample: { exists: false } }] });
  const res = await payload.find({
    collection: "tracker-changes",
    where: where.length ? { and: where } : {},
    sort: "-at",
    limit: opts.limit ?? 20,
    depth: 0,
  });
  return res.docs;
}
