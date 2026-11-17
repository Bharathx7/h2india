import {
  schema,
  type Database,
  type Executor,
  type ProductCertificate,
  type ProductFact,
  type ServiceDetails,
} from "@h2india/db";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import { loadActor, VISITOR } from "../authz/actor";
import { attachFile } from "../files/files";
import { must } from "../must";
import type { AttributeDef } from "../catalogue/attributes";
import { effectiveSchema, type ClassId } from "../catalogue/taxonomy";
import { Money } from "../money";
import { productHref } from "./listing";
import { canShowPrice, cardChips, formatValue, leadTimeLabel } from "./rules";

// The product page (step 6.4; quote-only 393:7030, fixed price 393:8021). Everything a buyer needs to shortlist:
// specifications grouped as the schema says, installation, certificates, downloads, delivery and the supplier. A price
// is worked out here only when canShowPrice() allows it (the product page of a fixed-price item); the GST line uses
// the rate the supplier entered with the price, never one written in code.

export interface SpecRow {
  label: string;
  value: string;
  unit: string;
  condition: string;
}

export interface ProductPrice {
  /** "₹48,500" */
  amount: string;
  /** "GST 18%: ₹8,730" and "₹57,230 incl. GST per unit", when the supplier gave the rate. */
  gst: string | null;
  total: string | null;
}

