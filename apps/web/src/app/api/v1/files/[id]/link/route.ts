import { fileLink } from "@h2india/core/files";
import { NextResponse } from "next/server";
import { currentActor, fileErrorResponse } from "@/server/files";
import { requestContext } from "@/server/request-context";

// GET /api/v1/files/{id}/link: opens a file (step 3.7). Checks permission, then redirects to a signed link on the storage
// domain that works for 5 minutes. Opening a personal document is written to the audit log.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const link = await fileLink({ actor: await currentActor(), fileId: id, context: await requestContext() });
    return NextResponse.redirect(link.url, {
      status: 303,
      headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" },
    });
  } catch (error) {
    return fileErrorResponse(error);
  }
}
