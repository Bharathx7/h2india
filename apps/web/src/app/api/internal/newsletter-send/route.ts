import config from "@payload-config";
import { getDb, isInternalKey } from "@h2india/core";
import { dueSends, sendBatch } from "@h2india/core/newsletter/sends";
import { getPayload } from "payload";
import { issueContent } from "@/admin/content/issue";

// POST /api/internal/newsletter-send: the worker's every-minute call (step 11.3). Sends the next batch of every issue
// whose send time has come, to confirmed subscribers only. Only the worker's key is accepted.
export async function POST(request: Request) {
  if (!isInternalKey(request.headers.get("x-internal-key"))) return new Response(null, { status: 404 });
  const db = getDb();
  const payload = await getPayload({ config });
  let sent = 0;
  for (const send of await dueSends(db)) {
    const issue = await payload
      .findByID({ collection: "newsletter-issues", id: Number(send.issueId), depth: 0, overrideAccess: true })
      .catch(() => null);
    if (!issue) continue;
    sent += await sendBatch(
      db,
      send.id,
      await issueContent(payload, issue, send.sendAt ?? new Date(), { chart: send.chart }),
    );
  }
  return Response.json({ sent });
}
