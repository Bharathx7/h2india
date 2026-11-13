import { schema, type Executor } from "@h2india/db";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { effectiveSchema } from "../catalogue/taxonomy";
import { productHref } from "./listing";
import { COMPARE_LIMIT, formatValue, leadTimeLabel } from "./rules";
import { supplierNotSuspended } from "./suspension";

// Compare (step 6.5; 91:9, phones 98:3084): up to COMPARE_LIMIT live products of one category side by side. Rows are
// the category's comparable attributes by display group, then Supply (lead time, certificates, how to buy, ships from).
// Never a price. Products from different categories get the designed guidance instead of a broken table.

export interface CompareColumn {
  id: string;
  slug: string;
  href: string;
  name: string;
  supplier: string;
  verified: boolean;
}

export interface CompareRow {
  label: string;
  values: string[];
  /** The values aren't all the same ("Show only differences"). */
  differs: boolean;
}

export type CompareResult =
  | { kind: "empty" }
  | { kind: "mixed"; categories: string[] }
  | {
      kind: "ok";
      category: { label: string; href: string };
      classLabel: string;
      columns: CompareColumn[];
      groups: { group: string; rows: CompareRow[] }[];
    };

/** Missing values say so instead of a blank (Doc 1 §9.4). */
export const NOT_PROVIDED = "Not provided";

const row = (label: string, values: string[]): CompareRow => ({
  label,
  values,
  differs: new Set(values).size > 1,
});

export async function compareProducts(
  db: Executor,
  ids: string[],
  opts: { includeSample: boolean; transactions: boolean },
): Promise<CompareResult> {
  const wanted = [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, COMPARE_LIMIT);
  if (!wanted.length) return { kind: "empty" };
  const p = schema.products;
  const cat = schema.catalogueCategories;
  const rows = await db
    .select({
      p,
      cat,
      supplier: schema.companyProfiles.tradeName,
      city: schema.companyProfiles.city,
      state: schema.organisations.state,
      verification: schema.organisations.verification,
      klass: schema.catalogueClasses.label,
    })
    .from(p)
    .innerJoin(cat, eq(cat.id, p.categoryId))
    .innerJoin(schema.catalogueClasses, eq(schema.catalogueClasses.id, cat.classId))
    .innerJoin(schema.organisations, eq(schema.organisations.id, p.organisationId))
    .innerJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, p.organisationId))
    .where(
      and(inArray(p.id, wanted), eq(p.status, "Live"), isNull(p.deletedAt), supplierNotSuspended(p.organisationId)),
    );
  const live = rows.filter((r) => opts.includeSample || !r.p.sample);
  if (!live.length) return { kind: "empty" };
  // Compare within one category: a sub-category counts as its parent category.
  const topOf = (r: (typeof live)[number]) => r.cat.parentId ?? r.cat.id;
  const tops = [...new Set(live.map(topOf))];
  const topRows = await db.select().from(cat).where(inArray(cat.id, tops));
  if (tops.length > 1) return { kind: "mixed", categories: topRows.map((c) => c.label) };
  const top = topRows[0];
  if (!top) return { kind: "empty" };
  const ordered = wanted
    .map((id) => live.find((r) => r.p.id === id))
    .filter((r): r is (typeof live)[number] => Boolean(r));

  // The schema of the category, plus any sub-category's own comparable attributes.
  const schemas = await Promise.all(
    [...new Set(ordered.map((r) => r.cat.id))].map((id) => effectiveSchema(db, id, opts)),
  );
  const defs = [
    ...new Map(
      schemas
        .flat()
        .filter((d) => d.comparable)
        .map((d) => [d.key, d]),
    ).values(),
  ];
  const groups: { group: string; rows: CompareRow[] }[] = [];
  for (const d of defs) {
    const values = ordered.map((r) => formatValue(d, r.p.attributes[d.key]) ?? NOT_PROVIDED);
    const g = groups.find((x) => x.group === d.displayGroup) ?? { group: d.displayGroup, rows: [] };
    if (!groups.includes(g)) groups.push(g);
    g.rows.push(row(d.label, values));
  }
  if (ordered.some((r) => r.cat.parentId)) {
    groups.unshift({
      group: "Type",
      rows: [
        row(
          "Technology",
          ordered.map((r) => (r.cat.parentId ? r.cat.label : NOT_PROVIDED)),
        ),
      ],
    });
  }
  groups.push({
    group: "Supply",
    rows: [
      row(
        "Lead time",
        ordered.map((r) => leadTimeLabel(r.p.leadTimeMinWeeks, r.p.leadTimeMaxWeeks) ?? NOT_PROVIDED),
      ),
      row(
        "Certificates",
        ordered.map((r) => r.p.certifications.join(", ") || NOT_PROVIDED),
      ),
      // How to buy, never the price itself (step 6.5: compare never shows price).
      row(
        "How to buy",
        ordered.map((r) => (r.p.pricing === "fixed" && opts.transactions ? "Buy now or quote" : "Quote only")),
      ),
      row(
        "Ships from",
        ordered.map((r) => [r.city, r.state].filter(Boolean).join(", ") || NOT_PROVIDED),
      ),
    ],
  });
  return {
    kind: "ok",
    category: { label: top.label, href: `/marketplace/${top.classId}/${top.slug}` },
    classLabel: ordered[0]?.klass ?? "",
    columns: ordered.map((r) => ({
      id: r.p.id,
      slug: r.p.slug,
      href: productHref(r.p.slug),
      name: r.p.name,
      supplier: r.supplier,
      verified: r.verification === "Verified",
    })),
    groups,
  };
}

/** A signed-in person's compare selection, so it follows them to another browser. */
export async function saveCompareList(db: Executor, userId: string, productIds: string[]): Promise<void> {
  const ids = [...new Set(productIds)].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, COMPARE_LIMIT);
  await db
    .insert(schema.compareLists)
    .values({ userId, productIds: ids })
    .onConflictDoUpdate({ target: schema.compareLists.userId, set: { productIds: ids, updatedAt: sql`now()` } });
}

export async function getCompareList(db: Executor, userId: string): Promise<string[]> {
  const [row] = await db.select().from(schema.compareLists).where(eq(schema.compareLists.userId, userId)).limit(1);
  return row?.productIds ?? [];
}
