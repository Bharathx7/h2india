import { randomBytes } from "node:crypto";
import { parseServerEnv } from "@h2india/config";
import { schema, type Database, type Executor } from "@h2india/db";
import { renderListingApproved, renderListingNeedsChanges } from "@h2india/emails";
import { and, asc, desc, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan, can } from "../authz/can";
import { inScope, type Scope } from "../authz/scope";
import { checkAttributeValues, type AttributeDef } from "../catalogue/attributes";
import { effectiveSchema } from "../catalogue/taxonomy";
import { attachFile } from "../files/files";
import { notify } from "../notify/notify";
import { queueIndexChange } from "../search/outbox";
import { changeStatus } from "../status";
import { formatIstDate } from "../time";
import {
  changeKind,
  INSTANT_FIELDS,
  PRODUCT_TABS,
  PRODUCT_TRANSITIONS,
  REVIEWED_FIELDS,
  REVISION_TRANSITIONS,
  shownStatus,
} from "./rules";

// The product editor and listing review (step 8.3). Suppliers edit and submit; every new listing and every change to
// what is reviewed (specs, certificates, category) is checked by an operator before buyers see it. A live listing
// stays up while its change is reviewed: the change waits in product_revisions and is applied on approval (A157).
// Price, stock and lead time change at once (602:281). Statuses change only through changeStatus().

const p = schema.products;
const r = schema.productRevisions;

export class ProductError extends Error {
  constructor(
    message: string,
    readonly errors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ProductError";
  }
}

type Reviewed = (typeof REVIEWED_FIELDS)[number];
type Instant = (typeof INSTANT_FIELDS)[number];
type ProductRow = typeof p.$inferSelect;

export type ProductInput = Partial<Pick<ProductRow, Reviewed | Instant>>;

const appUrl = () => parseServerEnv().APP_URL;

/** Kinds that are a listing's first review (anything else is a change to a live listing). */
export const NEW_LISTING_KINDS: readonly string[] = ["new listing", "from datasheet"];

