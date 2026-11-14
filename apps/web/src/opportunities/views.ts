import { daysLeft, daysUntil } from "@h2india/core/time";
import { experienceFits, isStudentRole, salaryLabel } from "@h2india/core/opportunities/rules";
import type { BadgeTone } from "@h2india/ui";
import { STATE_OPTIONS } from "../cms/records/states";
import { grantStatus, jobStatus, tenderStatus } from "../cms/records/status";
import { dayMonthYear, istDayKey } from "../news/format";
import type { Grant, Job, Tender } from "../payload-types";

// Tenders, grants and jobs as the step 5.5 pages show them (453:9 home, 455:1621 tenders, 462:4609 grants, 464:6071
// jobs). daysLeft() lives in @h2india/core/time (shared with alert messages) and is re-exported here.
// Pure: no CMS access, so the filters and labels are unit-tested. Statuses come from the dates, in India time.

export { daysLeft, daysUntil };

export const stateLabel = (value: string) => STATE_OPTIONS.find((o) => o.value === value)?.label ?? value;

/** The badge tone for a record status (Status badge 20:96). */
export function toneOf(status: string): BadgeTone {
  if (status === "Closing soon") return "warning";
  if (["Open", "Results declared", "Extended", "Announced", "Live"].includes(status)) return "success";
  if (["Closed", "Awarded", "Expired"].includes(status)) return "neutral";
  return "progress";
}

/** "12 Nov" (cards and rows within the year, as drawn). */
export const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(new Date(iso));

export function placeOf(states: string[] | null | undefined): string {
  const list = (states ?? []).filter(Boolean);
  if (!list.length || list.includes("all-india")) return "Pan-India";
  return list.map(stateLabel).join(", ");
}

/** "SECI" → SE, "Deendayal Port" → DP (the logo stand-in). */
export function initialsOf(name: string): string {
  const words = name.split(/[\s/]+/).filter((w) => /^[A-Za-z]/.test(w));
  const letters = words.length > 1 ? words.map((w) => w.charAt(0)).join("") : (words[0] ?? "");
  return letters.slice(0, 2).toUpperCase();
}

// ——— Tenders ———

export interface TenderRow {
  id: number;
  slug: string;
  href: string;
  issuer: string;
  initials: string;
  issuerType: string | null;
  status: { label: string; tone: BadgeTone };
  title: string;
  tenderId: string;
  place: string;
  states: string[];
  sector: string | null;
  valueBand: string | null;
  bidDueAt: string;
  publishedAt: string;
  /** "12 Nov 2026" */
  dueDate: string;
  /** "2 days left", with the badge tone: amber in the last week, green before (455:1621). */
  left: { label: string; tone: BadgeTone } | null;
  scope: string;
  keyDates: string;
  /** For TenderCard (375:7213). */
  card: {
    issuer: string;
    status: { label: string; tone: BadgeTone };
    title: string;
    tenderId: string;
    place: string;
    due: string;
    money: string;
    category: string;
    href: string;
    documentsHref: string;
    trackHref: string;
  };
}

export function tenderRow(t: Tender, now = new Date()): TenderRow {
  const status = tenderStatus(t, now);
  const href = `/opportunities/tenders/${t.slug}`;
  const open = new Date(t.bidDueAt) > now;
  const days = daysUntil(t.bidDueAt, now);
  const keyDates = [
    t.publishedAt ? `Published ${dayMonth(t.publishedAt)}` : null,
    ...(t.keyDates ?? []).filter((k) => k.at && /pre-bid/i.test(k.label)).map((k) => `Pre-bid ${dayMonth(k.at ?? "")}`),
    `Bid due ${dayMonth(t.bidDueAt)}, ${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(t.bidDueAt))} IST`,
  ]
    .filter(Boolean)
    .join(" · ");
  const badge = { label: status, tone: toneOf(status) };
  return {
    id: t.id,
    slug: t.slug,
    href,
    issuer: t.issuer,
    initials: initialsOf(t.issuer),
    issuerType: t.issuerType ?? null,
    status: badge,
    title: t.title,
    tenderId: t.tenderId,
    place: placeOf(t.states),
    states: (t.states ?? []).filter((s) => s !== "all-india"),
    sector: t.sector ?? null,
    valueBand: t.valueBand ?? null,
    bidDueAt: t.bidDueAt,
    publishedAt: t.publishedAt ?? t.createdAt,
    dueDate: dayMonthYear(t.bidDueAt),
    left: open ? { label: daysLeft(t.bidDueAt, now), tone: days <= 7 ? "warning" : "success" } : null,
    scope: t.description,
    keyDates,
    card: {
      issuer: t.issuer,
      status: badge,
      title: t.title,
      tenderId: t.tenderId,
      place: placeOf(t.states),
      due: open
        ? `Bid due ${dayMonth(t.bidDueAt)} · ${daysLeft(t.bidDueAt, now)}`
        : `Bid closed ${dayMonth(t.bidDueAt)}`,
      money: `Est. value: ${t.value?.trim() || "not published"} · EMD: ${t.emd?.trim() || "not published"}`,
      category: t.category?.replace(/\s*›\s*/g, " · ") ?? t.sector ?? "",
      href,
      documentsHref: t.sourceUrl,
      trackHref: `${href}#track`,
    },
  };
}

