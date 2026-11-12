import config from "@payload-config";
import { isInternalKey } from "@h2india/core";
import { getPayload } from "payload";
import { publishDue } from "@/cms/workflow";

// POST /api/internal/publish-due: the worker's every-minute call (step 4.2). Publishes articles whose scheduled time
// (IST, stored in UTC) has come. Only the worker's key is accepted.
export async function POST(request: Request) {
  if (!isInternalKey(request.headers.get("x-internal-key"))) return new Response(null, { status: 404 });
  const published = await publishDue(await getPayload({ config }));
  return Response.json({ published });
}
