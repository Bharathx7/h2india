import { NextResponse, type NextRequest } from "next/server";

// Gives every request an ID (step 3.6). The audit log stores it, and the response returns it in X-Request-Id, so a
// support conversation can be traced to the log entries. An ID set by the load balancer is kept if it looks safe.

const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

export function proxy(request: NextRequest) {
  const incoming = request.headers.get("x-request-id");
  const id = incoming && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set("x-request-id", id);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-request-id", id);
  return response;
}

export const config = {
  // Pages, server actions and API routes; not the static build files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|fonts/).*)"],
};
