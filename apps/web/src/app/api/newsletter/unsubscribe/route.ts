import { unsubscribe } from "@h2india/core/newsletter";
import { NextResponse } from "next/server";

// One-click unsubscribe (RFC 8058, step 5.9): mail apps POST "List-Unsubscribe=One-Click" to the List-Unsubscribe
// address. A GET (a person opening the link) goes to the confirmation page instead, so link scanners change nothing.

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const done = await unsubscribe(token);
  return new NextResponse(null, { status: done ? 200 : 400, headers: { "cache-control": "no-store" } });
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const target = new URL("/newsletter/unsubscribe", url);
  target.searchParams.set("token", url.searchParams.get("token") ?? "");
  return NextResponse.redirect(target, 303);
}
