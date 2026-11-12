import { startUpload } from "@h2india/core/files";
import { NextResponse } from "next/server";
import { apiError, fromOurSite } from "@/server/api";
import { currentActor, fileErrorResponse } from "@/server/files";
import { requestContext } from "@/server/request-context";

// POST /api/v1/files: start an upload (step 3.7). Checks who may upload this kind, the declared type and size, and
// returns a 10-minute link the browser PUTs the file to. Nothing is usable until the worker has checked it.
export async function POST(request: Request) {
  if (!fromOurSite(request)) return apiError(403, "FORBIDDEN", "Not allowed");
  const body = (await request.json().catch(() => null)) as {
    kind?: unknown;
    name?: unknown;
    type?: unknown;
    bytes?: unknown;
    organisationId?: unknown;
  } | null;
  if (
    !body ||
    typeof body.kind !== "string" ||
    typeof body.name !== "string" ||
    typeof body.type !== "string" ||
    typeof body.bytes !== "number"
  ) {
    return apiError(400, "VALIDATION", "kind, name, type and bytes are required");
  }
  try {
    const started = await startUpload({
      actor: await currentActor(),
      kind: body.kind,
      name: body.name,
      type: body.type,
      bytes: body.bytes,
      organisationId: typeof body.organisationId === "string" ? body.organisationId : null,
      ip: (await requestContext()).ip,
    });
    return NextResponse.json(started, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return fileErrorResponse(error);
  }
}
