import { formatNumber, type AttributeDef } from "../catalogue/attributes";

// Product rules (steps 6.3 and 6.4). Pure, so pages, the browser and tests share them.

export const PRODUCT_STATUSES = ["Draft", "In review", "Live", "Paused"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_TRANSITIONS: Record<ProductStatus, readonly ProductStatus[]> = {
  Draft: ["In review"],
  "In review": ["Live", "Draft"],
  Live: ["Paused"],
  Paused: ["Live", "Draft"],
};

/** Where a price could appear. Only the product page of a fixed-price item may show one (playbook step 6.4). */
export type PriceSurface = "pdp" | "card" | "search" | "filter" | "compare" | "listing-table";

export function canShowPrice(input: {
  surface: PriceSurface;
  pricing: string;
  price?: bigint | number | null;
}): boolean {
  return (
    input.surface === "pdp" &&
    input.pricing === "fixed" &&
    input.price !== null &&
    input.price !== undefined &&
    Number(input.price) > 0
  );
}

/** Products in one comparison (step 6.5): 5, as the compare frames say ("You can compare up to 5", 91:9); A116. */
export const COMPARE_LIMIT = 5;

// ----------------------------------------------------------------------------- listing query (step 6.3)

export const SORTS = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "lead-time", label: "Shortest lead time" },
  { value: "name", label: "Name A–Z" },
] as const;
export type Sort = (typeof SORTS)[number]["value"];

export const PER_PAGE = [24, 48] as const;

/** Lead time filter (392:5007 "Any lead time"). */
export const LEAD_TIMES = [
  { value: "4", label: "Up to 4 weeks" },
  { value: "8", label: "Up to 8 weeks" },
  { value: "12", label: "Up to 12 weeks" },
  { value: "16", label: "Up to 16 weeks" },
  { value: "26", label: "Up to 26 weeks" },
] as const;

export interface ListingQuery {
  /** Sub-category slugs (the Technology group on a category page). */
  sub: string[];
  /** Choice and yes-or-no attributes: key → chosen values. */
  choices: Record<string, string[]>;
  /** Number and range attributes: key → min and max. */
  ranges: Record<string, { min?: number; max?: number }>;
  certifications: string[];
  verified: boolean;
  madeInIndia: boolean;
  state: string;
  leadWeeks: number | null;
  sort: Sort;
  view: "grid" | "table";
  page: number;
  perPage: number;
}

