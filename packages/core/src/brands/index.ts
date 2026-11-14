import { schema, type Database, type Executor } from "@h2india/db";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { effectiveSchema } from "../catalogue/taxonomy";
import { productHref } from "../products/listing";
import { cardChips, leadTimeLabel } from "../products/rules";

// Brands (step 6.5; index 401:11734, brand page 401:12097, no authorised dealer 401:12561). A dealer shows as Verified
// only after an operator has recorded the authorisation letter (recordDealerEvidence, Verification desk) and while the
// letter is still valid; until then the dealer is listed without the badge (A128).

const b = schema.brands;
const d = schema.brandDealers;
const p = schema.products;

export interface BrandSummary {
  slug: string;
  name: string;
  initials: string;
  origin: string;
  liveProducts: number;
  hasDealer: boolean;
  classIds: string[];
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("") || "?";

const today = () => new Date().toISOString().slice(0, 10);
const letterValid = (until: string | null) => until !== null && until >= today();

async function liveProductsOf(db: Executor, brandIds: string[], includeSample: boolean) {
  if (!brandIds.length) return [];
  const rows = await db
    .select({ brandId: p.brandId, sample: p.sample, classId: schema.catalogueCategories.classId })
    .from(p)
    .innerJoin(schema.catalogueCategories, eq(schema.catalogueCategories.id, p.categoryId))
    .where(and(inArray(p.brandId, brandIds), eq(p.status, "Live"), isNull(p.deletedAt)));
  return rows.filter((r) => includeSample || !r.sample);
}

/** The brands index, A–Z, with its filters (search, class, origin, has an authorised dealer in India). */
export async function listBrands(
  db: Executor,
  opts: { includeSample: boolean; q?: string; classId?: string; origin?: string; withDealer?: boolean },
): Promise<{ brands: BrandSummary[]; origins: string[]; total: number }> {
  const all = (await db.select().from(b).where(isNull(b.deletedAt)).orderBy(asc(b.name))).filter(
    (x) => opts.includeSample || !x.sample,
  );
  const [products, dealers] = await Promise.all([
    liveProductsOf(
      db,
      all.map((x) => x.id),
      opts.includeSample,
    ),
    all.length
      ? db
          .select()
          .from(d)
          .where(
            inArray(
              d.brandId,
              all.map((x) => x.id),
            ),
          )
      : Promise.resolve([]),
  ]);
  const summaries = all.map((x) => {
    const mine = products.filter((r) => r.brandId === x.id);
    return {
      slug: x.slug,
      name: x.name,
      initials: initials(x.name),
      origin: x.origin,
      liveProducts: mine.length,
      hasDealer: dealers.some((r) => r.brandId === x.id && r.verifiedAt !== null && letterValid(r.letterValidUntil)),
      classIds: [...new Set(mine.map((r) => r.classId))],
    };
  });
  const q = opts.q?.trim().toLowerCase() ?? "";
  const shown = summaries.filter(
    (x) =>
      (!q || x.name.toLowerCase().includes(q)) &&
      (!opts.classId || x.classIds.includes(opts.classId)) &&
      (!opts.origin || x.origin === opts.origin) &&
      (!opts.withDealer || x.hasDealer),
  );
  return { brands: shown, origins: [...new Set(summaries.map((x) => x.origin))].sort(), total: summaries.length };
}

export interface BrandDetail {
  id: string;
  slug: string;
  name: string;
  initials: string;
  origin: string;
  ownerName: string | null;
  ownerUrl: string | null;
  description: string | null;
  liveProducts: number;
  products: {
    id: string;
    href: string;
    name: string;
    eyebrow: string;
    supplier: string;
    verified: boolean;
    chips: string[];
    leadTime: string | null;
  }[];
  dealers: {
    name: string;
    href: string;
    place: string;
    regions: string | null;
    scope: string | null;
    validUntil: string | null;
    verified: boolean;
  }[];
}

export async function brandDetail(
  db: Executor,
  slug: string,
  opts: { includeSample: boolean },
): Promise<BrandDetail | null> {
  const [brand] = await db
    .select()
    .from(b)
    .where(and(eq(b.slug, slug), isNull(b.deletedAt)))
    .limit(1);
  if (!brand || (brand.sample && !opts.includeSample)) return null;
  const cat = schema.catalogueCategories;
  const [rows, dealerRows] = await Promise.all([
    db
      .select({
        p,
        cat,
        klass: schema.catalogueClasses.label,
        supplier: schema.companyProfiles.tradeName,
        verification: schema.organisations.verification,
      })
      .from(p)
      .innerJoin(cat, eq(cat.id, p.categoryId))
      .innerJoin(schema.catalogueClasses, eq(schema.catalogueClasses.id, cat.classId))
      .innerJoin(schema.organisations, eq(schema.organisations.id, p.organisationId))
      .innerJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, p.organisationId))
      .where(and(eq(p.brandId, brand.id), eq(p.status, "Live"), isNull(p.deletedAt)))
      .orderBy(asc(p.name)),
    db
      .select({
        d,
        name: schema.companyProfiles.tradeName,
        slug: schema.companyProfiles.slug,
        city: schema.companyProfiles.city,
        state: schema.organisations.state,
      })
      .from(d)
      .innerJoin(schema.organisations, eq(schema.organisations.id, d.organisationId))
      .innerJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, d.organisationId))
      .where(eq(d.brandId, brand.id))
      .orderBy(asc(schema.companyProfiles.tradeName)),
  ]);
  const live = rows.filter((r) => opts.includeSample || !r.p.sample);
  const defsBy = new Map<string, Awaited<ReturnType<typeof effectiveSchema>>>();
  for (const r of live) if (!defsBy.has(r.cat.id)) defsBy.set(r.cat.id, await effectiveSchema(db, r.cat.id, opts));
  return {
    id: brand.id,
    slug: brand.slug,
    name: brand.name,
    initials: initials(brand.name),
    origin: brand.origin,
    ownerName: brand.ownerName,
    ownerUrl: brand.ownerUrl,
    description: brand.description,
    liveProducts: live.length,
    products: live.slice(0, 4).map((r) => ({
      id: r.p.id,
      href: productHref(r.p.slug),
      name: r.p.name,
      eyebrow: `${r.klass} · ${r.cat.label}`,
      supplier: r.supplier,
      verified: r.verification === "Verified",
      chips: cardChips(defsBy.get(r.cat.id) ?? [], r.p.attributes, r.p.certifications),
      leadTime: leadTimeLabel(r.p.leadTimeMinWeeks, r.p.leadTimeMaxWeeks),
    })),
    dealers: dealerRows.map((r) => ({
      name: r.name,
      href: `/directory/companies/${r.slug}`,
      place: [r.city, r.state].filter(Boolean).join(", "),
      regions: r.d.regions,
      scope: r.d.scope,
      validUntil: r.d.letterValidUntil,
      verified: r.d.verifiedAt !== null && letterValid(r.d.letterValidUntil),
    })),
  };
}

/**
 * The Verification desk records that it checked a dealer's authorisation letter (A128): only then does the dealer
 * show as Verified on the brand page. Needs verification.edit; audited with the letter's valid-until date.
 */
export async function recordDealerEvidence(
  db: Database,
  actor: Actor,
  input: { dealerId: string; validUntil: string; context?: RequestContext },
): Promise<void> {
  assertCan(actor, "verification.edit");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.validUntil)) throw new Error("Enter the date the letter is valid until");
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(d).where(eq(d.id, input.dealerId)).limit(1);
    if (!before) throw new Error("No such dealer");
    await tx
      .update(d)
      .set({ letterValidUntil: input.validUntil, verifiedAt: new Date(), verifiedBy: actor.userId })
      .where(eq(d.id, input.dealerId));
    await audit(tx, {
      actorId: actor.userId,
      action: "brand.dealer.verified",
      resourceType: "brand_dealer",
      resourceId: input.dealerId,
      companyId: before.organisationId,
      before: { letterValidUntil: before.letterValidUntil, verified: before.verifiedAt !== null },
      after: { letterValidUntil: input.validUntil, verified: true },
      context: input.context,
    });
  });
}
