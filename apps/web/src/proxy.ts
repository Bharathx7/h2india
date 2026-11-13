import { isEnabled } from "@h2india/config";
import { NextResponse, type NextRequest } from "next/server";

// Gives every request an ID (step 3.6). The audit log stores it, and the response returns it in X-Request-Id, so a
// support conversation can be traced to the log entries. An ID set by the load balancer is kept if it looks safe.

const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

/** Better Auth's session cookie (prefix "h2"; "__Secure-" in production). */
const signedIn = (request: NextRequest) => request.cookies.getAll().some((c) => c.name.endsWith("h2.session_token"));

const MAINTENANCE_OPEN = ["/maintenance", "/admin", "/cms", "/api", "/sign-in", "/sign-out", "/newsletter", "/_next"];

export function proxy(request: NextRequest) {
  // The CMS (step 4.1, A26) uses our sign-in, not Payload's own pages.
  const { pathname } = request.nextUrl;
  if (pathname === "/cms/logout") return NextResponse.redirect(new URL("/sign-out", request.url));
  if (pathname.startsWith("/cms") && !signedIn(request)) {
    return NextResponse.redirect(new URL("/sign-in?next=/cms", request.url));
  }
  // Signed in but sent to Payload's sign-in page: the account has no Content access.
  if (pathname === "/cms/login") return NextResponse.redirect(new URL("/", request.url));
  // Planned maintenance (step 5.10, 679:620): every public address shows the maintenance page with a 503, so search
  // engines keep their index. The CMS, APIs, sign-in and the newsletter archive stay reachable.
  if (isEnabled("maintenance") && !MAINTENANCE_OPEN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const res = NextResponse.rewrite(new URL("/maintenance", request.url), { status: 503 });
    res.headers.set("retry-after", "3600");
    return res;
  }
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
