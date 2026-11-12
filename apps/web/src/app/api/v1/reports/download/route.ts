import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { linkForLead, ReportGateError } from "@/cms/knowledge/gate";
import { checkReportLink } from "@/cms/knowledge/library";
import { apiError } from "@/server/api";

// GET /api/v1/reports/download?lead&e&t: the link in the emailed copy (step 4.4). Valid for 7 days; each click
// sends the reader to a fresh 5-minute link to the PDF.
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const lead = query.get("lead") ?? "";
  if (!checkReportLink(lead, query.get("e") ?? "", query.get("t") ?? "")) {
    return apiError(410, "EXPIRED", "This link has expired. Download the report again from its page.");
  }
  try {
    const { url } = await linkForLead(await getPayload({ config }), lead);
    return NextResponse.redirect(url, { status: 303, headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ReportGateError) return apiError(error.status, error.code, error.message);
    throw error;
  }
}
