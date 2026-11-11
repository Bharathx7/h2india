import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/server/auth";

// "Sign out" in the account menu links here. Only our own pages (or the address bar) may sign someone out;
// a link on another site cannot (Sec-Fetch-Site).
export async function GET(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "none") {
    await auth.api.signOut({ headers: await headers() });
  }
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
