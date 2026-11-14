import config from "@payload-config";
import { getDb, isInternalKey } from "@h2india/core";
import { ensureIndexes, queueIndexChange, syncSearch } from "@h2india/core/search";
import { getPayload } from "payload";
import { allDocuments, loadDocuments } from "@/search/documents";

// POST /api/internal/search-sync: the worker's call (step 5.2), after a save and every minute. Applies waiting outbox rows
// to the search indexes: each record is read again and written to its index if readers may see it, removed otherwise.
// ?refresh=records (once a day) queues every record again first, so statuses that follow the date (Open, Closing soon,
// Closed) stay right in result rows. Only the worker's key is accepted.

const DATED = ["schemes", "tenders", "grants", "jobs", "events"] as const;

let indexesReady = false;

export async function POST(request: Request) {
  if (!isInternalKey(request.headers.get("x-internal-key"))) return new Response(null, { status: 404 });
  const payload = await getPayload({ config });
  if (!indexesReady) {
    await ensureIndexes();
    indexesReady = true;
  }
  if (new URL(request.url).searchParams.get("refresh") === "records") {
    for (const uid of DATED) {
      const ids = (await allDocuments(payload, uid)).map((d) => d.id);
      await queueIndexChange(getDb(), uid, ids, { alerts: false });
    }
  }
  const report = await syncSearch(getDb(), (uid, ids) => loadDocuments(payload, uid, ids));
  return Response.json(report);
}
