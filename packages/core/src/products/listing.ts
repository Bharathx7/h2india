import { schema, type Executor } from "@h2india/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { AttributeDef } from "../catalogue/attributes";
import { cardChips, formatValue, leadTimeLabel, type ListingQuery } from "./rules";

// Category listings (step 6.3, 392:4896, 392:5787). Live products of a category (and its sub-categories), filtered
// by the URL query, with a count beside every filter value. The database is the truth: filters and counts are worked
// out here, not in the search engine (A114), which is plenty for launch volumes. Nothing here ever reads a price.

export interface ProductCard {
  id: string;
  slug: string;
  href: string;
  name: string;
  variant: string | null;
  categoryLabel: string;
  subLabel: string | null;
  supplier: { name: string; href: string; verified: boolean };
  chips: string[];
  leadTime: string | null;
  /** Comparable attributes, shown as table columns (392:5787), by key. */
  values: Record<string, string | null>;
}

export interface ListingFacets {
  sub: { slug: string; label: string; count: number }[];
  choices: Record<string, { value: string; count: number }[]>;
  certifications: { value: string; count: number }[];
  states: string[];
  verified: number;
  madeInIndia: number;
}

export interface ListingResult {
  items: ProductCard[];
  total: number;
  facets: ListingFacets;
}

export interface ListingScope {
  /** The category and its visible sub-categories (when on a sub-category page, only it). */
  categories: { id: string; slug: string; label: string; parentId: string | null }[];
  defs: AttributeDef[];
  includeSample: boolean;
}

interface Row {
  id: string;
  slug: string;
  name: string;
  variant: string | null;
  categoryId: string;
  attributes: Record<string, unknown>;
  certifications: string[];
  leadMin: number | null;
  leadMax: number | null;
  madeInIndia: boolean;
  publishedAt: Date | null;
  supplierName: string;
  supplierSlug: string;
  supplierState: string | null;
  verified: boolean;
}

export const productHref = (slug: string) => `/marketplace/products/${slug}`;

async function liveRows(db: Executor, scope: ListingScope): Promise<Row[]> {
  const p = schema.products;
  const cp = schema.companyProfiles;
  const org = schema.organisations;
  const ids = scope.categories.map((c) => c.id);
  if (!ids.length) return [];
  const rows = await db
    .select({
      id: p.id,
      slug: p.slug,
      name: p.name,
      variant: p.variant,
      categoryId: p.categoryId,
      attributes: p.attributes,
      certifications: p.certifications,
      leadMin: p.leadTimeMinWeeks,
      leadMax: p.leadTimeMaxWeeks,
      madeInIndia: p.madeInIndia,
      publishedAt: p.publishedAt,
      sample: p.sample,
      supplierName: cp.tradeName,
      supplierSlug: cp.slug,
      supplierState: org.state,
      verification: org.verification,
    })
    .from(p)
    .innerJoin(org, eq(org.id, p.organisationId))
    .innerJoin(cp, eq(cp.organisationId, p.organisationId))
    .where(and(inArray(p.categoryId, ids), eq(p.status, "Live"), isNull(p.deletedAt)));
  return rows
    .filter((r) => scope.includeSample || !r.sample)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      variant: r.variant,
      categoryId: r.categoryId,
      attributes: r.attributes,
      certifications: r.certifications,
      leadMin: r.leadMin,
      leadMax: r.leadMax,
      madeInIndia: r.madeInIndia,
      publishedAt: r.publishedAt,
      supplierName: r.supplierName,
      supplierSlug: r.supplierSlug,
      supplierState: r.supplierState,
      verified: r.verification === "Verified",
    }));
}

const numberOf = (v: unknown, end: "min" | "max"): number | null => {
  if (typeof v === "number") return v;
  if (v && typeof v === "object") {
    const r = v as { min?: unknown; max?: unknown };
    const n = r[end];
    return typeof n === "number" ? n : null;
  }
  return null;
};

type Group = "sub" | "cert" | "verified" | "india" | "state" | "lead" | `a.${string}` | `r.${string}`;