function slugFor(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base || "product"}-${randomBytes(3).toString("hex")}`;
}

const pick = <K extends string>(o: Record<string, unknown>, keys: readonly K[]) =>
  Object.fromEntries(keys.filter((k) => k in o && o[k] !== undefined).map((k) => [k, o[k]])) as Partial<
    Record<K, unknown>
  >;

/** A plain value as text for the audit log and the moderation table. */
const show = (v: unknown): string =>
  typeof v === "string"
    ? v
    : typeof v === "number" || typeof v === "bigint" || typeof v === "boolean"
      ? String(v)
      : JSON.stringify(v ?? null);

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Pricing columns as the database rule needs them (products_price_rule): no price on a quote-only item. */
function pricingColumns(input: ProductInput): ProductInput {
  const out = { ...input };
  if (out.pricing === "quote") {
    Object.assign(out, {
      pricePaise: null,
      priceCurrency: null,
      indicativeMinPaise: null,
      indicativeMaxPaise: null,
      gstRateBps: null,
    });
  } else if (out.pricing === "fixed") {
    Object.assign(out, { priceCurrency: "INR", indicativeMinPaise: null, indicativeMaxPaise: null });
  } else if (out.pricing === "indicative") {
    Object.assign(out, { priceCurrency: "INR", pricePaise: null });
  }
  return out;
}

/** What blocks a submission: required fields, the category schema, commercial terms. Keyed by field. */
export function submissionProblems(defs: readonly AttributeDef[], data: ProductInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.name?.trim()) errors.name = "Enter the product name";
  if (!data.categoryId) errors.categoryId = "Choose a category";
  const values = Object.fromEntries(
    Object.entries(data.attributes ?? {}).filter(([, v]) => v !== "" && v !== null && v !== undefined),
  );
  const checked = checkAttributeValues(defs, values);
  if (!checked.ok) Object.assign(errors, checked.errors);
  for (const d of defs) {
    if (d.testCondition && values[d.key] !== undefined && !data.attributeNotes?.[d.key]?.trim()) {
      errors[`note:${d.key}`] = `Add the test conditions for ${d.label.toLowerCase()}`;
    }
  }
  if (data.pricing === "fixed" && !(data.pricePaise && data.pricePaise > 0n)) errors.pricePaise = "Enter the price";
  if (
    data.pricing === "indicative" &&
    !(data.indicativeMinPaise && data.indicativeMaxPaise && data.indicativeMaxPaise >= data.indicativeMinPaise)
  ) {
    errors.indicativeMinPaise = "Enter the lowest and highest price";
  }
  if (!data.leadTimeMinWeeks && data.stock !== "in_stock") errors.leadTimeMinWeeks = "Enter the lead time";
  if (data.stock === "in_stock" && data.stockQty === null) errors.stockQty = "Enter how many are in stock";
  return errors;
}

/** Automated checks shown to the operator (632:695). The datasheet comparison is added in step 8.4. */
export function automatedChecks(defs: readonly AttributeDef[], data: ProductInput, now: Date = new Date()) {
  const values = data.attributes ?? {};
  const unitless = defs.filter((d) => d.type === "number" && values[d.key] !== undefined && !d.unit);
  const range = checkAttributeValues(defs, values);
  const expired = (data.certificates ?? []).filter(
    (c) => c.validUntil && new Date(c.validUntil).getTime() < now.getTime(),
  );
  return [
    {
      key: "units",
      ok: unitless.length === 0,
      label: "Every value has a unit",
      detail: unitless.map((d) => d.label).join(", ") || undefined,
    },
    {
      key: "range",
      ok: range.ok,
      label: "Values fall within the category's usual range",
      detail: range.ok ? undefined : Object.values(range.errors).join(" · "),
    },
    {
      key: "certificates",
      ok: expired.length === 0,
      label: "Certificate still valid",
      detail: expired.length ? expired.map((c) => c.name).join(", ") : undefined,
    },
  ];
}

async function schemaOf(db: Executor, categoryId: string) {
  return effectiveSchema(db, categoryId, { includeSample: true });
}

/** The listing and its open change (if any), for the editor. Company-scoped. */
export async function editableProduct(db: Executor, scope: Scope, organisationId: string, productId: string) {
  const [product] = await db
    .select()
    .from(p)
    .where(
      and(
        inScope(scope, p.organisationId),
        eq(p.organisationId, organisationId),
        eq(p.id, productId),
        isNull(p.deletedAt),
      ),
    );
  if (!product) return null;
  const [revision] = await db
    .select()
    .from(r)
    .where(and(eq(r.productId, productId), inArray(r.status, ["Draft", "In review", "Needs changes"])))
    .orderBy(desc(r.createdAt))
    .limit(1);
  // A new listing's last review, for its notes (Needs changes) or reason (Rejected).
  const [last] = revision
    ? [revision]
    : await db.select().from(r).where(eq(r.productId, productId)).orderBy(desc(r.createdAt)).limit(1);
  const working = { ...product, ...(revision ? revision.data : {}) };
  return {
    product,
    revision: revision ?? null,
    lastReview: last ?? null,
    working,
    shown: shownStatus(product.status, revision?.status ?? null),
  };
}

/**
 * Save draft or Submit for review. A listing not yet live is edited in place; a live one keeps its live version and
 * collects reviewed changes in a revision, while instant fields (price, stock, lead time) apply at once.
 */
export async function saveProduct(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: {
    id?: string;
    data: ProductInput;
    submit: boolean;
    context?: RequestContext;
    /** A new listing's kind in the queue ("from datasheet", step 8.4), and checks to add to the automated ones. */
    kind?: string;
    extraChecks?: { key: string; ok: boolean; label: string; detail?: string }[];
  },
): Promise<{ id: string; status: string }> {
  if (!can(actor, "product.manage", { organisationId })) throw new ProductError("Not allowed");
  const data = pricingColumns(input.data);
  let product: ProductRow | undefined;
  if (input.id) {
    [product] = await db
      .select()
      .from(p)
      .where(and(eq(p.id, input.id), eq(p.organisationId, organisationId), isNull(p.deletedAt)));
    if (!product) throw new ProductError("No such product");
    if (product.status === "In review")
      throw new ProductError("This listing is with H2 Economy for review. You can edit it once they reply.");
    if (product.status === "Rejected" || product.status === "Archived")
      throw new ProductError("This listing can't be changed. Start a new one.");
  }
  if (!(data.name ?? product?.name)?.trim())
    throw new ProductError("Enter the product name", { name: "Enter the product name" });
  const categoryId = data.categoryId ?? product?.categoryId;
  if (!categoryId) throw new ProductError("Choose a category", { categoryId: "Choose a category" });
  const defs = await schemaOf(db, categoryId);
  const merged = { ...(product ?? {}), ...data } as ProductInput;
  if (input.submit) {
    const problems = submissionProblems(defs, merged);
    if (Object.keys(problems).length) throw new ProductError("Fix the highlighted fields", problems);
  }
  const live = product && (product.status === "Live" || product.status === "Paused");

  return db
    .transaction(async (tx) => {
      let id = product?.id ?? "";
      if (!product) {
        const [row] = await tx
          .insert(p)
          .values({
            ...(data as object),
            organisationId,
            categoryId,
            name: data.name ?? "",
            slug: slugFor(data.name ?? ""),
            createdBy: actor.userId,
          } as typeof p.$inferInsert)
          .returning({ id: p.id });
        id = row?.id ?? "";
        await audit(tx, {
          actorId: actor.userId,
          action: "product.created",
          resourceType: "product",
          resourceId: id,
          companyId: organisationId,
          context: input.context,
        });
      } else if (!live) {
        await tx
          .update(p)
          .set({ ...(data as object), updatedAt: new Date(), updatedBy: actor.userId })
          .where(eq(p.id, id));
      } else {
        // Live: instant fields now; reviewed fields into the open change.
        const instant = pick(data as Record<string, unknown>, INSTANT_FIELDS);
        const before = pick(product as unknown as Record<string, unknown>, INSTANT_FIELDS);
        const changedInstant = Object.keys(instant).filter((k) => !same(instant[k as Instant], before[k as Instant]));
        if (changedInstant.length) {
          await tx
            .update(p)
            .set({ ...(instant as object), updatedAt: new Date(), updatedBy: actor.userId })
            .where(eq(p.id, id));
          await audit(tx, {
            actorId: actor.userId,
            action: "product.updated",
            resourceType: "product",
            resourceId: id,
            companyId: organisationId,
            before: Object.fromEntries(changedInstant.map((k) => [k, show(before[k as Instant])])),
            after: Object.fromEntries(changedInstant.map((k) => [k, show(instant[k as Instant])])),
            context: input.context,
          });
          await queueIndexChange(tx, "products", [id]);
        }
        const reviewed = pick({ ...product, ...data }, REVIEWED_FIELDS);
        const changed = REVIEWED_FIELDS.filter((k) => !same(reviewed[k], (product as Record<string, unknown>)[k]));
        const [open] = await tx
          .select()
          .from(r)
          .where(and(eq(r.productId, id), inArray(r.status, ["Draft", "In review", "Needs changes"])))
          .for("update");
        if (open?.status === "In review")
          throw new ProductError("A change to this listing is with H2 Economy for review.");
        if (changed.length) {
          const values = { data: jsonSafe(reviewed), kind: changeKind(changed), updatedAt: new Date() };
          if (open) await tx.update(r).set(values).where(eq(r.id, open.id));
          else await tx.insert(r).values({ productId: id, organisationId, status: "Draft", ...values });
        }
        if (input.submit) {
          const [rev] = await tx
            .select()
            .from(r)
            .where(and(eq(r.productId, id), inArray(r.status, ["Draft", "Needs changes"])));
          if (!rev) return { id, status: product.status };
          await tx
            .update(r)
            .set({
              checks: automatedChecks(defs, merged),
              submittedBy: actor.userId,
              submittedAt: new Date(),
              notes: [],
            })
            .where(eq(r.id, rev.id));
          await recordRevisionStatus(tx, rev.id, rev.status, "In review", actor.userId, organisationId, input.context);
          return { id, status: "In review" };
        }
        return { id, status: product.status };
      }
      if (input.submit) {
        await tx.insert(r).values({
          productId: id,
          organisationId,
          kind: input.kind ?? ((await fromDatasheet(tx, id)) ? "from datasheet" : "new listing"),
          status: "In review",
          data: jsonSafe(pick({ ...(product ?? {}), ...data }, REVIEWED_FIELDS)),
          checks: [...automatedChecks(defs, merged), ...(input.extraChecks ?? [])],
          submittedBy: actor.userId,
          submittedAt: new Date(),
        });
      }
      return { id, status: product?.status ?? "Draft" };
    })
    .then(async (res) => {
      // Photos and documents belong to the product (step 3.7): attached once, by their uploader.
      for (const img of data.images ?? []) {
        await attachFile(db, {
          actor,
          fileId: img.fileId,
          kind: "product_image",
          attachedType: "product",
          attachedId: res.id,
        }).catch(ignoreAttached);
      }
      for (const doc of data.documents ?? []) {
        await attachFile(db, {
          actor,
          fileId: doc.fileId,
          kind: "datasheet",
          attachedType: "product",
          attachedId: res.id,
        }).catch(ignoreAttached);
      }
      // A listing that isn't live moves to In review through changeStatus (status history and audit).
      if (input.submit && (!product || !live)) {
        await changeStatus(db, {
          table: p,
          entityType: "product",
          id: res.id,
          from: product?.status === "Needs changes" ? "Needs changes" : "Draft",
          to: "In review",
          actorId: actor.userId,
          companyId: organisationId,
          transitions: PRODUCT_TRANSITIONS,
          context: input.context,
        });
        return { id: res.id, status: "In review" };
      }
      return res;
    });
}

/** A listing started from a datasheet (step 8.4) shows in the queue as "from datasheet". */
async function fromDatasheet(ex: Executor, productId: string): Promise<boolean> {
  const [row] = await ex
    .select({ id: schema.datasheetExtractions.id })
    .from(schema.datasheetExtractions)
    .where(eq(schema.datasheetExtractions.productId, productId))
    .limit(1);
  return Boolean(row);
}

/** A file uploaded by a colleague, or already attached here, stays as it is. */
function ignoreAttached(error: unknown) {
  if (!(error instanceof Error) || !/No such file|already used|still being checked/.test(error.message)) throw error;
}

/** JSON columns can't hold bigints: keep paise as strings in a revision. */
function jsonSafe(o: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(o, (_k, v: unknown) => (typeof v === "bigint" ? v.toString() : v))) as Record<
    string,
    unknown
  >;
}

async function recordRevisionStatus(
  tx: Executor,
  id: string,
  from: string,
  to: string,
  actorId: string | null,
  organisationId: string,
  context?: RequestContext,
  reason?: string,
) {
  const allowed = (REVISION_TRANSITIONS as Record<string, readonly string[]>)[from] ?? [];
  if (!allowed.includes(to)) throw new ProductError(`This change can't move from ${from} to ${to}`);
  await tx.update(r).set({ status: to, updatedAt: new Date() }).where(eq(r.id, id));
  await tx.insert(schema.statusHistory).values({
    entityType: "product_revision",
    entityId: id,
    fromStatus: from,
    toStatus: to,
    actorId,
    reason: reason ?? null,
  });
  await audit(tx, {
    actorId,
    action: "status.change",
    resourceType: "product_revision",
    resourceId: id,
    companyId: organisationId,
    before: { status: from },
    after: { status: to },
    context,
  });
}

