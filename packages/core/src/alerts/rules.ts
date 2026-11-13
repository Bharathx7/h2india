import { STATES } from "../members/rules";

// What an alert can watch and how it reads (step 7.3; Alerts 534:8, Create alert 534:587, Watch a category 275:23289).
// Pure, so the modal, the pages and the engine share one list. Filters are built into search filter expressions only
// here, from fields each index allows, with values quoted, so a stored alert can never inject a filter.

export const ALERT_TYPES = {
  tenders: {
    label: "Tenders",
    one: "tender",
    many: "tenders",
    icon: "file-text",
    stateField: "states",
    all: "/opportunities/tenders",
    view: "View tender",
  },
  schemes: {
    label: "Schemes and calls",
    one: "scheme",
    many: "schemes",
    icon: "clipboard-check",
    stateField: "states",
    all: "/opportunities/schemes",
    view: "View scheme",
  },
  grants: {
    label: "Grants",
    one: "grant",
    many: "grants",
    icon: "zap",
    stateField: "states",
    all: "/opportunities/grants",
    view: "View grant",
  },
  jobs: {
    label: "Jobs",
    one: "job",
    many: "jobs",
    icon: "users",
    stateField: null,
    all: "/opportunities/jobs",
    view: "View job",
  },
  articles: {
    label: "News",
    one: "article",
    many: "articles",
    icon: "newspaper",
    stateField: null,
    all: "/news",
    view: "Read",
  },
  events: {
    label: "Events",
    one: "event",
    many: "events",
    icon: "calendar",
    stateField: "states",
    all: "/events",
    view: "View event",
  },
  products: {
    label: "Products",
    one: "product",
    many: "products",
    icon: "package",
    stateField: "state",
    all: "/marketplace",
    view: "View product",
  },
} as const;

export type AlertType = keyof typeof ALERT_TYPES;
export const ALERT_TYPE_IDS = Object.keys(ALERT_TYPES) as AlertType[];
export const isAlertType = (v: string): v is AlertType => v in ALERT_TYPES;

/** Fields a stored alert may filter on, per index (a subset of the index's filterable fields). */
export const ALERT_FILTER_FIELDS: Record<AlertType, readonly string[]> = {
  // id: an alert on one record ("Track tender" 457:3222, "Don't miss the next round" 421:5274).
  tenders: ["states", "topics", "id"],
  schemes: ["states", "topics", "whoCanApply", "level", "id"],
  grants: ["states", "themes", "whoCanApply", "id"],
  jobs: ["workMode", "experience", "location"],
  articles: ["topics", "type"],
  events: ["states", "format"],
  products: ["class", "category", "badges", "state"],
};

/** The Create alert modal's frequency choices (534:587) and Watch a category's (275:23289). */
export const FREQUENCIES = [
  { value: "instant", label: "Instant", digest: "Instant" },
  { value: "daily", label: "Daily digest", digest: "Daily digest" },
  { value: "weekly", label: "Weekly digest", digest: "Weekly digest · Monday morning" },
] as const;

export const CHANNEL_WORDS: Record<string, string> = { email: "email", whatsapp: "WhatsApp", inapp: "in-app" };

/** States a member can pick, without "All of India" (which means no state filter). */
export const ALERT_STATES = STATES.filter((s) => s !== "All of India");

const quote = (v: string) => JSON.stringify(v.slice(0, 120));

/** The search filter for an alert: one OR group per field, fields ANDed. Unknown fields and empty lists are dropped. */
export function filterExpression(type: AlertType, filters: Record<string, string[]>): string[] {
  const allowed = ALERT_FILTER_FIELDS[type];
  return Object.entries(filters)
    .filter(([field, values]) => allowed.includes(field) && Array.isArray(values) && values.length)
    .map(
      ([field, values]) =>
        `(${values
          .slice(0, 20)
          .map((v) => `${field} = ${quote(v)}`)
          .join(" OR ")})`,
    );
}

/** The chips under an alert's name (534:8): the filter values, or All of India when it has no state filter. */
export function alertChips(type: AlertType, filters: Record<string, string[]>): string[] {
  if (filters.id?.length) return [`This ${ALERT_TYPES[type].one} only`];
  const chips = Object.entries(filters)
    .filter(([f]) => ALERT_FILTER_FIELDS[type].includes(f))
    .flatMap(([, v]) => v);
  const stateField = ALERT_TYPES[type].stateField;
  if (stateField && !filters[stateField]?.length) chips.push("All of India");
  return chips;
}

/** "Daily · email", "Instant · WhatsApp", "Weekly · email and in-app" (534:8). */
export function deliveryWords(frequency: string, channels: string[]): string {
  const f = { instant: "Instant", daily: "Daily", weekly: "Weekly" }[frequency] ?? "Weekly";
  const words = channels.map((c) => CHANNEL_WORDS[c] ?? c);
  const list = words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1) ?? ""}` : (words[0] ?? "email");
  return `${f} · ${list}`;
}

/** "Tenders · Electrolysers + EPC" when the member doesn't name it. */
export function defaultAlertLabel(type: AlertType, query: string): string {
  const words = query.trim().split(/\s+/).filter(Boolean);
  const label = ALERT_TYPES[type].label;
  return words.length
    ? `${label} · ${words.map((w) => `${w.charAt(0).toUpperCase()}${w.slice(1)}`).join(" + ")}`
    : label;
}

/** "5 tenders" */
export function countWords(type: AlertType, n: number): string {
  return `${String(n)} ${n === 1 ? ALERT_TYPES[type].one : ALERT_TYPES[type].many}`;
}
