import { parseServerEnv } from "@h2india/config";
import type { RequestContext } from "@h2india/core";
import { headers } from "next/headers";

// Where a request came from, for audit entries (step 3.6): client IP (the same header sign-in trusts, AUTH_IP_HEADER),
// user agent and the request ID set in src/proxy.ts.
export async function requestContext(): Promise<RequestContext> {
  const h = await headers();
  const ip = h.get(parseServerEnv().AUTH_IP_HEADER)?.split(",")[0]?.trim();
  return {
    ip: ip || undefined,
    userAgent: h.get("user-agent")?.slice(0, 512) ?? undefined,
    requestId: h.get("x-request-id") ?? undefined,
  };
}
