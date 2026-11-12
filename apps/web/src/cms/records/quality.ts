import type { Payload } from "payload";
import { TRACKER_SLUGS } from "../tracker/options";
import { RECORD_COLLECTIONS } from "./collections";

// Data quality (646:9, 646:733; step 4.3): records nobody has verified for the configured age (30 days, red after 60,
// A31), tracker records included (643:1330, step 4.5), and open possible updates. The admin screens come in step 11.3.

export const STALE_DAYS = 30;
export const RED_DAYS = 60;

const CHECKED = [...RECORD_COLLECTIONS, ...TRACKER_SLUGS] as const;

const TITLE: Record<string, string> = {
  schemes: "name",
  tenders: "title",
  grants: "title",
  jobs: "role",
  events: "name",
};

export async function staleRecords(payload: Payload, now: Date = new Date(), staleDays = STALE_DAYS) {
  const cutoff = new Date(now.getTime() - staleDays * 86_400_000).toISOString();
  const rows = await Promise.all(
    CHECKED.map(async (collection) => {
      const res = await payload.find({
        collection,
        where: { or: [{ "verification.at": { less_than: cutoff } }, { "verification.at": { exists: false } }] },
        depth: 1,
        limit: 500,
        overrideAccess: true,
      });
      return res.docs.map((d) => {
        const doc = d as unknown as Record<string, unknown> & {
          id: number;
          sourceUrl?: string;
          source?: { url?: string | null; name?: string } | null;
          verification?: { at?: string | null } | null;
          owner?: { name?: string } | number | null;
        };
        const at = doc.verification?.at ? new Date(doc.verification.at) : null;
        const days = at ? Math.floor((now.getTime() - at.getTime()) / 86_400_000) : null;
        return {
          collection,
          id: doc.id,
          title:
            typeof doc[TITLE[collection] ?? "name"] === "string" ? (doc[TITLE[collection] ?? "name"] as string) : "",
          owner: typeof doc.owner === "object" && doc.owner ? (doc.owner.name ?? null) : null,
          lastVerified: at,
          days,
          tone: days === null || days >= RED_DAYS ? ("error" as const) : ("warning" as const),
          source: doc.sourceUrl ?? doc.source?.url ?? doc.source?.name ?? null,
        };
      });
    }),
  );
  // Never verified first, then the oldest.
  return rows.flat().sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity));
}

export async function possibleUpdates(payload: Payload) {
  const res = await payload.find({
    collection: "source-changes",
    where: { status: { equals: "Open" } },
    sort: "-detectedAt",
    depth: 1,
    limit: 200,
    overrideAccess: true,
  });
  return res.docs;
}
