import { parseServerEnv } from "@h2india/config";
import { createHmac, timingSafeEqual } from "node:crypto";

// The key the worker sends when it asks the web app to do scheduled work that lives there (step 4.2: publishing
// scheduled articles through the CMS). Derived from AUTH_SECRET, so there is no extra secret to manage.
export function internalKey(): string {
  return createHmac("sha256", parseServerEnv().AUTH_SECRET).update("h2india-internal-jobs").digest("hex");
}

export function isInternalKey(value: string | null): boolean {
  if (!value) return false;
  const expected = Buffer.from(internalKey());
  const given = Buffer.from(value);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Calls an internal web endpoint from the worker; throws on failure so the job retries. */
export async function callWeb(path: string): Promise<unknown> {
  const res = await fetch(new URL(path, parseServerEnv().APP_URL), {
    method: "POST",
    headers: { "x-internal-key": internalKey() },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${path}: ${String(res.status)}`);
  return res.json();
}