/** The statuses the tenders list shows until someone picks others: "open, closing soon or extended" (455:1621). */
export const DEFAULT_TENDER_STATUSES = ["Open", "Closing soon", "Extended"];
export const TENDER_STATUSES = ["Open", "Closing soon", "Extended", "Upcoming", "Under evaluation"];
export const NOT_PUBLISHED = "Not published";

export interface TenderFilter {
  issuerTypes: string[];
  issuer: string;
  sectors: string[];
  state: string;
  statuses: string[];
  /** YYYY-MM-DD, India time, inclusive. */
  from: string;
  to: string;
  values: string[];
  q: string;
}

export function filterTenders(rows: TenderRow[], f: TenderFilter): TenderRow[] {
  const statuses = f.statuses.length ? f.statuses : DEFAULT_TENDER_STATUSES;
  const words = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((r) => {
    if (!statuses.includes(r.status.label)) return false;
    if (f.issuerTypes.length && !(r.issuerType && f.issuerTypes.includes(r.issuerType))) return false;
    if (f.issuer && r.issuer !== f.issuer) return false;
    if (f.sectors.length && !(r.sector && f.sectors.includes(r.sector))) return false;
    // A pan-India tender is open to bidders from every state.
    if (f.state && r.states.length && !r.states.includes(f.state)) return false;
    const day = istDayKey(r.bidDueAt);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    if (f.values.length && !f.values.includes(r.valueBand ?? NOT_PUBLISHED)) return false;
    if (words.length) {
      const text = [r.title, r.issuer, r.tenderId, r.sector, r.place, r.scope].join(" ").toLowerCase();
      if (!words.every((w) => text.includes(w))) return false;
    }
    return true;
  });
}

export function sortTenders(rows: TenderRow[], sort: string): TenderRow[] {
  return [...rows].sort((a, b) =>
    sort === "newest" ? b.publishedAt.localeCompare(a.publishedAt) : a.bidDueAt.localeCompare(b.bidDueAt),
  );
}

// ——— Results (460:4147) ———

export interface ResultRow {
  id: number;
  href: string;
  /** "18 Aug 2025", or the editor's "Aug 2025" / "2025". */
  date: string;
  declaredAt: string;
  eyebrow: string;
  title: string;
  bidders: string;
  winners: { name: string; href: string | null }[];
  winnersLine: string | null;
  capacity: string;
  price: string;
  meansHref: string;
  issuer: string;
  sector: string | null;
  year: string;
}

export function resultRow(t: Tender): ResultRow | null {
  const r = t.result;
  if (!r?.declaredAt) return null;
  const winners = (r.winners ?? []).map((w) => ({
    name: w.name,
    href: w.profileSlug ? `/directory/companies/${w.profileSlug}` : null,
  }));
  const first = r.winners?.[0];
  const analysis = typeof r.analysis === "object" && r.analysis ? r.analysis : null;
  return {
    id: t.id,
    href: `/opportunities/tenders/${t.slug}`,
    date: r.dateLabel?.trim() || dayMonthYear(r.declaredAt),
    declaredAt: r.declaredAt,
    eyebrow: [t.issuer, t.sector ?? t.category?.split("›").at(-1)?.trim()].filter(Boolean).join(" · "),
    title: t.title,
    bidders: r.bidders?.trim() || "Not public",
    winners,
    winnersLine: r.winnersLine?.trim() || null,
    capacity: r.capacityLine?.trim() || first?.capacity || "",
    price: r.price?.trim() || first?.price || "Not public",
    meansHref: analysis ? `/news/${analysis.slug}` : `/opportunities/tenders/${t.slug}#results`,
    issuer: t.issuer,
    sector: t.sector ?? null,
    year: new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", year: "numeric" }).format(
      new Date(r.declaredAt),
    ),
  };
}

