import { schema, type Database, type Executor } from "@h2india/db";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Actor } from "../authz/actor";
import { can } from "../authz/can";
import { inScope, type Scope } from "../authz/scope";
import { productHref } from "../products/listing";
import { leadTimeLabel } from "../products/rules";

// Project lists (Saved lists 78:2628; Modal New list 275:23517), step 9.1: shortlists of products a buyer company
// shares. Anyone in the company can see them; anyone who can request quotes can change them.

const l = schema.projectLists;
const i = schema.projectListItems;

export class ListError extends Error {}

const canEdit = (actor: Actor, organisationId: string) =>
  can(actor, "rfq.create", { organisationId }) || can(actor, "company.manage", { organisationId });

export async function projectLists(db: Executor, scope: Scope, organisationId: string) {
  return db
    .select({
      id: l.id,
      name: l.name,
      count: sql<number>`(select count(*)::int from core.project_list_items x where x.list_id = ${l.id})`,
    })
    .from(l)
    .where(and(inScope(scope, l.organisationId), eq(l.organisationId, organisationId), isNull(l.deletedAt)))
    .orderBy(asc(l.createdAt));
}

export async function listProductIds(
  db: Executor,
  scope: Scope,
  organisationId: string,
  listId: string,
): Promise<string[]> {
  const rows = await db
    .select({ productId: i.productId })
    .from(i)
    .innerJoin(l, eq(l.id, i.listId))
    .where(
      and(
        inScope(scope, l.organisationId),
        eq(l.organisationId, organisationId),
        eq(l.id, listId),
        isNull(l.deletedAt),
      ),
    )
    .orderBy(asc(i.addedAt));
  return rows.map((r) => r.productId);
}

export async function createList(db: Database, actor: Actor, organisationId: string, name: string) {
  if (!canEdit(actor, organisationId)) throw new ListError("Not allowed");
  const clean = name.trim().slice(0, 80);
  if (!clean) throw new ListError("Name the list");
  const [row] = await db
    .insert(l)
    .values({ organisationId, name: clean, createdBy: actor.userId })
    .returning({ id: l.id });
  return row;
}

export async function addToList(db: Database, actor: Actor, organisationId: string, listId: string, productId: string) {
  if (!canEdit(actor, organisationId)) throw new ListError("Not allowed");
  const [list] = await db
    .select({ id: l.id })
    .from(l)
    .where(and(eq(l.id, listId), eq(l.organisationId, organisationId), isNull(l.deletedAt)));
  if (!list) throw new ListError("No such list");
  const [p] = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(and(eq(schema.products.id, productId), eq(schema.products.status, "Live")));
  if (!p) throw new ListError("This product isn't available");
  await db.insert(i).values({ listId, productId }).onConflictDoNothing();
}

export async function removeFromList(
  db: Database,
  actor: Actor,
  organisationId: string,
  listId: string,
  productIds: string[],
) {
  if (!canEdit(actor, organisationId)) throw new ListError("Not allowed");
  const [list] = await db
    .select({ id: l.id })
    .from(l)
    .where(and(eq(l.id, listId), eq(l.organisationId, organisationId)));
  if (!list || !productIds.length) return;
  await db.delete(i).where(and(eq(i.listId, listId), inArray(i.productId, productIds)));
}

export async function deleteList(db: Database, actor: Actor, organisationId: string, listId: string) {
  if (!canEdit(actor, organisationId)) throw new ListError("Not allowed");
  await db
    .update(l)
    .set({ deletedAt: new Date() })
    .where(and(eq(l.id, listId), eq(l.organisationId, organisationId)));
}

export interface ListCard {
  id: string;
  slug: string;
  href: string;
  name: string;
  eyebrow: string;
  supplier: { name: string; verified: boolean };
  chips: string[];
  leadTime: string | null;
  /** False when the product is no longer live: it stays in the list, greyed out. */
  live: boolean;
}

/** The products in a list (78:2628), as cards. No price, ever. */
export async function listCards(
  db: Executor,
  scope: Scope,
  organisationId: string,
  listId: string,
): Promise<ListCard[]> {
  const ids = await listProductIds(db, scope, organisationId, listId);
  if (!ids.length) return [];
  const p = schema.products;
  const c = schema.catalogueCategories;
  const k = schema.catalogueClasses;
  const cp = schema.companyProfiles;
  const org = schema.organisations;
  const rows = await db
    .select({
      id: p.id,
      slug: p.slug,
      name: p.name,
      status: p.status,
      deletedAt: p.deletedAt,
      certifications: p.certifications,
      leadMin: p.leadTimeMinWeeks,
      leadMax: p.leadTimeMaxWeeks,
      category: c.label,
      klass: k.label,
      supplier: cp.tradeName,
      verification: org.verification,
    })
    .from(p)
    .innerJoin(c, eq(c.id, p.categoryId))
    .innerJoin(k, eq(k.id, c.classId))
    .innerJoin(org, eq(org.id, p.organisationId))
    .innerJoin(cp, eq(cp.organisationId, p.organisationId))
    .where(inArray(p.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const r = byId.get(id);
    return r
      ? [
          {
            id: r.id,
            slug: r.slug,
            href: productHref(r.slug),
            name: r.name,
            eyebrow: `${r.klass} · ${r.category}`,
            supplier: { name: r.supplier, verified: r.verification === "Verified" },
            chips: r.certifications.slice(0, 3),
            leadTime: leadTimeLabel(r.leadMin, r.leadMax),
            live: r.status === "Live" && r.deletedAt === null,
          },
        ]
      : [];
  });
}
