import config from "@payload-config";
import { checkForm, type FormGuard } from "@h2india/core";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { ReportGateError, requestReport } from "@/cms/knowledge/gate";
import { apiError, fromOurSite } from "@/server/api";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// POST /api/v1/reports/:slug/download: the gated report form (736:421, step 4.4). Records the download and the
// sponsor consent, emails a copy and returns a 5-minute link to the PDF. Signed-in members send no details.
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!fromOurSite(request)) return apiError(403, "FORBIDDEN", "Not allowed");
  const { slug } = await params;
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const text = (key: string) => (typeof body[key] === "string" ? body[key] : undefined);
  const session = await getSession();
  // Form protection (step 5.9) for the gated form. Members and free reports send no details, so nothing to check.
  if (!session && (text("email") ?? text("name"))) {
    const guard = (typeof body.guard === "object" && body.guard !== null ? body.guard : undefined) as
      FormGuard | undefined;
    const check = await checkForm({ form: "report-gate", ip: (await requestContext()).ip ?? null, guard });
    if (!check.ok) return apiError(429, "RATE_LIMITED", "Too many requests from here. Try again in an hour.");
  }
  try {
    const result = await requestReport(await getPayload({ config }), {
      slug,
      name: text("name"),
      email: text("email"),
      company: text("company"),
      role: text("role"),
      sponsorConsent: body.sponsorConsent === true,
      member: session ? { userId: session.user.id, name: session.user.name, email: session.user.email } : null,
      ip: (await requestContext()).ip,
    });
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ReportGateError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message, field: error.field } },
        { status: error.status, headers: { "cache-control": "no-store" } },
      );
    }
    throw error;
  }
}
