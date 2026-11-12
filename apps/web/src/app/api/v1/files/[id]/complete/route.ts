import { completeUpload, enqueueFileCheck } from "@h2india/core/files";
import { NextResponse } from "next/server";
import { apiError, fromOurSite } from "@/server/api";
import { currentActor, fileErrorResponse, uploadKey } from "@/server/files";

// POST /api/v1/files/{id}/complete: the browser finished its PUT; queue the checks (step 3.7).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!fromOurSite(request)) return apiError(403, "FORBIDDEN", "Not allowed");
  const { id } = await params;
  try {
    const file = await completeUpload(
      { actor: await currentActor(), fileId: id, key: uploadKey(request) },
      enqueueFileCheck,
    );
    return NextResponse.json(file, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return fileErrorResponse(error);
  }
}