export interface ProductDetail {
  id: string;
  slug: string;
  href: string;
  name: string;
  summary: string | null;
  classId: ClassId;
  classLabel: string;
  category: { id: string; slug: string; label: string };
  sub: { id: string; slug: string; label: string } | null;
  chips: string[];
  specs: { group: string; rows: SpecRow[] }[];
  installation: ProductFact[];
  certificates: ProductCertificate[];
  documents: { fileId: string; label: string; meta: string }[];
  leadTime: string | null;
  minOrder: number | null;
  warranty: { months: number; note: string | null } | null;
  service: { cities: string; note: string | null } | null;
  applications: { id: string; label: string }[];
  pricing: "quote" | "fixed" | "indicative";
  price: ProductPrice | null;
  /** Indicative items (A141): "₹40,00,000 – ₹55,00,000", on the product page only. */
  indicative: string | null;
  supplier: {
    organisationId: string;
    name: string;
    slug: string;
    href: string;
    place: string;
    verified: boolean;
    initials: string;
    categories: string[];
    foundedYear: number | null;
    employees: string | null;
    liveProducts: number;
  };
  madeInIndia: boolean;
  /** Services only (400:11134). */
  serviceDetails: ServiceDetails | null;
  paused: boolean;
  /** The provider's verification, for the "hasn't finished verification" notice (400:11597). */
  providerStatus: "Verified" | "Pending" | "Unverified";
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("") || "?";

const size = (bytes: number) =>
  bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1).replace(/\.0$/, "")} MB`
    : `${String(Math.max(1, Math.round(bytes / 1000)))} KB`;

function specsOf(defs: AttributeDef[], values: Record<string, unknown>, notes: Record<string, string>) {
  const groups: { group: string; rows: SpecRow[] }[] = [];
  for (const d of defs) {
    const raw = values[d.key];
    const shown = formatValue({ ...d, unit: null }, raw);
    if (shown === null) continue;
    // The spec table has its own Unit column (393:7379), so values here carry no unit, and kW stays kW.
    const value =
      d.type === "number" && typeof raw === "number"
        ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 6 }).format(raw)
        : shown;
    const row = { label: d.label, value, unit: d.unit ?? "—", condition: notes[d.key] ?? d.testCondition ?? "" };
    const g = groups.find((x) => x.group === d.displayGroup);
    if (g) g.rows.push(row);
    else groups.push({ group: d.displayGroup, rows: [row] });
  }
  return groups;
}

/** A live product by its address, or null. Sample products only with sample content on (F9). */
export async function productDetail(
  db: Executor,
  slug: string,
  opts: { includeSample: boolean },
): Promise<ProductDetail | null> {
  const p = schema.products;
  const cat = schema.catalogueCategories;
  const [row] = await db
    .select({ p, cat, org: schema.organisations, profile: schema.companyProfiles, klass: schema.catalogueClasses })
    .from(p)
    .innerJoin(cat, eq(cat.id, p.categoryId))
    .innerJoin(schema.catalogueClasses, eq(schema.catalogueClasses.id, cat.classId))
    .innerJoin(schema.organisations, eq(schema.organisations.id, p.organisationId))
    .innerJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, p.organisationId))
    .where(
      and(
        eq(p.slug, slug),
        inArray(p.status, ["Live", "Paused"]),
        isNull(p.deletedAt),
        isNull(cat.deletedAt),
        isNull(cat.hiddenAt),
      ),
    )
    .limit(1);
  if (!row || (row.p.sample && !opts.includeSample)) return null;
  // A paused service stays visible with its notice and can't take requests (400:11797); a paused product doesn't.
  if (row.p.status === "Paused" && row.cat.classId !== "services") return null;
  const parent = row.cat.parentId
    ? (await db.select().from(cat).where(eq(cat.id, row.cat.parentId)).limit(1))[0]
    : undefined;
  const defs = await effectiveSchema(db, row.cat.id, { includeSample: opts.includeSample });
  const [apps, files, live] = await Promise.all([
    row.p.applicationIds.length
      ? db
          .select()
          .from(schema.catalogueApplications)
          .where(inArray(schema.catalogueApplications.id, row.p.applicationIds))
      : Promise.resolve([]),
    row.p.documents.length
      ? db
          .select()
          .from(schema.files)
          .where(
            and(
              inArray(
                schema.files.id,
                row.p.documents.map((d) => d.fileId),
              ),
              eq(schema.files.status, "Available"),
            ),
          )
      : Promise.resolve([]),
    db
      .select({ id: p.id })
      .from(p)
      .where(
        and(
          eq(p.organisationId, row.p.organisationId),
          eq(p.status, "Live"),
          isNull(p.deletedAt),
          supplierNotSuspended(p.organisationId),
        ),
      ),
  ]);

  const fixed = row.p.pricing === "fixed";
  let price: ProductPrice | null = null;
  if (canShowPrice({ surface: "pdp", pricing: row.p.pricing, price: row.p.pricePaise }) && row.p.pricePaise !== null) {
    const amount = row.p.pricePaise;
    const rate = row.p.gstRateBps;
    const gst = rate !== null ? Money.percent(amount, rate) : null;
    price = {
      amount: Money.format(amount),
      gst:
        gst !== null && rate !== null
          ? `GST ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(rate / 100)}%: ${Money.format(gst)}`
          : null,
      total: gst !== null ? `${Money.format(Money.add(amount, gst))} incl. GST per unit` : null,
    };
  }
  const top = parent ?? row.cat;
  return {
    id: row.p.id,
    slug: row.p.slug,
    href: productHref(row.p.slug),
    name: row.p.name,
    summary: row.p.summary,
    classId: row.klass.id as ClassId,
    classLabel: row.klass.label,
    category: { id: top.id, slug: top.slug, label: top.label },
    sub: parent ? { id: row.cat.id, slug: row.cat.slug, label: row.cat.label } : null,
    chips: [
      ...cardChips(defs, row.p.attributes, []),
      ...defs
        .filter((d) => d.comparable)
        .slice(2, 4)
        .map((d) => formatValue(d, row.p.attributes[d.key]))
        .filter((v): v is string => v !== null),
      ...row.p.certifications,
    ].slice(0, 5),
    specs: specsOf(defs, row.p.attributes, row.p.attributeNotes),
    installation: row.p.installation,
    certificates: row.p.certificates,
    documents: row.p.documents
      .map((d) => {
        const f = files.find((x) => x.id === d.fileId);
        if (!f) return null;
        const type = (f.detectedType ?? "").split("/").at(-1)?.toUpperCase() ?? "";
        return { fileId: f.id, label: d.label, meta: [type, size(f.bytes ?? 0)].filter(Boolean).join(" · ") };
      })
      .filter((d): d is { fileId: string; label: string; meta: string } => d !== null),
    leadTime: leadTimeLabel(row.p.leadTimeMinWeeks, row.p.leadTimeMaxWeeks),
    minOrder: row.p.minOrder,
    warranty: row.p.warrantyMonths !== null ? { months: row.p.warrantyMonths, note: row.p.warrantyNote } : null,
    service: row.p.serviceCities ? { cities: row.p.serviceCities, note: row.p.serviceNote } : null,
    applications: apps.filter((a) => a.hiddenAt === null).map((a) => ({ id: a.id, label: a.label })),
    pricing: fixed ? "fixed" : row.p.pricing === "indicative" ? "indicative" : "quote",
    price,
    indicative:
      row.p.indicativeMinPaise !== null &&
      row.p.indicativeMaxPaise !== null &&
      canShowPrice({ surface: "pdp", pricing: row.p.pricing, price: row.p.indicativeMinPaise })
        ? row.p.indicativeMinPaise === row.p.indicativeMaxPaise
          ? Money.format(row.p.indicativeMinPaise)
          : `${Money.format(row.p.indicativeMinPaise)} – ${Money.format(row.p.indicativeMaxPaise)}`
        : null,
    supplier: {
      organisationId: row.org.id,
      name: row.profile.tradeName,
      slug: row.profile.slug,
      href: `/directory/companies/${row.profile.slug}`,
      place: [row.profile.city, row.org.state].filter(Boolean).join(", "),
      verified: row.org.verification === "Verified",
      initials: initials(row.profile.tradeName),
      categories: row.profile.categories,
      foundedYear: row.profile.foundedYear,
      employees: row.profile.employees,
      liveProducts: live.length,
    },
    madeInIndia: row.p.madeInIndia,
    serviceDetails: row.cat.classId === "services" ? (row.p.service ?? {}) : null,
    paused: row.p.status === "Paused",
    providerStatus:
      row.org.verification === "Verified" ? "Verified" : row.org.verification === "Pending" ? "Pending" : "Unverified",
  };
}

/** Similar products (393:7698): others in the same category, as cards (no price). */
export async function similarProducts(
  db: Executor,
  product: ProductDetail,
  opts: { includeSample: boolean },
  limit = 4,
) {
  const p = schema.products;
  const categoryId = product.sub?.id ?? product.category.id;
  const defs = await effectiveSchema(db, categoryId, opts);
  const rows = await db
    .select({ p, name: schema.companyProfiles.tradeName, verification: schema.organisations.verification })
    .from(p)
    .innerJoin(schema.organisations, eq(schema.organisations.id, p.organisationId))
    .innerJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, p.organisationId))
    .where(
      and(
        eq(p.categoryId, categoryId),
        eq(p.status, "Live"),
        isNull(p.deletedAt),
        supplierNotSuspended(p.organisationId),
        ne(p.id, product.id),
      ),
    )
    .limit(limit * 3);
  return rows
    .filter((r) => opts.includeSample || !r.p.sample)
    .slice(0, limit)
    .map((r) => ({
      id: r.p.id,
      href: productHref(r.p.slug),
      name: r.p.name,
      supplier: r.name,
      verified: r.verification === "Verified",
      chips: cardChips(defs, r.p.attributes, r.p.certifications),
      leadTime: leadTimeLabel(r.p.leadTimeMinWeeks, r.p.leadTimeMaxWeeks),
    }));
}

// ----------------------------------------------------------------------------- questions and reports

export { QUESTION_MAX, REPORT_PROBLEMS } from "./rules-client";
import { QUESTION_MAX, REPORT_PROBLEMS } from "./rules-client";
import { supplierNotSuspended } from "./suspension";

type Result = { ok: true } | { ok: false; errors: Record<string, string> };

async function liveProduct(db: Executor, slug: string) {
  const p = schema.products;
  const [row] = await db
    .select({ id: p.id, organisationId: p.organisationId })
    .from(p)
    .where(and(eq(p.slug, slug), eq(p.status, "Live"), isNull(p.deletedAt), supplierNotSuspended(p.organisationId)))
    .limit(1);
  return row ?? null;
}

/**
 * Ask a technical question (402:12544): a signed-in person's question goes to the supplier; it becomes the first
 * message of a thread with step 9.7. The supplier sees the company name only if the asker chose to share it.
 */
export async function askQuestion(
  db: Database,
  input: {
    slug: string;
    userId: string;
    question: string;
    companyName: string | null;
    /** Up to 3 listing_evidence files the person uploaded (A123). */
    attachments?: { fileId: string; key?: string }[];
    context?: RequestContext;
  },
): Promise<Result> {
  if ((input.attachments?.length ?? 0) > 3) return { ok: false, errors: { attachments: "Attach up to 3 files" } };
  const question = input.question.trim();
  if (question.length < 10) return { ok: false, errors: { question: "Write your question in a sentence or two" } };
  if (question.length > QUESTION_MAX)
    return { ok: false, errors: { question: `Keep it to ${String(QUESTION_MAX)} characters` } };
  const product = await liveProduct(db, input.slug);
  if (!product) return { ok: false, errors: { _: "This product isn't listed any more." } };
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.productQuestions)
      .values({
        productId: product.id,
        organisationId: product.organisationId,
        askerId: input.userId,
        question,
        attachments: (input.attachments ?? []).map((a) => a.fileId),
        sharedCompany: input.companyName,
      })
      .returning({ id: schema.productQuestions.id });
    const asker = await loadActor(tx, input.userId);
    for (const a of input.attachments ?? [])
      await attachFile(tx, {
        actor: asker,
        key: a.key,
        fileId: a.fileId,
        kind: "listing_evidence",
        attachedType: "product_question",
        attachedId: must(row).id,
      });
    await audit(tx, {
      actorId: input.userId,
      action: "product.question",
      resourceType: "product_question",
      resourceId: row?.id ?? null,
      companyId: product.organisationId,
      after: { productId: product.id, sharedCompany: input.companyName !== null },
      context: input.context,
    });
  });
  return { ok: true };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Report this listing (755:15048): goes to Compliance, Takedowns (decideTakedown); the supplier never sees who sent it. */
export async function reportListing(
  db: Database,
  input: {
    slug: string;
    problem: string;
    details: string;
    email: string;
    userId: string | null;
    /** Up to 3 listing_evidence files, each with the upload key when sent signed out (A123). */
    attachments?: { fileId: string; key?: string }[];
    context?: RequestContext;
  },
): Promise<Result> {
  const errors: Record<string, string> = {};
  if ((input.attachments?.length ?? 0) > 3) errors.attachments = "Attach up to 3 files";
  if (!REPORT_PROBLEMS.some((p) => p.value === input.problem)) errors.problem = "Choose what's wrong";
  const details = input.details.trim();
  if (details.length < 10) errors.details = "Tell us what's wrong in a sentence or two";
  else if (details.length > QUESTION_MAX) errors.details = `Keep it to ${String(QUESTION_MAX)} characters`;
  const email = input.email.trim();
  if (email && !EMAIL.test(email)) errors.email = "Enter an email, like you@example.com";
  if (Object.keys(errors).length) return { ok: false, errors };
  const product = await liveProduct(db, input.slug);
  if (!product) return { ok: false, errors: { _: "This product isn't listed any more." } };
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.listingReports)
      .values({
        productId: product.id,
        problem: input.problem,
        details,
        email: email || null,
        reporterId: input.userId,
        attachments: (input.attachments ?? []).map((a) => a.fileId),
      })
      .returning({ id: schema.listingReports.id });
    const reporter = input.userId ? await loadActor(tx, input.userId) : VISITOR;
    for (const a of input.attachments ?? [])
      await attachFile(tx, {
        actor: reporter,
        key: a.key,
        fileId: a.fileId,
        kind: "listing_evidence",
        attachedType: "listing_report",
        attachedId: must(row).id,
      });
    await audit(tx, {
      actorId: input.userId,
      action: "listing.reported",
      resourceType: "listing_report",
      resourceId: row?.id ?? null,
      after: { productId: product.id, problem: input.problem },
      context: input.context,
    });
  });
  return { ok: true };
}

/** A supplier's live products as cards (the Products tab, 482:8), no price. */
export async function storefrontProducts(db: Executor, organisationId: string, opts: { includeSample: boolean }) {
  const p = schema.products;
  const cat = schema.catalogueCategories;
  const rows = await db
    .select({ p, cat, klass: schema.catalogueClasses.label })
    .from(p)
    .innerJoin(cat, eq(cat.id, p.categoryId))
    .innerJoin(schema.catalogueClasses, eq(schema.catalogueClasses.id, cat.classId))
    .where(
      and(
        eq(p.organisationId, organisationId),
        eq(p.status, "Live"),
        isNull(p.deletedAt),
        supplierNotSuspended(p.organisationId),
      ),
    );
  const out = [];
  for (const r of rows.filter((x) => opts.includeSample || !x.p.sample)) {
    const defs = await effectiveSchema(db, r.cat.id, opts);
    out.push({
      id: r.p.id,
      href: productHref(r.p.slug),
      name: r.p.name,
      eyebrow: `${r.klass} · ${r.cat.label}`,
      chips: cardChips(defs, r.p.attributes, r.p.certifications),
      leadTime: leadTimeLabel(r.p.leadTimeMinWeeks, r.p.leadTimeMaxWeeks),
      certificates: r.p.certificates,
    });
  }
  return out;
}