type Params = Record<string, string | string[] | undefined>;
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const one = (v: string | string[] | undefined) => all(v)[0] ?? "";
const num = (v: string) => {
  if (!v.trim()) return undefined;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Reads the address (step 6.3: filters, sort and page live in the URL so a shared link shows the same view). Only
 * filterable attributes of the category count; anything else in the address is ignored.
 *   ?sub=pem&a.lubrication=Oil-free&min.flow_rate=100&max.flow_rate=500&cert=ISO 22734&verified=1&india=1
 *   &state=Maharashtra&lead=12&sort=lead-time&view=table&page=2&per=48
 */
export function parseListing(params: Params, defs: readonly AttributeDef[]): ListingQuery {
  const choices: ListingQuery["choices"] = {};
  const ranges: ListingQuery["ranges"] = {};
  for (const d of defs) {
    if (!d.filterable) continue;
    if (d.type === "choice" || d.type === "boolean") {
      const picked = all(params[`a.${d.key}`]).filter((v) =>
        d.type === "boolean" ? v === "yes" || v === "no" : d.options.includes(v),
      );
      if (picked.length) choices[d.key] = picked;
    } else if (d.type === "number" || d.type === "range") {
      const min = num(one(params[`min.${d.key}`]));
      const max = num(one(params[`max.${d.key}`]));
      if (min !== undefined || max !== undefined) ranges[d.key] = { min, max };
    }
  }
  const sort = SORTS.find((s) => s.value === one(params.sort))?.value ?? "relevance";
  const per = Number(one(params.per));
  const lead = LEAD_TIMES.find((l) => l.value === one(params.lead));
  return {
    sub: all(params.sub).filter((s) => /^[a-z0-9-]{1,60}$/.test(s)),
    choices,
    ranges,
    certifications: all(params.cert).slice(0, 20),
    verified: one(params.verified) === "1",
    madeInIndia: one(params.india) === "1",
    state: one(params.state).slice(0, 60),
    leadWeeks: lead ? Number(lead.value) : null,
    sort,
    view: one(params.view) === "table" ? "table" : "grid",
    page: Math.max(1, Math.min(500, Math.floor(Number(one(params.page)) || 1))),
    perPage: (PER_PAGE as readonly number[]).includes(per) ? per : PER_PAGE[0],
  };
}

/** The address for a query: the same order every time, defaults left out, so links are short and stable. */
export function listingSearch(q: ListingQuery, change: Partial<ListingQuery> = {}): string {
  const next = { ...q, ...change };
  const out = new URLSearchParams();
  for (const s of next.sub) out.append("sub", s);
  for (const [k, vs] of Object.entries(next.choices)) for (const v of vs) out.append(`a.${k}`, v);
  for (const [k, r] of Object.entries(next.ranges)) {
    if (r.min !== undefined) out.append(`min.${k}`, String(r.min));
    if (r.max !== undefined) out.append(`max.${k}`, String(r.max));
  }
  for (const c of next.certifications) out.append("cert", c);
  if (next.verified) out.append("verified", "1");
  if (next.madeInIndia) out.append("india", "1");
  if (next.state) out.append("state", next.state);
  if (next.leadWeeks !== null) out.append("lead", String(next.leadWeeks));
  if (next.sort !== "relevance") out.append("sort", next.sort);
  if (next.view !== "grid") out.append("view", next.view);
  if (next.perPage !== PER_PAGE[0]) out.append("per", String(next.perPage));
  if (next.page > 1) out.append("page", String(next.page));
  const s = out.toString();
  return s ? `?${s}` : "";
}

export const hasFilters = (q: ListingQuery) =>
  q.sub.length > 0 ||
  Object.keys(q.choices).length > 0 ||
  Object.keys(q.ranges).length > 0 ||
  q.certifications.length > 0 ||
  q.verified ||
  q.madeInIndia ||
  q.state !== "" ||
  q.leadWeeks !== null;

// ----------------------------------------------------------------------------- showing values

/** "1 MW", "450 kg/day", "30–35 bar", "Oil-free". kW from 1,000 reads as MW, as the frames write it. */
export function formatValue(def: Pick<AttributeDef, "type" | "unit">, value: unknown): string | null {
  const withUnit = (n: number) => {
    if (def.unit === "kW" && n >= 1000) return `${formatNumber(n / 1000)} MW`;
    return def.unit ? `${formatNumber(n)} ${def.unit}` : formatNumber(n);
  };
  if (value === null || value === undefined) return null;
  if (def.type === "number" && typeof value === "number") return withUnit(value);
  if (def.type === "range" && typeof value === "object") {
    const r = value as { min?: number; max?: number };
    if (typeof r.min !== "number" || typeof r.max !== "number") return null;
    return r.min === r.max ? withUnit(r.min) : `${formatNumber(r.min)}–${withUnit(r.max)}`;
  }
  if (def.type === "boolean" && typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return def.unit && def.type === "text" ? `${value} ${def.unit}` : value;
  return null;
}

/** "14–16 weeks", "8 weeks", or null. */
export function leadTimeLabel(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  const lo = min ?? max ?? 0;
  const hi = max ?? min ?? 0;
  return lo === hi ? `${String(lo)} ${lo === 1 ? "week" : "weeks"}` : `${String(lo)}–${String(hi)} weeks`;
}

/** The spec chips on the product card (392:5279): the first two comparable values, then the first certificate. */
export function cardChips(
  defs: readonly AttributeDef[],
  values: Record<string, unknown>,
  certifications: string[],
): string[] {
  const specs = defs
    .filter((d) => d.comparable)
    .map((d) => formatValue(d, values[d.key]))
    .filter((v): v is string => v !== null)
    .slice(0, 2);
  return [...specs, ...certifications.slice(0, 1)];
}