/** Pause, resume or archive listings (598:8 bulk bar and row menu). Paused listings leave search within a minute. */
export async function setListingStatus(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { ids: string[]; to: "Paused" | "Live" | "Archived"; context?: RequestContext },
): Promise<number> {
  if (!can(actor, "product.manage", { organisationId })) throw new ProductError("Not allowed");
  const rows = await db
    .select({ id: p.id, status: p.status })
    .from(p)
    .where(and(inArray(p.id, input.ids), eq(p.organisationId, organisationId)));
  let changed = 0;
  for (const row of rows) {
    const allowed = (PRODUCT_TRANSITIONS as Record<string, readonly string[]>)[row.status] ?? [];
    // Resuming is only from Paused: a listing goes Live otherwise only through review.
    if (!allowed.includes(input.to) || (input.to === "Live" && row.status !== "Paused")) continue;
    await changeStatus(db, {
      table: p,
      entityType: "product",
      id: row.id,
      from: row.status,
      to: input.to,
      actorId: actor.userId,
      companyId: organisationId,
      transitions: PRODUCT_TRANSITIONS,
      context: input.context,
      also: async (tx) => {
        await queueIndexChange(tx, "products", [row.id]);
      },
    });
    changed += 1;
  }
  return changed;
}

/** Dialog Delete product (685:16): a soft delete; live listings are archived first. */
export async function deleteProduct(
  db: Database,
  actor: Actor,
  organisationId: string,
  id: string,
  context?: RequestContext,
) {
  if (!can(actor, "product.manage", { organisationId })) throw new ProductError("Not allowed");
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(p)
      .set({ deletedAt: new Date(), updatedBy: actor.userId })
      .where(and(eq(p.id, id), eq(p.organisationId, organisationId), isNull(p.deletedAt)))
      .returning({ id: p.id, status: p.status });
    if (!row) throw new ProductError("No such product");
    await audit(tx, {
      actorId: actor.userId,
      action: "product.deleted",
      resourceType: "product",
      resourceId: id,
      companyId: organisationId,
      before: { status: row.status },
      context,
    });
    await queueIndexChange(tx, "products", [id]);
  });
}

