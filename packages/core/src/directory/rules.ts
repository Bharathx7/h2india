// The company directory (step 6.6; 477:40, phones 480:8, map 478:708): pure filtering, counts and paging over the
// public company documents, so the list and the map show the same companies (DONE WHEN) and tests need no database.

export const DIRECTORY_TYPES = [
  { key: "manufacturer", label: "Manufacturers", words: ["manufacturer"] },
  { key: "supplier", label: "Suppliers & traders", words: ["supplier", "trader", "distributor"] },
  { key: "epc", label: "EPC", words: ["epc", "integrator"] },
  { key: "developer", label: "Developers & producers", words: ["developer", "producer"] },
  { key: "service", label: "Services", words: ["service"] },
  { key: "testing", label: "Testing & certification", words: ["testing", "certification", "lab"] },
  { key: "startup", label: "Start-ups", words: ["start-up", "startup"] },
  { key: "research", label: "Research", words: ["research"] },
] as const;
export type DirectoryType = (typeof DIRECTORY_TYPES)[number]["key"];

export interface DirectoryEntry {
  id: string;
  name: string;
  href: string;
  initials: string;
  types: string[];
  categories: string[];
  summary: string;
  city: string;
  state: string;
  verified: boolean;
  claimStatus: string;
}

export interface DirectoryQuery {
  q: string;
  type: DirectoryType | "";
  states: string[];
  tech: string[];
  verified: boolean;
  sort: "relevance" | "name";
  view: "list" | "map";
  page: number;
  perPage: number;
}

type Params = Record<string, string | string[] | undefined>;
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const one = (v: string | string[] | undefined) => all(v)[0] ?? "";

export const DIRECTORY_PER_PAGE = 12;

export function parseDirectory(params: Params): DirectoryQuery {
  const type = DIRECTORY_TYPES.find((t) => t.key === one(params.type))?.key ?? "";
  return {
    q: one(params.q).trim().slice(0, 100),
    type,
    states: all(params.state).slice(0, 40),
    tech: all(params.tech).slice(0, 40),
    verified: one(params.verified) === "1",
    sort: one(params.sort) === "name" ? "name" : "relevance",
    view: one(params.view) === "map" ? "map" : "list",
    page: Math.max(1, Math.min(500, Math.floor(Number(one(params.page)) || 1))),
    perPage: DIRECTORY_PER_PAGE,
  };
}

export function directorySearch(q: DirectoryQuery, change: Partial<DirectoryQuery> = {}): string {
  const n = { ...q, ...change };
  const out = new URLSearchParams();
  if (n.q) out.append("q", n.q);
  if (n.type) out.append("type", n.type);
  for (const s of n.states) out.append("state", s);
  for (const t of n.tech) out.append("tech", t);
  if (n.verified) out.append("verified", "1");
  if (n.sort !== "relevance") out.append("sort", n.sort);
  if (n.view !== "list") out.append("view", n.view);
  if (n.page > 1) out.append("page", String(n.page));
  const s = out.toString();
  return s ? `?${s}` : "";
}

export const isType = (e: DirectoryEntry, type: DirectoryType) => {
  const words = DIRECTORY_TYPES.find((t) => t.key === type)?.words ?? [];
  return e.types.some((t) => words.some((w) => t.toLowerCase().includes(w)));
};

/** The eyebrow on the card (477:324), for example "Manufacturer" or "Developer & producer". */
export function typeLabel(e: DirectoryEntry): string {
  return e.types[0] ?? "";
}

type Group = "type" | "state" | "tech" | "verified";

function passes(e: DirectoryEntry, q: DirectoryQuery, except?: Group): boolean {
  if (q.q) {
    const hay = [e.name, e.summary, ...e.categories, ...e.types, e.city, e.state].join(" ").toLowerCase();
    if (
      !q.q
        .toLowerCase()
        .split(/\s+/)
        .every((w) => hay.includes(w))
    )
      return false;
  }
  if (except !== "type" && q.type && !isType(e, q.type)) return false;
  if (except !== "state" && q.states.length && !q.states.includes(e.state)) return false;
  if (except !== "tech" && q.tech.length && !q.tech.some((t) => e.categories.includes(t))) return false;
  if (except !== "verified" && q.verified && !e.verified) return false;
  return true;
}

export interface DirectoryResult {
  items: DirectoryEntry[];
  /** Every match, for the map: the list and the map always show the same companies. */
  all: DirectoryEntry[];
  total: number;
  facets: {
    types: { key: DirectoryType; label: string; count: number }[];
    states: { value: string; count: number }[];
    tech: { value: string; count: number }[];
    verified: number;
  };
}

export function filterDirectory(entries: DirectoryEntry[], q: DirectoryQuery): DirectoryResult {
  const matching = entries.filter((e) => passes(e, q));
  const count = (except: Group, test: (e: DirectoryEntry) => boolean) =>
    entries.filter((e) => passes(e, q, except) && test(e)).length;
  const values = (pick: (e: DirectoryEntry) => string[]) => [...new Set(entries.flatMap(pick).filter(Boolean))].sort();
  const sorted = [...matching].sort((a, b) =>
    q.sort === "name"
      ? a.name.localeCompare(b.name, "en-IN")
      : Number(b.verified) - Number(a.verified) || a.name.localeCompare(b.name, "en-IN"),
  );
  const start = (q.page - 1) * q.perPage;
  return {
    items: sorted.slice(start, start + q.perPage),
    all: sorted,
    total: matching.length,
    facets: {
      types: DIRECTORY_TYPES.map((t) => ({
        key: t.key,
        label: t.label,
        count: count("type", (e) => isType(e, t.key)),
      })),
      states: values((e) => [e.state])
        .map((value) => ({ value, count: count("state", (e) => e.state === value) }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
      tech: values((e) => e.categories)
        .map((value) => ({ value, count: count("tech", (e) => e.categories.includes(value)) }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
      verified: count("verified", (e) => e.verified),
    },
  };
}

/** Companies grouped by state, for the map's list alternative (and the map itself until a vendor is chosen, M7). */
export function byState(entries: DirectoryEntry[]): { state: string; entries: DirectoryEntry[] }[] {
  const groups = new Map<string, DirectoryEntry[]>();
  for (const e of entries) {
    const key = e.state || "State not given";
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()]
    .map(([state, list]) => ({ state, entries: list }))
    .sort((a, b) => b.entries.length - a.entries.length || a.state.localeCompare(b.state));
}
