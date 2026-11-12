import { confirmNewEmail } from "@h2india/core/recovery";
import { NextResponse, type NextRequest } from "next/server";

// The link in "Confirm your new work email" (lost email path, decision A15).
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const requestId = url.searchParams.get("request") ?? "";
  const token = url.searchParams.get("token") ?? "";
  try {
    await confirmNewEmail({ requestId, token });
    return NextResponse.redirect(new URL("/forgot-access/email?confirmed=1", request.url), { status: 303 });
  } catch {
    return NextResponse.redirect(new URL("/join/verify?expired=1", request.url), { status: 303 });
  }
}
