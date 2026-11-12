import type { HelpArticle } from "../payload-types";

// Pure helpers for the step 5.8 pages, unit-tested in views.test.ts.

type Searchable = Pick<HelpArticle, "title" | "intro" | "category" | "keywords" | "sections">;

/** Help search (763:40134): every word must appear in the title, intro, keywords or category. */
export function searchHelp<T extends Searchable>(articles: T[], q: string): T[] {
  const words = q
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9₹-]/g, ""))
    .filter((w) => w.length > 1);
  if (!words.length) return [];
  return articles.filter((a) => {
    const hay = [a.title, a.intro, a.category, ...(a.keywords ?? []), ...(a.sections ?? []).map((s) => s.heading)]
      .join(" ")
      .toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

const IST_DAY = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const IST_TIME = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

/** "10 Nov 2026" */
export const istDay = (d: Date | string) => IST_DAY.format(new Date(d));
/** "10 Nov 2026, 9:40 PM" */
export const istDayTime = (d: Date | string) => `${istDay(d)}, ${IST_TIME.format(new Date(d)).toUpperCase()}`;

/** Initials for the team cards (66:3923): "Aditi Deshpande" → "AD". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}
