import { isEnabled } from "@h2india/config";
import { refreshFlagsSoon } from "@h2india/core/admin/system";
import { NextResponse, type NextRequest } from "next/server";
import { originOf, securityHeaders } from "./security/headers";
import { siteUrl } from "./server/origin";

// Gives every request an ID (step 3.6). The audit log stores it, and the response returns it in X-Request-Id, so a
// support conversation can be traced to the log entries. An ID set by the load balancer is kept if it looks safe.

const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

/** Better Auth's session cookie (prefix "h2"; "__Secure-" in production). */
const signedIn = (request: NextRequest) => request.cookies.getAll().some((c) => c.name.endsWith("h2.session_token"));

const MAINTENANCE_OPEN = [
  "/maintenance",
  "/status",
  "/admin",
  "/cms",
  "/api",
  "/sign-in",
  "/buyer/sign-in",
  "/supplier/sign-in",
  "/member/sign-in",
  "/forgot-password",
  "/reset-password",
  "/sign-out",
  "/newsletter",
  "/_next",
];

/** Requests that may change something. While viewing as someone (step 11.4) every one of them is refused here. */
const WRITES = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Security headers (step 12.1) on every response the proxy returns. */
function secure(request: NextRequest, response: NextResponse) {
  const storageOrigins = [originOf(process.env.S3_ENDPOINT), originOf(process.env.S3_PUBLIC_URL)].filter(
    (o): o is string => o !== null,
  );
  const headers = securityHeaders({
    dev: process.env.NODE_ENV !== "production",
    storageOrigins,
    pathname: request.nextUrl.pathname,
    analyticsOrigin: originOf(process.env.NEXT_PUBLIC_ANALYTICS_SRC),
  });
  for (const [k, v] of headers) response.headers.set(k, v);
  return response;
}

export function proxy(request: NextRequest) {
  return secure(request, route(request));
}

function route(request: NextRequest) {
  // Switches changed in System settings (step 11.8): re-read at most every 30 seconds, in the background.
  refreshFlagsSoon();
  // The CMS (step 4.1, A26) uses our sign-in, not Payload's own pages.
  const { pathname } = request.nextUrl;
  // View as user (657:486) is read-only: no form, server action or API call can write. Only ending it is allowed.
  if (request.cookies.has("h2_view_as") && WRITES.has(request.method) && pathname !== "/api/view-as/end") {
    return NextResponse.json(
      { error: "You're viewing as someone, read-only. End it to make changes." },
      { status: 403 },
    );
  }
  if (pathname === "/cms/logout") return NextResponse.redirect(siteUrl("/sign-out"));
  if (pathname.startsWith("/cms") && !signedIn(request)) {
    return NextResponse.redirect(siteUrl("/sign-in?next=/cms"));
  }
  // Signed in but sent to Payload's sign-in page: the account has no Content access.
  if (pathname === "/cms/login") return NextResponse.redirect(siteUrl("/"));
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