// ------------------------------------------------------------------------------------------------ Products list

export interface SupplierProductRow {
  id: string;
  slug: string;
  name: string;
  model: string | null;
  category: string;
  pricing: string;
  pricePaise: bigint | null;
  indicativeMinPaise: bigint | null;
  indicativeMaxPaise: bigint | null;
  stock: string;
  stockQty: number | null;
  shipDays: number | null;
  leadTimeMinWeeks: number | null;
  leadTimeMaxWeeks: number | null;
  status: string;
  shown: string;
}

/** The supplier's Products (598:8): a tab, a search on name or model, a category. Company-scoped. */
export async function supplierProducts(
  db: Executor,
  scope: Scope,
  organisationId: string,
  opts: { tab?: string; q?: string; categoryId?: string } = {},
) {
  const cat = schema.catalogueCategories;
  const parent = sql<string | null>`(select label from core.catalogue_categories pc where pc.id = ${cat.parentId})`;
  const klass = sql<string>`(select label from core.catalogue_classes cc where cc.id = ${cat.classId})`;
  const rows = await db
    .select({
      p,
      category: cat.label,
      parent,
      klass,
      revision: sql<
        string | null
      >`(select status from core.product_revisions pr where pr.product_id = ${p.id} and pr.status in ('Draft','In review','Needs changes') order by pr.created_at desc limit 1)`,
    })
    .from(p)
    .innerJoin(cat, eq(cat.id, p.categoryId))
    .where(
      and(
        inScope(scope, p.organisationId),
        eq(p.organisationId, organisationId),
        isNull(p.deletedAt),
        ne(p.status, "Archived"),
        opts.q ? or(ilike(p.name, `%${opts.q}%`), ilike(p.model, `%${opts.q}%`)) : undefined,
        opts.categoryId ? or(eq(p.categoryId, opts.categoryId), eq(cat.parentId, opts.categoryId)) : undefined,
      ),
    )
    .orderBy(desc(p.updatedAt));
  const all: SupplierProductRow[] = rows.map((x) => ({
    id: x.p.id,
    slug: x.p.slug,
    name: x.p.name,
    model: x.p.model,
    category: [x.klass, x.parent, x.category].filter(Boolean).join(" › "),
    pricing: x.p.pricing,
    pricePaise: x.p.pricePaise,
    indicativeMinPaise: x.p.indicativeMinPaise,
    indicativeMaxPaise: x.p.indicativeMaxPaise,
    stock: x.p.stock,
    stockQty: x.p.stockQty,
    shipDays: x.p.shipDays,
    leadTimeMinWeeks: x.p.leadTimeMinWeeks,
    leadTimeMaxWeeks: x.p.leadTimeMaxWeeks,
    status: x.p.status,
    shown: shownStatus(x.p.status, x.revision),
  }));
  const counts = Object.fromEntries(
    PRODUCT_TABS.map((t) => [
      t.key,
      t.statuses ? all.filter((x) => (t.statuses as readonly string[]).includes(x.shown)).length : all.length,
    ]),
  );
  const tab = PRODUCT_TABS.find((t) => t.key === opts.tab) ?? PRODUCT_TABS[0];
  const items = tab.statuses ? all.filter((x) => (tab.statuses as readonly string[]).includes(x.shown)) : all;
  return { items, counts };
}

