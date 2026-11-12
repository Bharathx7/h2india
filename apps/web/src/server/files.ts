import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { FileError } from "@h2india/core/files";
import { apiError } from "./api";
import { getSession } from "./auth";

// Shared by the file routes (step 3.7).

export async function currentActor() {
  const session = await getSession();
  return loadActor(getDb(), session?.user.id ?? null);
}

const STATUS: Record<string, number> = { NOT_ALLOWED: 403, NOT_FOUND: 404, TOO_MANY: 429 };

export function fileErrorResponse(error: unknown) {
  if (error instanceof FileError) return apiError(STATUS[error.code] ?? 400, error.code, error.message);
  throw error;
}

/** A signed-out uploader proves the file is theirs with the key from the start of the upload, sent as a header. */
export function uploadKey(request: Request): string | undefined {
  return request.headers.get("x-upload-key") ?? undefined;
}
