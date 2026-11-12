import type { Payload } from "payload";
import { RECORD_COLLECTIONS } from "./collections";

// Data quality (646:9, 646:733; step 4.3): records nobody has verified for the configured age (30 days, red after 60,
// A31), and open possible updates. The admin screens come in step 11.3.

export const STALE_DAYS = 30;
export const RED_DAYS = 60;

const TITLE: Record<(typeof RECORD_COLLECTIONS)[number], string> = {
  schemes: "name",
  tenders: "title",
  grants: "title",
  jobs: "role",
  events: "name",
};

export async function staleRecords(payload: Payload, now: Date = new Date(), staleDays = STALE_DAYS) {
  const cutoff = new Date(now.getTime() - staleDays * 86_400_000).toISOString();
  const rows = await Promise.all(
    RECORD_COLLECTIONS.map(async (collection) => {
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
          sourceUrl: string;
          verification?: { at?: string | null } | null;
          owner?: { name?: string } | number | null;
        };
        const at = doc.verification?.at ? new Date(doc.verification.at) : null;
        const days = at ? Math.floor((now.getTime() - at.getTime()) / 86_400_000) : null;
        return {
          collection,
          id: doc.id,
          title: typeof doc[TITLE[collection]] === "string" ? (doc[TITLE[collection]] as string) : "",
          owner: typeof doc.owner === "object" && doc.owner ? (doc.owner.name ?? null) : null,
          lastVerified: at,
          days,
          tone: days === null || days >= RED_DAYS ? ("error" as const) : ("warning" as const),
          source: doc.sourceUrl,
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