// ------------------------------------------------------------------------------------------------ the queue

/** Listings queue (629:367): every listing or change waiting for a decision, oldest first. */
export async function listingQueue(
  db: Executor,
  actor: Actor,
  opts: { view?: "all" | "mine" | "unassigned"; q?: string; kind?: string } = {},
) {
  assertCan(actor, "queues.view");
  const org = schema.organisations;
  const prof = schema.companyProfiles;
  const rows = await db
    .select({
      r,
      name: p.name,
      model: p.model,
      company: sql<string>`coalesce(${prof.tradeName}, ${org.legalName})`,
      /** A new listing goes live only once this is "Verified" (decideRevision). */
      companyVerification: org.verification,
      submitter: schema.users.name,
      assignee: sql<string | null>`(select name from core.users u where u.id = ${r.assigneeId})`,
    })
    .from(r)
    .innerJoin(p, eq(p.id, r.productId))
    .innerJoin(org, eq(org.id, r.organisationId))
    .leftJoin(prof, eq(prof.organisationId, org.id))
    .leftJoin(schema.users, eq(schema.users.id, r.submittedBy))
    .where(
      and(
        eq(r.status, "In review"),
        // A product the supplier deleted leaves the queue (founder QC, 17 Nov 2026: approving it said "is live").
        isNull(p.deletedAt),
        opts.view === "mine"
          ? eq(r.assigneeId, actor.userId ?? "")
          : opts.view === "unassigned"
            ? isNull(r.assigneeId)
            : undefined,
        opts.kind ? eq(r.kind, opts.kind) : undefined,
        opts.q
          ? or(ilike(p.name, `%${opts.q}%`), ilike(p.model, `%${opts.q}%`), ilike(prof.tradeName, `%${opts.q}%`))
          : undefined,
      ),
    )
    .orderBy(asc(r.submittedAt));
  return rows;
}

