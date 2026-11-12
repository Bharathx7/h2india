import config from "@payload-config";
import { isInternalKey } from "@h2india/core";
import { getPayload } from "payload";
import { purgeReportLeads } from "@/cms/knowledge/library";

// POST /api/internal/report-leads-prune: the worker's daily call (step 4.4, A33). Report leads are deleted 24 months
// after the download. Only the worker's key is accepted.
export async function POST(request: Request) {
  if (!isInternalKey(request.headers.get("x-internal-key"))) return new Response(null, { status: 404 });
  const deleted = await purgeReportLeads(await getPayload({ config }));
  return Response.json({ deleted });
}
