import { schema, type Executor } from "@h2india/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { productDocument, type SearchDocument } from "./documents";
import { queueIndexChange } from "./outbox";
import { supplierNotSuspended } from "../products/suspension";

// Product search documents (A142, Doc 2 AC-SR-2): live products in visible categories. Built only through
// productDocument(), which keeps the allowed fields and throws on anything price-like, so search never holds a price.
// Attribute values go under `attributes`, which the products index already filters on.

export async function productSearchDocuments(
  db: Executor,
  opts: { includeSample: boolean; ids?: string[] },
): Promise<SearchDocument[]> {
  if (opts.ids && !opts.ids.length) return [];
  const p = schema.products;
  const cat = schema.catalogueCategories;
  const rows = await db
    .select({
      p,
      cat,
      klass: schema.catalogueClasses.label,
      supplier: schema.companyProfiles.tradeName,
      state: schema.organisations.state,
      verification: schema.organisations.verification,
    })
    .from(p)
    .innerJoin(cat, eq(cat.id, p.categoryId))
    .innerJoin(schema.catalogueClasses, eq(schema.catalogueClasses.id, cat.classId))
    .innerJoin(schema.organisations, eq(schema.organisations.id, p.organisationId))
    .innerJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, p.organisationId))
    .where(
      and(
        eq(p.status, "Live"),
        supplierNotSuspended(p.organisationId),
        isNull(p.deletedAt),
        isNull(cat.deletedAt),
        isNull(cat.hiddenAt),
        opts.ids ? inArray(p.id, opts.ids) : undefined,
      ),
    );
  const parentIds = [...new Set(rows.map((r) => r.cat.parentId).filter((x): x is string => Boolean(x)))];
  const parents = parentIds.length ? await db.select().from(cat).where(inArray(cat.id, parentIds)) : [];
  return rows
    .filter(
      (r) =>
        (opts.includeSample || !r.p.sample) &&
        (!r.cat.parentId || parents.some((x) => x.id === r.cat.parentId && !x.hiddenAt && !x.deletedAt)),
    )
    .map((r) => {
      const parent = parents.find((x) => x.id === r.cat.parentId);
      const category = parent?.label ?? r.cat.label;
      return productDocument({
        id: r.p.id,
        title: r.p.name,
        meta: [r.klass, category, r.supplier].join(" · "),
        href: `/marketplace/products/${r.p.slug}`,
        name: r.p.name,
        brand: r.p.brand ?? undefined,
        model: r.p.model ?? undefined,
        class: r.cat.classId,
        category,
        categoryPath: [r.klass, category, parent ? r.cat.label : null].filter(Boolean).join(" › "),
        applications: r.p.applicationIds,
        attributes: r.p.attributes,
        badges: r.verification === "Verified" ? ["verified"] : [],
        state: r.state ?? undefined,
        madeInIndia: r.p.madeInIndia,
        supplierName: r.supplier,
        summary: r.p.summary ?? undefined,
        publishedAt: r.p.publishedAt?.toISOString(),
      });
    });
}

/**
 * Queues the products whose search documents change with a category (hidden, shown, renamed, moved, with its
 * sub-categories) or a supplier (renamed), in the caller's transaction (CLAUDE.md, step 5.2).
 */
export async function queueProductsOf(
  tx: Executor,
  scope: { categoryIds?: string[]; organisationIds?: string[] },
): Promise<void> {
  const p = schema.products;
  const cat = schema.catalogueCategories;
  const ids = new Set<string>();
  if (scope.categoryIds?.length) {
    const children = await tx.select({ id: cat.id }).from(cat).where(inArray(cat.parentId, scope.categoryIds));
    const all = [...scope.categoryIds, ...children.map((c) => c.id)];
    for (const r of await tx.select({ id: p.id }).from(p).where(inArray(p.categoryId, all))) ids.add(r.id);
  }
  if (scope.organisationIds?.length) {
    for (const r of await tx.select({ id: p.id }).from(p).where(inArray(p.organisationId, scope.organisationIds)))
      ids.add(r.id);
  }
  if (ids.size) await queueIndexChange(tx, "products", [...ids]);
}
