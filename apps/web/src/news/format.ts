import { ARTICLE_TYPES } from "../cms/types";

// Pure newsroom formatting (step 5.3): India time, eyebrows and labels. No CMS access, so it is unit-tested on its own.

const IST = "Asia/Kolkata";
const ist = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: IST, ...opts }).format(new Date(iso));

/** "10 Nov 2026" */
export const dayMonthYear = (iso: string) => ist(iso, { day: "numeric", month: "short", year: "numeric" });
/** "17:45" */
export const clock = (iso: string) => ist(iso, { hour: "2-digit", minute: "2-digit", hour12: false });
/** "2:42 PM" */
export const clock12 = (iso: string) =>
  ist(iso, { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase().replace(/\s+/g, " ");
/** "Tue 10 Nov" */
export const weekdayDay = (iso: string) =>
  ist(iso, { weekday: "short", day: "numeric", month: "short" }).replace(",", "");
/** The IST calendar day, for grouping ("2026-11-10"). */
export const istDayKey = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );

export const typeLabel = (type: string) => ARTICLE_TYPES.find((t) => t.value === type)?.label ?? type;

/** A section's short name for eyebrows: "Policy & regulation" → "Policy". */
export const shortName = (name: string) => name.split(" & ")[0] ?? name;

/** What an eyebrow needs to know about a story. */
export interface EyebrowStory {
  kind: "article" | "guide";
  type: string;
  typeLabel: string;
  level: string | null;
  issuer: string | null;
  section: { name: string; slug: string } | null;
  publishedAt: string;
}

/** The eyebrow on cards: the type for analysis, explainers and the like, the section for news ("POLICY · 8 NOV 2026"). */
export function eyebrow(a: EyebrowStory, opts: { fullSection?: boolean } = {}): string {
  const date = dayMonthYear(a.publishedAt);
  if (a.type === "press_release" && a.issuer) return `${a.issuer} · ${date}`;
  if (a.kind === "guide" || a.type !== "news") return `${a.typeLabel}${a.level ? ` · ${a.level}` : ""} · ${date}`;
  const section = a.section ? (opts.fullSection ? a.section.name : shortName(a.section.name)) : "News";
  return `${section} · ${date}`;
}
