import { parseServerEnv } from "@h2india/config";
import { underLimit } from "@h2india/core";
import { JOB_ROLES } from "@h2india/core/companies/client";
import { signDownload } from "@h2india/core/files";
import { sendReportCopy } from "@h2india/core/notify";
import type { Payload } from "payload";
import { publicWhere } from "../sample";
import { EMAIL_LINK_DAYS, REPORTS_PREFIX, reportLink } from "./library";

// The gated report download (form 736:421, "Your report is ready" 736:833; step 4.4, A33): record who downloaded
// it and whether the sponsor may contact them, start the download, and email a copy. Signed-in members skip the
// form; their downloads are recorded for our counts and never shared. Free (ungated) reports just download.

export const CONSENT_TEXT = (sponsor: string) => `${sponsor}, the sponsor, may contact me about this report`;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINK_SECONDS = 300;

export interface ReportRequest {
  slug: string;
  name?: string;
  email?: string;
  company?: string;
  role?: string;
  sponsorConsent?: boolean;
  member?: { userId: string; name: string; email: string } | null;
  ip?: string | null;
}

export type GateField = "name" | "email" | "company" | "role";

export class ReportGateError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly field: GateField | null = null,
  ) {
    super(message);
  }
}

async function publishedReport(payload: Payload, slug: string) {
  const found = await payload.find({
    collection: "reports",
    where: { and: [{ slug: { equals: slug } }, publicWhere()] },
    limit: 1,
    depth: 1,
  });
  const report = found.docs[0];
  if (!report) throw new ReportGateError(404, "NOT_FOUND", "No such report");
  return report;
}

type Report = Awaited<ReturnType<typeof publishedReport>>;

async function fileLinkOf(payload: Payload, report: Report): Promise<{ url: string; filename: string }> {
  const file =
    typeof report.file === "object"
      ? report.file
      : await payload.findByID({ collection: "report-files", id: report.file, depth: 0 });
  if (!file.filename) throw new ReportGateError(500, "NO_FILE", "The report file is missing");
  const url = await signDownload(parseServerEnv().S3_BUCKET_PRIVATE, `${REPORTS_PREFIX}/${file.filename}`, {
    seconds: LINK_SECONDS,
    type: "application/pdf",
    fileName: file.filename,
  });
  return { url, filename: file.filename };
}

/** A fresh short link for a recorded download (the link in the emailed copy). */
export async function linkForLead(payload: Payload, leadId: string) {
  const lead = await payload.findByID({ collection: "report-leads", id: leadId, depth: 2 }).catch(() => null);
  if (!lead) throw new ReportGateError(404, "NOT_FOUND", "This link has expired. Download the report again.");
  const report =
    typeof lead.report === "object"
      ? lead.report
      : await payload.findByID({ collection: "reports", id: lead.report, depth: 1 });
  return fileLinkOf(payload, report);
}

function validate(input: ReportRequest) {
  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  const company = (input.company ?? "").trim();
  const role = (input.role ?? "").trim();
  if (name.length < 2) throw new ReportGateError(400, "VALIDATION", "Enter your full name", "name");
  if (!EMAIL.test(email) || email.length > 254) {
    throw new ReportGateError(400, "VALIDATION", "Enter your work email, like name@company.in", "email");
  }
  if (company.length < 2) throw new ReportGateError(400, "VALIDATION", "Enter your company, lab or agency", "company");
  if (role && !(JOB_ROLES as readonly string[]).includes(role)) {
    throw new ReportGateError(400, "VALIDATION", "Choose your role from the list", "role");
  }
  return { name: name.slice(0, 120), email, company: company.slice(0, 160), role: role || null };
}

export async function requestReport(payload: Payload, input: ReportRequest) {
  if (!(await underLimit(`report-gate:${input.ip ?? "unknown"}`, 3600, 30))) {
    throw new ReportGateError(429, "RATE_LIMITED", "Too many downloads from here. Try again in an hour.");
  }
  const report = await publishedReport(payload, input.slug);
  const summary = { title: report.title, subtitle: report.subtitle ?? null, kicker: report.kicker ?? null };
  if (!report.gated) return { ...(await fileLinkOf(payload, report)), emailed: false, report: summary };

  const member = input.member ?? null;
  const details = member
    ? { name: member.name.trim() || member.email, email: member.email.toLowerCase(), company: "", role: null }
    : validate(input);
  const sponsor = report.sponsor?.name?.trim() || null;
  const consent = !member && sponsor !== null && input.sponsorConsent === true;
  const lead = await payload.create({
    collection: "report-leads",
    data: {
      report: report.id,
      ...details,
      company: details.company || null,
      sponsorConsent: consent,
      consentText: consent && sponsor ? CONSENT_TEXT(sponsor) : null,
      userId: member?.userId ?? null,
    },
  });
  const file = await fileLinkOf(payload, report);
  await sendReportCopy({
    to: details.email,
    name: details.name.split(/\s+/)[0] ?? "",
    title: report.title,
    url: reportLink(String(lead.id)),
    days: EMAIL_LINK_DAYS,
    userId: member?.userId ?? null,
  });
  return { ...file, emailed: true, report: summary };
}