export async function assignRevision(db: Database, actor: Actor, id: string) {
  assertCan(actor, "queues.edit");
  await db
    .update(r)
    .set({ assigneeId: actor.userId })
    .where(and(eq(r.id, id), eq(r.status, "In review")));
  await audit(db, {
    actorId: actor.userId,
    action: "listing.assigned",
    resourceType: "product_revision",
    resourceId: id,
    after: { assignee: actor.userId },
  });
}

/** Moderation · Listing (632:695): the change, field by field (live now and submitted), with its checks and history. */
export async function revisionDetail(db: Executor, actor: Actor, id: string) {
  assertCan(actor, "queues.view");
  const [rev] = await db.select().from(r).where(eq(r.id, id));
  if (!rev) return null;
  const [product] = await db.select().from(p).where(eq(p.id, rev.productId));
  if (!product) return null;
  const isNew = NEW_LISTING_KINDS.includes(rev.kind);
  const defs = await schemaOf(db, (rev.data.categoryId as string | undefined) ?? product.categoryId);
  const live = product as unknown as Record<string, unknown>;
  const submitted = rev.data;
  const fmt = (v: unknown) =>
    v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : show(v);
  const rows: { field: string; label: string; live: string; submitted: string; changed: boolean }[] = [];
  const attrsLive = (live.attributes ?? {}) as Record<string, unknown>;
  const attrsNew = (submitted.attributes ?? {}) as Record<string, unknown>;
  rows.push({
    field: "name",
    label: "Name",
    live: fmt(live.name),
    submitted: fmt(submitted.name),
    changed: !isNew && !same(live.name, submitted.name),
  });
  rows.push({
    field: "categoryId",
    label: "Category",
    live: fmt(live.categoryId),
    submitted: fmt(submitted.categoryId),
    changed: !isNew && !same(live.categoryId, submitted.categoryId),
  });
  for (const d of defs) {
    const a = attrsLive[d.key];
    const b = attrsNew[d.key];
    const unit = d.unit ? ` ${d.unit}` : "";
    rows.push({
      field: d.key,
      label: d.label,
      live: a === undefined ? "—" : `${fmt(a)}${unit}`,
      submitted: b === undefined ? "—" : `${fmt(b)}${unit}`,
      changed: !isNew && !same(a, b),
    });
  }
  rows.push({
    field: "certificates",
    label: "Certificates",
    live: ((live.certificates ?? []) as { name: string }[]).map((c) => c.name).join(", ") || "—",
    submitted: ((submitted.certificates ?? []) as { name: string }[]).map((c) => c.name).join(", ") || "—",
    changed: !isNew && !same(live.certificates, submitted.certificates),
  });
  const history = await db
    .select({
      at: schema.auditLog.at,
      action: schema.auditLog.action,
      actor: schema.users.name,
      after: schema.auditLog.after,
    })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLog.actorId))
    .where(or(eq(schema.auditLog.resourceId, rev.id), eq(schema.auditLog.resourceId, product.id)))
    .orderBy(desc(schema.auditLog.at))
    .limit(10);
  return { revision: rev, product, isNew, defs, rows, history };
}