// ——— Grants (462:4609) ———

export interface GrantView {
  id: number;
  slug: string;
  href: string;
  funder: string;
  status: { label: string; tone: BadgeTone };
  /** The raw status, for filters ("Next round expected" is drawn as "Closed, next call expected"). */
  statusKey: string;
  level: string;
  title: string;
  benefit: string;
  who: string[];
  themes: string[];
  deadline: string;
  deadlineAt: string;
  verified: string | null;
  states: string[];
}

export function grantView(g: Grant, now = new Date()): GrantView {
  const status = grantStatus(
    { deadline: g.deadline, nextCallExpected: g.nextCallExpected, override: g.statusOverride },
    now,
  );
  const label = status === "Next round expected" ? "Closed" : status;
  const open = status === "Open" || status === "Closing soon";
  const verb = /application/i.test(g.howToApply) && !/proposal/i.test(g.howToApply) ? "Applications" : "Proposals";
  const deadline =
    status === "Announced"
      ? `Call expected ${g.nextCallExpected?.trim() || dayMonthYear(g.deadline)}`
      : open
        ? `${verb} due ${dayMonthYear(g.deadline)} · ${daysLeft(g.deadline, now)}`
        : `Closed ${dayMonthYear(g.deadline)}${g.nextCallExpected ? ` · next call expected ${g.nextCallExpected}` : ""}`;
  const states = (g.states ?? []).filter((s) => s !== "all-india");
  return {
    id: g.id,
    slug: g.slug,
    href: `/opportunities/grants/${g.slug}`,
    funder: g.funder,
    status: { label, tone: toneOf(label) },
    statusKey: status,
    level: [g.funder, (g.themes ?? []).map((t) => t.split(" and ")[0]).join(", ")].filter(Boolean).join(" · "),
    title: g.title,
    benefit: g.summary?.trim() || g.amountPerProject || "",
    who: g.whoCanApply ?? [],
    themes: g.themes ?? [],
    deadline,
    deadlineAt: g.deadline,
    verified: g.verification?.at ? dayMonthYear(g.verification.at) : null,
    states,
  };
}

/** Status filter values (462:4609); the last one is a closed call with a next call expected. */
export const GRANT_STATUS_FILTERS = [
  { value: "Open", label: "Open" },
  { value: "Closing soon", label: "Closing soon" },
  { value: "Announced", label: "Announced" },
  { value: "Next round expected", label: "Closed, next call expected" },
];
export const DEFAULT_GRANT_STATUSES = ["Open", "Closing soon", "Announced"];

export interface GrantFilter {
  funders: string[];
  themes: string[];
  who: string[];
  statuses: string[];
}

export function filterGrants(list: GrantView[], f: GrantFilter): GrantView[] {
  const statuses = f.statuses.length ? f.statuses : DEFAULT_GRANT_STATUSES;
  return list.filter((g) => {
    if (!statuses.includes(g.statusKey)) return false;
    if (f.funders.length && !f.funders.includes(g.funder)) return false;
    if (f.themes.length && !g.themes.some((t) => f.themes.includes(t))) return false;
    if (f.who.length && !g.who.some((w) => f.who.includes(w))) return false;
    return true;
  });
}

/** How to apply steps (463:5337): steps before the first future date are done; that one is current. */
export function stepStates(steps: { at?: string | null }[], now: Date): ("done" | "current" | "next")[] {
  const current = steps.findIndex((s) => s.at && new Date(s.at) > now);
  return steps.map((_, i) => (current === -1 ? "done" : i < current ? "done" : i === current ? "current" : "next"));
}

// ——— Jobs (464:6071) ———

