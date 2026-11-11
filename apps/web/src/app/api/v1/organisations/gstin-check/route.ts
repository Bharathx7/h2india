import { getDb } from "@h2india/core";
import { checkGstin } from "@h2india/core/companies";
import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";

// POST /api/v1/organisations/gstin-check: one of the eight designed GSTIN states (Figma 526:8). Signed-in people only.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in first" } }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { gstin?: unknown };
  if (typeof body.gstin !== "string") {
    return NextResponse.json({ error: { code: "VALIDATION", message: "gstin is required" } }, { status: 400 });
  }
  return NextResponse.json(await checkGstin(getDb(), body.gstin));
}
