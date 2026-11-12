import config from "@payload-config";
import { getPayload } from "payload";
import { allJobs } from "@/opportunities/data";
import { jobView, type JobView } from "@/opportunities/views";
import { publicWhere, showSample } from "@/cms/sample";
import type { AudienceFaq, HelpArticle, LegalPage, Pricing, TeamMember, TrustSetting } from "@/payload-types";

// Public reads for the company, trust, legal and help pages (step 5.8). Published records only, samples only where
// shown (A37). Settings that aren't entered yet (M2) come back empty and the pages show the design's [placeholders].

const payload = () => getPayload({ config });

/** The name H2 India's own job posts carry, so Careers lists them from the jobs board ("Listed on the H2 India jobs
 * board too", 742:826). */
export const OWN_COMPANY = "H2 India";

export type Figure = { value: string; label: string; source: string; asOf: string };

export interface TrustDetails {
  operatingCompany: string;
  registeredOffice: string;
  officeHours: string;
  disclosure: string | null;
  disclosureDate: string | null;
  officer: { name: string; designation: string; email: string };
  partnerships: { name: string | null; role: string };
  boilerplate: string;
  mediaKitUrl: string | null;
  aboutFigures: Figure[];
  audience: Figure[];
}

const PLACEHOLDER = {
  company: "[Operating company name] Private Limited",
  office: "[Registered office address]",
  officer: "[Grievance officer]",
  email: "grievance@[H2 India domain]",
};

export async function trustDetails(): Promise<TrustDetails> {
  const s = await (await payload()).findGlobal({ slug: "trust-settings", depth: 0 });
  const figuresOk = !s.sample || showSample();
  const figs = (list: TrustSetting["aboutFigures"]): Figure[] =>
    figuresOk ? (list ?? []).map((f) => ({ value: f.value, label: f.label, source: f.source, asOf: f.asOf })) : [];
  const named = (v: string | null | undefined) => (v && (!s.sample || showSample()) ? v : null);
  return {
    operatingCompany: s.operatingCompany || PLACEHOLDER.company,
    registeredOffice: s.registeredOffice || PLACEHOLDER.office,
    officeHours: s.officeHours || "Monday to Friday, 9:30 am to 6:00 pm IST. Visits by appointment only.",
    disclosure: s.disclosure || null,
    disclosureDate: s.disclosureDate ?? null,
    officer: {
      name: named(s.grievanceOfficer?.name) ?? PLACEHOLDER.officer,
      designation: s.grievanceOfficer?.designation || "Grievance Officer, H2 India",
      email: s.grievanceOfficer?.email || PLACEHOLDER.email,
    },
    partnerships: { name: named(s.partnerships?.name), role: s.partnerships?.role || "Head of Partnerships" },
    boilerplate: s.boilerplate ?? "",
    mediaKitUrl: s.mediaKitUrl || null,
    aboutFigures: figs(s.aboutFigures),
    audience: figs(s.audience),
  };
}

export async function legalPage(slug: string): Promise<LegalPage | null> {
  const res = await (
    await payload()
  ).find({
    collection: "legal-pages",
    where: { and: [publicWhere(), { slug: { equals: slug } }] },
    limit: 1,
    depth: 0,
  });
  return res.docs[0] ?? null;
}

export async function helpArticles(): Promise<HelpArticle[]> {
  const res = await (
    await payload()
  ).find({ collection: "help-articles", where: publicWhere(), sort: "title", limit: 500, depth: 0, pagination: false });
  return res.docs;
}

export async function helpArticle(slug: string): Promise<HelpArticle | null> {
  const res = await (
    await payload()
  ).find({
    collection: "help-articles",
    where: { and: [publicWhere(), { slug: { equals: slug } }] },
    limit: 1,
    depth: 1,
  });
  return res.docs[0] ?? null;
}

export async function teamMembers(): Promise<TeamMember[]> {
  const res = await (
    await payload()
  ).find({ collection: "team-members", where: publicWhere(), sort: "order", limit: 100, depth: 0, pagination: false });
  return res.docs;
}

/** The Pricing global, or null while its prices aren't confirmed (C1, C3, M16) or are samples where hidden. */
export async function pricing(): Promise<Pricing | null> {
  const p = await (await payload()).findGlobal({ slug: "pricing", depth: 0 });
  if (p.sample && !showSample()) return null;
  return p;
}

export async function audienceFaqs(): Promise<AudienceFaq> {
  return (await payload()).findGlobal({ slug: "audience-faqs", depth: 0 });
}

/** H2 India's own open roles (742:826), from the jobs board. */
export async function openRoles(now = new Date()): Promise<JobView[]> {
  return (await allJobs())
    .filter((j) => j.company === OWN_COMPANY)
    .map((j) => jobView(j, now))
    .filter((j) => j.status === "Live");
}
