import { fileStatus } from "@h2india/core/files";
import { NextResponse } from "next/server";
import { currentActor, fileErrorResponse, uploadKey } from "@/server/files";

// GET /api/v1/files/{id}: where the checks are (the File row polls this while it shows "Checking file…").
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const file = await fileStatus({ actor: await currentActor(), fileId: id, key: uploadKey(request) });
    return NextResponse.json(file, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return fileErrorResponse(error);
  }
}