/** Whether a product passes the query, leaving out one group (so a group's counts ignore its own choices). */
function passes(r: Row, q: ListingQuery, slugOf: Map<string, string>, except?: Group): boolean {
  if (except !== "sub" && q.sub.length && !q.sub.includes(slugOf.get(r.categoryId) ?? "")) return false;
  for (const [key, chosen] of Object.entries(q.choices)) {
    if (except === `a.${key}`) continue;
    const v = r.attributes[key];
    const as = typeof v === "boolean" ? (v ? "yes" : "no") : typeof v === "string" ? v : null;
    if (as === null || !chosen.includes(as)) return false;
  }
  for (const [key, range] of Object.entries(q.ranges)) {
    if (except === `r.${key}`) continue;
    const lo = numberOf(r.attributes[key], "min");
    const hi = numberOf(r.attributes[key], "max");
    if (lo === null || hi === null) return false;
    // A range value passes when it overlaps the asked range.
    if (range.min !== undefined && hi < range.min) return false;
    if (range.max !== undefined && lo > range.max) return false;
  }
  if (except !== "cert" && q.certifications.length && !q.certifications.every((c) => r.certifications.includes(c))) {
    return false;
  }
  if (except !== "verified" && q.verified && !r.verified) return false;
  if (except !== "india" && q.madeInIndia && !r.madeInIndia) return false;
  if (except !== "state" && q.state && r.supplierState !== q.state) return false;
  if (except !== "lead" && q.leadWeeks !== null && (r.leadMax ?? r.leadMin ?? Infinity) > q.leadWeeks) return false;
  return true;
}

function sortRows(rows: Row[], q: ListingQuery): Row[] {
  const byName = (a: Row, b: Row) => a.name.localeCompare(b.name, "en-IN");
  const newest = (a: Row, b: Row) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  const lead = (r: Row) => r.leadMin ?? r.leadMax ?? Number.POSITIVE_INFINITY;
  const sorted = [...rows];
  if (q.sort === "name") return sorted.sort(byName);
  if (q.sort === "newest") return sorted.sort((a, b) => newest(a, b) || byName(a, b));
  if (q.sort === "lead-time") return sorted.sort((a, b) => lead(a) - lead(b) || byName(a, b));
  // Relevance: verified suppliers first, then newest. Never by payment.
  return sorted.sort((a, b) => Number(b.verified) - Number(a.verified) || newest(a, b) || byName(a, b));
}

export async function listProducts(db: Executor, scope: ListingScope, q: ListingQuery): Promise<ListingResult> {
  const rows = await liveRows(db, scope);
  const slugOf = new Map(scope.categories.map((c) => [c.id, c.slug]));
  const labelOf = new Map(scope.categories.map((c) => [c.id, c]));
  const matching = rows.filter((r) => passes(r, q, slugOf));
  const count = (except: Group, test: (r: Row) => boolean) =>
    rows.filter((r) => passes(r, q, slugOf, except) && test(r)).length;

  const choiceDefs = scope.defs.filter((d) => d.filterable && (d.type === "choice" || d.type === "boolean"));
  const facets: ListingFacets = {
    sub: scope.categories
      .filter((c) => c.parentId !== null)
      .map((c) => ({ slug: c.slug, label: c.label, count: count("sub", (r) => r.categoryId === c.id) })),
    choices: Object.fromEntries(
      choiceDefs.map((d) => [
        d.key,
        (d.type === "boolean" ? ["yes", "no"] : d.options).map((value) => ({
          value,
          count: count(`a.${d.key}`, (r) => {
            const v = r.attributes[d.key];
            return d.type === "boolean" ? (v === true ? "yes" : v === false ? "no" : null) === value : v === value;
          }),
        })),
      ]),
    ),
    certifications: [...new Set(rows.flatMap((r) => r.certifications))]
      .sort()
      .map((value) => ({ value, count: count("cert", (r) => r.certifications.includes(value)) })),
    states: [...new Set(rows.map((r) => r.supplierState).filter((s): s is string => Boolean(s)))].sort(),
    verified: count("verified", (r) => r.verified),
    madeInIndia: count("india", (r) => r.madeInIndia),
  };

  const sorted = sortRows(matching, q);
  const start = (q.page - 1) * q.perPage;
  const comparable = scope.defs.filter((d) => d.comparable);
  const items = sorted.slice(start, start + q.perPage).map((r): ProductCard => {
    const cat = labelOf.get(r.categoryId);
    const parent = cat?.parentId ? labelOf.get(cat.parentId) : undefined;
    return {
      id: r.id,
      slug: r.slug,
      href: productHref(r.slug),
      name: r.name,
      variant: r.variant,
      categoryLabel: parent?.label ?? cat?.label ?? "",
      subLabel: parent ? (cat?.label ?? null) : null,
      supplier: { name: r.supplierName, href: `/directory/companies/${r.supplierSlug}`, verified: r.verified },
      chips: cardChips(scope.defs, r.attributes, r.certifications),
      leadTime: leadTimeLabel(r.leadMin, r.leadMax),
      values: Object.fromEntries(comparable.map((d) => [d.key, formatValue(d, r.attributes[d.key])])),
    };
  });
  return { items, total: matching.length, facets };
}