/** The supplier people who look after listings (Admin and Catalogue), told about decisions on them. */
export async function supplierCatalogueTeam(db: Executor, organisationId: string) {
  return db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(
      and(
        eq(schema.memberships.organisationId, organisationId),
        inArray(schema.memberships.role, ["Admin", "Catalogue"]),
      ),
    );
}

/**
 * Approve, request changes (field by field) or reject (632:695). Approving a new listing makes it Live; approving a
 * change applies it to the live listing. Outcomes send Listing approved (831:1006) or Listing needs changes (673:287).
 */
export async function decideRevision(
  db: Database,
  actor: Actor,
  input: {
    id: string;
    outcome: "Approved" | "Needs changes" | "Rejected";
    notes?: {
      field: string;
      section: "category" | "details" | "specifications" | "documents" | "commercial";
      text: string;
    }[];
    reason?: string;
    context?: RequestContext;
  },
) {
  assertCan(actor, "queues.edit");
  const [rev] = await db.select().from(r).where(eq(r.id, input.id));
  if (!rev || rev.status !== "In review") throw new ProductError("This review has already been decided");
  const [product] = await db.select().from(p).where(eq(p.id, rev.productId));
  if (!product || product.deletedAt)
    throw new ProductError("The supplier deleted this product, so there is nothing to decide.");
  const notes = (input.notes ?? []).filter((n) => n.text.trim());
  const reason = input.reason?.trim() ?? "";
  if (input.outcome === "Needs changes" && !notes.length)
    throw new ProductError("Add at least one change for the supplier");
  if (input.outcome === "Rejected" && !reason) throw new ProductError("Say why it can't be listed");
  const isNew = NEW_LISTING_KINDS.includes(rev.kind);
  if (input.outcome === "Approved" && isNew) {
    const [org] = await db
      .select({ v: schema.organisations.verification })
      .from(schema.organisations)
      .where(eq(schema.organisations.id, rev.organisationId));
    if (org?.v !== "Verified")
      throw new ProductError(
        "Approve the company in Verification first: listings go live only for verified suppliers.",
      );
  }
  await db.transaction(async (tx) => {
    await tx
      .update(r)
      .set({ notes, reason: reason || null, decidedBy: actor.userId, decidedAt: new Date() })
      .where(eq(r.id, rev.id));
    await recordRevisionStatus(
      tx,
      rev.id,
      "In review",
      input.outcome,
      actor.userId,
      rev.organisationId,
      input.context,
      reason || notes.map((n) => n.text).join(" · "),
    );
    if (!isNew && input.outcome === "Approved") {
      const data = { ...rev.data } as Record<string, unknown>;
      await tx
        .update(p)
        .set({ ...(data as object), updatedAt: new Date() })
        .where(eq(p.id, product.id));
      await audit(tx, {
        actorId: actor.userId,
        action: "product.change.applied",
        resourceType: "product",
        resourceId: product.id,
        companyId: rev.organisationId,
        after: { revision: rev.id },
        context: input.context,
      });
      await queueIndexChange(tx, "products", [product.id]);
    }
    if (input.outcome === "Rejected" && isNew) {
      await tx.update(p).set({ rejectReason: reason }).where(eq(p.id, product.id));
    }
  });
  if (isNew) {
    await changeStatus(db, {
      table: p,
      entityType: "product",
      id: product.id,
      from: "In review",
      to: input.outcome === "Approved" ? "Live" : input.outcome,
      actorId: actor.userId,
      companyId: rev.organisationId,
      reason: reason || undefined,
      transitions: PRODUCT_TRANSITIONS,
      context: input.context,
      also: async (tx) => {
        if (input.outcome === "Approved") {
          await tx.update(p).set({ publishedAt: new Date() }).where(eq(p.id, product.id));
          await queueIndexChange(tx, "products", [product.id]);
        }
      },
    });
  }
  // Tell the supplier's catalogue team.
  const cat = schema.catalogueCategories;
  const [category] = await db.select({ label: cat.label }).from(cat).where(eq(cat.id, product.categoryId));
  const details = {
    company: "",
    product: product.name,
    code: product.model ?? product.name,
    category: category?.label ?? "",
    editUrl: `${appUrl()}/supplier/products/${product.id}`,
    liveUrl: `${appUrl()}/marketplace/products/${product.slug}`,
  };
  const [prof] = await db
    .select({ name: schema.companyProfiles.tradeName })
    .from(schema.companyProfiles)
    .where(eq(schema.companyProfiles.organisationId, rev.organisationId));
  details.company = prof?.name ?? "";
  if (input.outcome === "Rejected") {
    // Founder QC (17 Nov 2026): a rejection reached nobody. In the app only until the email wording is approved (M21).
    for (const person of await supplierCatalogueTeam(db, rev.organisationId))
      await notify({
        event: "listing.rejected",
        topic: "company.verification",
        userId: person.id,
        scope: rev.organisationId,
        inApp: {
          category: "account",
          icon: "alert-circle",
          title: `${product.name} wasn't approved`,
          body: notes.map((n) => n.text).join(" · ") || undefined,
          href: `/supplier/products/${product.id}`,
        },
      });
    return;
  }
  for (const person of await supplierCatalogueTeam(db, rev.organisationId)) {
    const mail =
      input.outcome === "Approved"
        ? {
            template: "email.listing_approved" as const,
            mail: await renderListingApproved(appUrl(), {
              ...details,
              name: person.name,
              checkedAgainst: null,
              reviewed: formatIstDate(new Date()),
            }),
          }
        : {
            template: "email.listing_needs_changes" as const,
            mail: await renderListingNeedsChanges(appUrl(), {
              ...details,
              name: person.name,
              changes: notes.map((n) => n.text),
              live: !isNew,
            }),
          };
    await notify({
      event: input.outcome === "Approved" ? "listing.approved" : "listing.needs_changes",
      topic: "company.verification",
      userId: person.id,
      scope: rev.organisationId,
      email: mail,
      inApp: {
        category: "account",
        icon: input.outcome === "Approved" ? "check-circle" : "pencil",
        title: input.outcome === "Approved" ? `${product.name} is live` : `${product.name} needs changes`,
        href: `/supplier/products/${product.id}`,
      },
    });
  }
}