export interface JobView {
  id: number;
  slug: string;
  href: string;
  company: string;
  initials: string;
  role: string;
  /** "Ratnagiri, Maharashtra · On site" */
  where: string;
  location: string;
  states: string[];
  workMode: string | null;
  function: string | null;
  experience: string | null;
  jobType: string | null;
  salary: string | null;
  /** "Posted 6 Nov · closes 30 Nov" */
  dates: string;
  postedAt: string;
  closesAt: string;
  status: string;
  featured: boolean;
  student: boolean;
}

export function jobView(j: Job, now = new Date()): JobView {
  const posted = j.postedAt ?? j.createdAt;
  return {
    id: j.id,
    slug: j.slug,
    href: `/opportunities/jobs/${j.slug}`,
    company: j.company,
    initials: initialsOf(j.company),
    role: j.role,
    where: [j.location, j.workMode].filter(Boolean).join(" · "),
    location: j.location,
    states: (j.states ?? []).filter((s) => s !== "all-india"),
    workMode: j.workMode ?? null,
    function: j.function ?? null,
    experience: j.experience ?? null,
    jobType: j.jobType ?? null,
    salary: salaryLabel(j.salaryBand),
    dates: `Posted ${dayMonth(posted)} · closes ${dayMonth(j.closesAt)}`,
    postedAt: posted,
    closesAt: j.closesAt,
    status: jobStatus({ closesAt: j.closesAt }, now),
    featured: Boolean(j.featured),
    student: isStudentRole(j),
  };
}

export interface JobFilter {
  students: boolean;
  functions: string[];
  /** A state value. */
  location: string;
  modes: string[];
  experience: string;
}

export function filterJobs(list: JobView[], f: JobFilter): JobView[] {
  return list.filter((j) => {
    if (j.status !== "Live") return false;
    if (f.students && !j.student) return false;
    if (f.functions.length && !(j.function && f.functions.includes(j.function))) return false;
    if (f.location && !j.states.includes(f.location)) return false;
    if (f.modes.length && !(j.workMode && f.modes.includes(j.workMode))) return false;
    if (f.experience && !experienceFits(j.experience, f.experience)) return false;
    return true;
  });
}

/** Featured jobs first (A69), then newest, or closing soonest. */
export function sortJobs(list: JobView[], sort: string): JobView[] {
  return [...list].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return sort === "closing" ? a.closesAt.localeCompare(b.closesAt) : b.postedAt.localeCompare(a.postedAt);
  });
}

const EMPLOYMENT: Record<string, string> = {
  "Full-time": "FULL_TIME",
  "Part-time": "PART_TIME",
  Contract: "CONTRACTOR",
  Internship: "INTERN",
};

/** schema.org JobPosting for a live job (search engines' job listings). Only what the page itself shows. */
export function jobPostingLd(j: Job, url: string, about: { name: string; sameAs?: string | null }) {
  const [city, region] = j.location.split(",").map((x) => x.trim());
  const band = /^(\d+(?:\.\d)?)(?:–(\d+(?:\.\d)?))?$/.exec(j.salaryBand?.trim() ?? "");
  const lakh = (s: string) => Math.round(Number(s) * 100_000);
  const remote = j.workMode === "Remote";
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: j.role,
    description: [
      j.description,
      ...(j.duties ?? []).map((d) => `• ${d.item}`),
      ...(j.needs ?? []).map((n) => `• ${n.item}`),
    ].join("\n"),
    datePosted: j.postedAt ?? j.createdAt,
    validThrough: j.closesAt,
    url,
    ...(j.jobType && EMPLOYMENT[j.jobType] ? { employmentType: EMPLOYMENT[j.jobType] } : {}),
    hiringOrganization: {
      "@type": "Organization",
      name: about.name,
      ...(about.sameAs ? { sameAs: about.sameAs } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: city,
        ...(region ? { addressRegion: region } : {}),
        addressCountry: "IN",
      },
    },
    ...(remote
      ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "India" } }
      : {}),
    ...(band?.[1]
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "INR",
            value: {
              "@type": "QuantitativeValue",
              minValue: lakh(band[1]),
              maxValue: lakh(band[2] ?? band[1]),
              unitText: "YEAR",
            },
          },
        }
      : {}),
    ...(j.skills?.length ? { skills: j.skills.join(", ") } : {}),
    directApply: false,
  };
}
