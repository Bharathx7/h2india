import { parseServerEnv } from "@h2india/config";
import { NextResponse } from "next/server";

// Small helpers for the JSON routes under /api/v1.

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "cache-control": "no-store" } });
}

/**
 * Routes that change something and use the sign-in cookie only accept requests from our own pages (a page on another
 * site could otherwise make the browser send them). Server actions do this check themselves.
 */
export function fromOurSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(parseServerEnv().APP_URL).origin;
}
