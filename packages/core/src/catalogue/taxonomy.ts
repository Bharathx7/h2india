import { schema, type Database, type Executor } from "@h2india/db";
import { and, asc, desc, eq, inArray, isNull, max, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import {
  ATTRIBUTE_TYPE_LABEL,
  changeNeedsMigration,
  checkAttribute,
  DISPLAY_GROUPS,
  formatAllowedValues,
  keyFromLabel,
  type AttributeDef,
  type AttributeInput,
  type AttributeType,
  type CheckedAttribute,
} from "./attributes";

// The catalogue's taxonomy (step 6.1): reads for admin Catalogue (636:596) and the operator's changes. Every change
// checks catalogue.edit, writes the audit log (before and after) and one line of change history, in one transaction.
// Public pages (steps 6.2 to 6.5) read the live schema with categorySchema(); a new filterable attribute is a filter
// at once, because product documents keep their values under `attributes`, which the products index already filters.

const cls = schema.catalogueClasses;
const cat = schema.catalogueCategories;
const app = schema.catalogueApplications;
const attr = schema.catalogueAttributes;
const changes = schema.catalogueChanges;
const users = schema.users;

export type ClassId = "systems" | "components" | "equipment" | "services" | "materials";

export interface TreeNode {
  id: string;
  label: string;
  slug: string;
  hidden: boolean;
  sample: boolean;
  /** Live listings. Products arrive in step 8.3; until then every count is 0 (the frames' counts are sample). */
  liveProducts: number;
  children: TreeNode[];
}

export interface TreeClass {
  id: ClassId;
  label: string;
  liveProducts: number;
  categories: TreeNode[];
}

export interface AttributeRow extends AttributeDef {
  id: string;
  sample: boolean;
  /** Added in the last 7 days: the "New" badge on 636:596. */
  isNew: boolean;
}

export interface CategoryChange {
  at: Date;
  who: string;
  summary: string;
}

export interface CategoryDetail {
  id: string;
  classId: ClassId;
  classLabel: string;
  parentId: string | null;
  parentLabel: string | null;
  label: string;
  hidden: boolean;
  sample: boolean;
  liveProducts: number;
  attributes: AttributeRow[];
  lastChange: CategoryChange | null;
  /** Display groups to offer in the dialog: the drawn three, then any others this category uses. */
  groups: string[];
  /** The applications it is listed under (browse by application, step 6.2). */
  applicationIds: string[];
}

export class CatalogueError extends Error {
  constructor(
    message: string,
    readonly field: string = "_",
  ) {
    super(message);
    this.name = "CatalogueError";
  }
}

const NEW_FOR_MS = 7 * 86_400_000;

/** The whole tree for the admin screen, sample and hidden categories included (they are marked). */
export async function catalogueTree(db: Executor, actor: Actor): Promise<TreeClass[]> {
  assertCan(actor, "catalogue.view");
  const [classes, rows] = await Promise.all([
    db.select().from(cls).orderBy(asc(cls.position)),
    db.select().from(cat).where(isNull(cat.deletedAt)).orderBy(asc(cat.position), asc(cat.label)),
  ]);
  const node = (r: typeof cat.$inferSelect): TreeNode => ({
    id: r.id,
    label: r.label,
    slug: r.slug,
    hidden: r.hiddenAt !== null,
    sample: r.sample,
    liveProducts: 0,
    children: rows.filter((c) => c.parentId === r.id).map(node),
  });
  return classes.map((c) => ({
    id: c.id as ClassId,
    label: c.label,
    liveProducts: 0,
    categories: rows.filter((r) => r.classId === c.id && r.parentId === null).map(node),
  }));
}

/** A definition as a plain object for the audit log. */
const plain = (d: AttributeDef | CheckedAttribute): Record<string, unknown> => ({ ...d });

const toDef = (r: typeof attr.$inferSelect): AttributeDef => ({
  key: r.key,
  label: r.label,
  type: r.type as AttributeType,
  unit: r.unit,
  min: r.min,
  max: r.max,
  options: r.options,
  hint: r.hint,
  required: r.required,
  filterable: r.filterable,
  comparable: r.comparable,
  testCondition: r.testCondition,
  displayGroup: r.displayGroup,
  position: r.position,
});

async function liveAttributes(db: Executor, categoryId: string) {
  return db
    .select()
    .from(attr)
    .where(and(eq(attr.categoryId, categoryId), isNull(attr.deletedAt)))
    .orderBy(asc(attr.position), asc(attr.createdAt));
}

/**
 * A category's schema, in display order: what the product form, the import, filters, compare and the spec table
 * use. No permission needed; it holds no private data.
 */
export async function categorySchema(db: Executor, categoryId: string): Promise<AttributeDef[]> {
  return (await liveAttributes(db, categoryId)).map(toDef);
}

/** The attributes the category page offers as filters (step 6.3). */
export async function filterableAttributes(db: Executor, categoryId: string): Promise<AttributeDef[]> {
  return (await categorySchema(db, categoryId)).filter((d) => d.filterable);
}

async function categoryRow(db: Executor, id: string) {
  const [row] = await db
    .select()
    .from(cat)
    .where(and(eq(cat.id, id), isNull(cat.deletedAt)))
    .limit(1);
  if (!row) throw new CatalogueError("This category no longer exists");
  return row;
}

export async function categoryDetail(
  db: Executor,
  actor: Actor,
  categoryId: string,
  now = new Date(),
): Promise<CategoryDetail | null> {
  assertCan(actor, "catalogue.view");
  const [row] = await db
    .select({ c: cat, classLabel: cls.label })
    .from(cat)
    .innerJoin(cls, eq(cls.id, cat.classId))
    .where(and(eq(cat.id, categoryId), isNull(cat.deletedAt)))
    .limit(1);
  if (!row) return null;
  const [attributes, parent, [last], links] = await Promise.all([
    liveAttributes(db, categoryId),
    row.c.parentId ? categoryRow(db, row.c.parentId) : Promise.resolve(null),
    categoryHistory(db, actor, categoryId, 1),
    db
      .select()
      .from(schema.catalogueCategoryApplications)
      .where(eq(schema.catalogueCategoryApplications.categoryId, categoryId)),
  ]);
  const used = [...new Set(attributes.map((a) => a.displayGroup))];
  return {
    id: row.c.id,
    classId: row.c.classId as ClassId,
    classLabel: row.classLabel,
    parentId: row.c.parentId,
    parentLabel: parent?.label ?? null,
    label: row.c.label,
    hidden: row.c.hiddenAt !== null,
    sample: row.c.sample,
    liveProducts: 0,
    attributes: attributes.map((a) => ({
      ...toDef(a),
      id: a.id,
      sample: a.sample,
      // Only what an operator added recently; the launch schema from the seed migration has no author.
      isNew: a.createdBy !== null && now.getTime() - a.createdAt.getTime() < NEW_FOR_MS,
    })),
    lastChange: last ?? null,
    groups: [...DISPLAY_GROUPS, ...used.filter((g) => !(DISPLAY_GROUPS as readonly string[]).includes(g))],
    applicationIds: links.map((l) => l.applicationId),
  };
}

/** Change history (636:596), newest first. "See full history" passes no limit. */
export async function categoryHistory(
  db: Executor,
  actor: Actor,
  categoryId: string,
  limit = 100,
): Promise<CategoryChange[]> {
  assertCan(actor, "catalogue.view");
  const rows = await db
    .select({ at: changes.at, summary: changes.summary, name: users.name, email: users.email })
    .from(changes)
    .leftJoin(users, eq(users.id, changes.actorId))
    .where(eq(changes.categoryId, categoryId))
    .orderBy(desc(changes.at), desc(changes.id))
    .limit(Math.min(limit, 500));
  return rows.map((r) => ({ at: r.at, who: r.name || r.email || "H2 India", summary: r.summary }));
}

/**
 * How many products store a value for an attribute. Products arrive in step 8.3, which turns this into a count over
 * their attribute values (taking the attribute); until then nothing uses an attribute, so every change is allowed.
 */
export function productsUsingAttribute(): number {
  return 0;
}

async function record(
  tx: Executor,
  input: {
    actor: Actor;
    categoryId: string;
    summary: string;
    action: string;
    resourceType: "catalogue_category" | "catalogue_attribute";
    resourceId: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    context?: RequestContext;
    now: Date;
  },
) {
  await tx
    .insert(changes)
    .values({ categoryId: input.categoryId, actorId: input.actor.userId, summary: input.summary, at: input.now });
  await audit(tx, {
    actorId: input.actor.userId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    before: input.before,
    after: input.after,
    context: input.context,
  });
}

/** "Noise level (dB(A), test condition: at 1 m, optional)", as in the drawn history. */
function describeNew(v: CheckedAttribute): string {
  const bits = [
    v.unit,
    v.type === "choice" ? formatAllowedValues(v) : null,
    v.testCondition ? `test condition: ${v.testCondition.charAt(0).toLowerCase()}${v.testCondition.slice(1)}` : null,
    v.required ? "required" : "optional",
  ].filter(Boolean);
  return `${v.label} (${bits.join(", ")})`;
}

const onOff = (on: boolean, word: string) => (on ? word : `not ${word}`);

/** "renamed Capacity to Flow rate and set the unit to Nm³/h", as in the drawn history. */
export function describeEdit(before: AttributeDef, after: CheckedAttribute): string | null {
  const renamed = before.label !== after.label;
  const of = renamed ? "" : ` of ${after.label}`;
  const subject = renamed ? "it" : after.label;
  const parts: string[] = [];
  if (renamed) parts.push(`renamed ${before.label} to ${after.label}`);
  if (before.type !== after.type) parts.push(`changed the type${of} to ${ATTRIBUTE_TYPE_LABEL[after.type]}`);
  if ((before.unit ?? "") !== (after.unit ?? "")) {
    parts.push(after.unit ? `set the unit${of} to ${after.unit}` : `removed the unit${of}`);
  }
  if (formatAllowedValues(before) !== formatAllowedValues(after)) {
    parts.push(`set the allowed values${of} to ${formatAllowedValues(after)}`);
  }
  if (before.required !== after.required) parts.push(`made ${subject} ${after.required ? "required" : "optional"}`);
  if (before.filterable !== after.filterable) parts.push(`made ${subject} ${onOff(after.filterable, "filterable")}`);
  if (before.comparable !== after.comparable) parts.push(`made ${subject} ${onOff(after.comparable, "comparable")}`);
  if ((before.testCondition ?? "") !== (after.testCondition ?? "")) {
    parts.push(
      after.testCondition ? `set the test condition${of} to ${after.testCondition}` : `removed the test condition${of}`,
    );
  }
  if (before.displayGroup !== after.displayGroup) parts.push(`moved ${subject} to ${after.displayGroup}`);
  if (!parts.length) return null;
  return parts.length === 1 ? (parts[0] ?? null) : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1) ?? ""}`;
}

type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** Add attribute (637:417). The new attribute goes last in its display group's order. */
export async function addAttribute(
  db: Database,
  actor: Actor,
  categoryId: string,
  input: AttributeInput,
  opts: { context?: RequestContext; now?: Date } = {},
): Promise<Result<{ id: string; key: string }>> {
  assertCan(actor, "catalogue.edit");
  const now = opts.now ?? new Date();
  return db.transaction(async (tx): Promise<Result<{ id: string; key: string }>> => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`catalogue:${categoryId}`}))`);
    await categoryRow(tx, categoryId);
    const existing = await liveAttributes(tx, categoryId);
    const checked = checkAttribute(
      input,
      existing.map((a) => a.label),
    );
    if (!checked.ok) return checked;
    const v = checked.value;
    const key = keyFromLabel(v.label);
    // A key a removed attribute had would mix its old product values with the new attribute's.
    const [reused] = await tx
      .select({ id: attr.id })
      .from(attr)
      .where(and(eq(attr.categoryId, categoryId), eq(attr.key, key)))
      .limit(1);
    if (reused) {
      return { ok: false, errors: { label: `${v.label} was removed from this category before. Choose another name.` } };
    }
    const [{ next } = { next: 0 }] = await tx
      .select({ next: max(attr.position) })
      .from(attr)
      .where(eq(attr.categoryId, categoryId));
    const [row] = await tx
      .insert(attr)
      .values({
        categoryId,
        key,
        ...v,
        position: (next ?? 0) + 1,
        createdBy: actor.userId,
        updatedBy: actor.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: attr.id });
    if (!row) throw new Error("attribute was not saved");
    await record(tx, {
      actor,
      categoryId,
      summary: `added ${describeNew(v)}`,
      action: "catalogue.attribute.added",
      resourceType: "catalogue_attribute",
      resourceId: row.id,
      after: { categoryId, key, ...v },
      context: opts.context,
      now,
    });
    return { ok: true, value: { id: row.id, key } };
  });
}

async function attributeRow(db: Executor, id: string) {
  const [row] = await db
    .select()
    .from(attr)
    .where(and(eq(attr.id, id), isNull(attr.deletedAt)))
    .limit(1);
  if (!row) throw new CatalogueError("This attribute no longer exists");
  return row;
}

/** Edit attribute (not drawn, A11; the Add attribute dialog filled in). The key never changes. */
export async function updateAttribute(
  db: Database,
  actor: Actor,
  attributeId: string,
  input: AttributeInput,
  opts: { context?: RequestContext; now?: Date } = {},
): Promise<Result<{ changed: boolean }>> {
  assertCan(actor, "catalogue.edit");
  const now = opts.now ?? new Date();
  return db.transaction(async (tx): Promise<Result<{ changed: boolean }>> => {
    const row = await attributeRow(tx, attributeId);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`catalogue:${row.categoryId}`}))`);
    const others = (await liveAttributes(tx, row.categoryId)).filter((a) => a.id !== attributeId);
    const checked = checkAttribute(
      input,
      others.map((a) => a.label),
    );
    if (!checked.ok) return checked;
    const before = toDef(row);
    const v = checked.value;
    const blocked = changeNeedsMigration(before, v, productsUsingAttribute());
    if (blocked) return { ok: false, errors: { type: blocked } };
    const summary = describeEdit(before, v);
    if (!summary) return { ok: true, value: { changed: false } };
    await tx
      .update(attr)
      .set({ ...v, updatedBy: actor.userId, updatedAt: now })
      .where(eq(attr.id, attributeId));
    await record(tx, {
      actor,
      categoryId: row.categoryId,
      summary,
      action: "catalogue.attribute.changed",
      resourceType: "catalogue_attribute",
      resourceId: attributeId,
      before: plain(before),
      after: plain({ ...before, ...v }),
      context: opts.context,
      now,
    });
    return { ok: true, value: { changed: true } };
  });
}

/** Remove attribute. Refused once products use it (their values would be orphaned); soft-deleted otherwise. */
export async function removeAttribute(
  db: Database,
  actor: Actor,
  attributeId: string,
  opts: { context?: RequestContext; now?: Date } = {},
): Promise<void> {
  assertCan(actor, "catalogue.edit");
  const now = opts.now ?? new Date();
  await db.transaction(async (tx) => {
    const row = await attributeRow(tx, attributeId);
    if (productsUsingAttribute() > 0) {
      throw new CatalogueError(
        "Products already use this attribute, so it can't be removed. Make it optional instead.",
      );
    }
    await tx
      .update(attr)
      .set({ deletedAt: now, updatedBy: actor.userId, updatedAt: now })
      .where(eq(attr.id, attributeId));
    await record(tx, {
      actor,
      categoryId: row.categoryId,
      summary: `removed ${row.label}`,
      action: "catalogue.attribute.removed",
      resourceType: "catalogue_attribute",
      resourceId: attributeId,
      before: plain(toDef(row)),
      context: opts.context,
      now,
    });
  });
}

/** Move an attribute up or down in its category's order (the spec table and the form follow it). */
export async function moveAttribute(
  db: Database,
  actor: Actor,
  attributeId: string,
  direction: "up" | "down",
  opts: { context?: RequestContext; now?: Date } = {},
): Promise<void> {
  assertCan(actor, "catalogue.edit");
  const now = opts.now ?? new Date();
  await db.transaction(async (tx) => {
    const row = await attributeRow(tx, attributeId);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`catalogue:${row.categoryId}`}))`);
    const list = await liveAttributes(tx, row.categoryId);
    const i = list.findIndex((a) => a.id === attributeId);
    const j = direction === "up" ? i - 1 : i + 1;
    const other = list[j];
    if (i < 0 || !other) return;
    // Renumber the whole list so equal positions can't leave the order undecided.
    const order = list.map((a) => a.id);
    [order[i], order[j]] = [other.id, attributeId];
    for (const [n, id] of order.entries()) {
      await tx
        .update(attr)
        .set({ position: n + 1 })
        .where(eq(attr.id, id));
    }
    await record(tx, {
      actor,
      categoryId: row.categoryId,
      summary: `moved ${row.label} ${direction === "up" ? "above" : "below"} ${other.label}`,
      action: "catalogue.attribute.moved",
      resourceType: "catalogue_attribute",
      resourceId: attributeId,
      before: { position: i + 1 },
      after: { position: j + 1 },
      context: opts.context,
      now,
    });
  });
}

const CATEGORY_LABEL_MAX = 60;

/** "Tanks & cylinders" → "tanks-cylinders". */
export const slugFromLabel = (label: string) =>
  label
    .normalize("NFKD")
    .replace(/&/g, " ")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

async function checkCategoryLabel(
  tx: Executor,
  label: string,
  where: { classId: string; parentId: string | null },
  exceptId?: string,
): Promise<{ label: string; slug: string } | { error: string }> {
  const clean = label.trim().replace(/\s+/g, " ");
  if (!clean) return { error: "Enter a name" };
  if (clean.length > CATEGORY_LABEL_MAX) return { error: `Keep the name to ${String(CATEGORY_LABEL_MAX)} characters` };
  const slug = slugFromLabel(clean);
  if (!slug) return { error: "Use letters or numbers in the name" };
  const siblings = await tx
    .select({ id: cat.id, slug: cat.slug })
    .from(cat)
    .where(
      and(
        eq(cat.classId, where.classId),
        where.parentId ? eq(cat.parentId, where.parentId) : isNull(cat.parentId),
        isNull(cat.deletedAt),
      ),
    );
  if (siblings.some((s) => s.slug === slug && s.id !== exceptId)) {
    return { error: `There is already a category called ${clean} here` };
  }
  return { label: clean, slug };
}

/** Add category (not drawn, A11): a category in a class, or a sub-category under a category. Two levels only. */
export async function addCategory(
  db: Database,
  actor: Actor,
  input: { classId: string; parentId?: string | null; label: string },
  opts: { context?: RequestContext; now?: Date } = {},
): Promise<Result<{ id: string }>> {
  assertCan(actor, "catalogue.edit");
  const now = opts.now ?? new Date();
  return db.transaction(async (tx): Promise<Result<{ id: string }>> => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('catalogue:tree'))`);
    const [klass] = await tx.select().from(cls).where(eq(cls.id, input.classId)).limit(1);
    if (!klass) return { ok: false, errors: { classId: "Choose a class" } };
    let parentId: string | null = null;
    if (input.parentId) {
      const parent = await categoryRow(tx, input.parentId);
      if (parent.parentId)
        return { ok: false, errors: { parentId: "Sub-categories can't have their own sub-categories" } };
      if (parent.classId !== klass.id) return { ok: false, errors: { parentId: "Choose a category in this class" } };
      parentId = parent.id;
    }
    const checked = await checkCategoryLabel(tx, input.label, { classId: klass.id, parentId });
    if ("error" in checked) return { ok: false, errors: { label: checked.error } };
    const [{ next } = { next: 0 }] = await tx
      .select({ next: max(cat.position) })
      .from(cat)
      .where(and(eq(cat.classId, klass.id), parentId ? eq(cat.parentId, parentId) : isNull(cat.parentId)));
    const [row] = await tx
      .insert(cat)
      .values({
        classId: klass.id,
        parentId,
        ...checked,
        position: (next ?? 0) + 1,
        createdBy: actor.userId,
        updatedBy: actor.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: cat.id });
    if (!row) throw new Error("category was not saved");
    await record(tx, {
      actor,
      categoryId: row.id,
      summary: `added the ${parentId ? "sub-category" : "category"} ${checked.label}`,
      action: "catalogue.category.added",
      resourceType: "catalogue_category",
      resourceId: row.id,
      after: { classId: klass.id, parentId, ...checked },
      context: opts.context,
      now,
    });
    return { ok: true, value: { id: row.id } };
  });
}

/** Hide category (296:9777) and Show it again. Hidden categories leave every public list; products keep their place. */
export async function setCategoryHidden(
  db: Database,
  actor: Actor,
  categoryId: string,
  hidden: boolean,
  opts: { context?: RequestContext; now?: Date } = {},
): Promise<void> {
  assertCan(actor, "catalogue.edit");
  const now = opts.now ?? new Date();
  await db.transaction(async (tx) => {
    const row = await categoryRow(tx, categoryId);
    if ((row.hiddenAt !== null) === hidden) return;
    await tx
      .update(cat)
      .set({ hiddenAt: hidden ? now : null, updatedBy: actor.userId, updatedAt: now })
      .where(eq(cat.id, categoryId));
    await record(tx, {
      actor,
      categoryId,
      summary: hidden ? `hid ${row.label}` : `showed ${row.label} again`,
      action: hidden ? "catalogue.category.hidden" : "catalogue.category.shown",
      resourceType: "catalogue_category",
      resourceId: categoryId,
      before: { hidden: !hidden },
      after: { hidden },
      context: opts.context,
      now,
    });
  });
}

/**
 * Move to another main group (296:9777): a top-level category and its sub-categories move to another class.
 * Products follow their category, so nothing else changes.
 */
export async function moveCategory(
  db: Database,
  actor: Actor,
  categoryId: string,
  classId: string,
  opts: { context?: RequestContext; now?: Date } = {},
): Promise<Result<null>> {
  assertCan(actor, "catalogue.edit");
  const now = opts.now ?? new Date();
  return db.transaction(async (tx): Promise<Result<null>> => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('catalogue:tree'))`);
    const row = await categoryRow(tx, categoryId);
    if (row.parentId)
      return { ok: false, errors: { classId: "Move its category instead; sub-categories move with it" } };
    const [to] = await tx.select().from(cls).where(eq(cls.id, classId)).limit(1);
    if (!to) return { ok: false, errors: { classId: "Choose a class" } };
    if (to.id === row.classId) return { ok: true, value: null };
    const checked = await checkCategoryLabel(tx, row.label, { classId: to.id, parentId: null });
    if ("error" in checked) return { ok: false, errors: { classId: checked.error } };
    const [from] = await tx.select({ label: cls.label }).from(cls).where(eq(cls.id, row.classId)).limit(1);
    const family = [
      categoryId,
      ...(await tx.select({ id: cat.id }).from(cat).where(eq(cat.parentId, categoryId))).map((c) => c.id),
    ];
    await tx
      .update(cat)
      .set({ classId: to.id, updatedBy: actor.userId, updatedAt: now })
      .where(inArray(cat.id, family));
    await record(tx, {
      actor,
      categoryId,
      summary: `moved ${row.label} from ${from?.label ?? row.classId} to ${to.label}`,
      action: "catalogue.category.moved",
      resourceType: "catalogue_category",
      resourceId: categoryId,
      before: { classId: row.classId },
      after: { classId: to.id },
      context: opts.context,
      now,
    });
    return { ok: true, value: null };
  });
}

/** Duplicate category (296:9777): a hidden copy beside it with the same attributes, for an operator to adjust. */
export async function duplicateCategory(
  db: Database,
  actor: Actor,
  categoryId: string,
  opts: { context?: RequestContext; now?: Date } = {},
): Promise<{ id: string }> {
  assertCan(actor, "catalogue.edit");
  const now = opts.now ?? new Date();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('catalogue:tree'))`);
    const row = await categoryRow(tx, categoryId);
    let label = `${row.label} (copy)`;
    for (let n = 2; ; n++) {
      const checked = await checkCategoryLabel(tx, label, { classId: row.classId, parentId: row.parentId });
      if (!("error" in checked)) break;
      label = `${row.label} (copy ${String(n)})`;
    }
    const [copy] = await tx
      .insert(cat)
      .values({
        classId: row.classId,
        parentId: row.parentId,
        label,
        slug: slugFromLabel(label),
        position: row.position,
        // Hidden until an operator renames it and shows it, so a half-made copy never reaches buyers.
        hiddenAt: now,
        sample: row.sample,
        createdBy: actor.userId,
        updatedBy: actor.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: cat.id });
    if (!copy) throw new Error("category was not copied");
    const attributes = await liveAttributes(tx, categoryId);
    if (attributes.length) {
      await tx.insert(attr).values(
        attributes.map((a) => ({
          ...toDef(a),
          categoryId: copy.id,
          sample: a.sample,
          createdBy: actor.userId,
          updatedBy: actor.userId,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }
    await record(tx, {
      actor,
      categoryId: copy.id,
      summary: `copied ${row.label} with its ${String(attributes.length)} attributes`,
      action: "catalogue.category.duplicated",
      resourceType: "catalogue_category",
      resourceId: copy.id,
      after: { from: categoryId, label, attributes: attributes.length },
      context: opts.context,
      now,
    });
    return { id: copy.id };
  });
}

/** Rename a category (not drawn, A11). The address word (slug) stays, so links keep working. */
export async function renameCategory(
  db: Database,
  actor: Actor,
  categoryId: string,
  label: string,
  opts: { context?: RequestContext; now?: Date } = {},
): Promise<Result<null>> {
  assertCan(actor, "catalogue.edit");
  const now = opts.now ?? new Date();
  return db.transaction(async (tx): Promise<Result<null>> => {
    const row = await categoryRow(tx, categoryId);
    const checked = await checkCategoryLabel(tx, label, { classId: row.classId, parentId: row.parentId }, categoryId);
    if ("error" in checked) return { ok: false, errors: { label: checked.error } };
    if (checked.label === row.label) return { ok: true, value: null };
    await tx
      .update(cat)
      .set({ label: checked.label, updatedBy: actor.userId, updatedAt: now })
      .where(eq(cat.id, categoryId));
    await record(tx, {
      actor,
      categoryId,
      summary: `renamed ${row.label} to ${checked.label}`,
      action: "catalogue.category.renamed",
      resourceType: "catalogue_category",
      resourceId: categoryId,
      before: { label: row.label },
      after: { label: checked.label },
      context: opts.context,
      now,
    });
    return { ok: true, value: null };
  });
}

export interface ApplicationRow {
  id: string;
  label: string;
  shortLabel: string;
  examples: string;
  hidden: boolean;
}

/** The browse-by-application axis, in order. Public pages pass `includeHidden: false`. */
export async function catalogueApplications(
  db: Executor,
  opts: { includeHidden?: boolean } = {},
): Promise<ApplicationRow[]> {
  const rows = await db
    .select()
    .from(app)
    .where(opts.includeHidden ? undefined : isNull(app.hiddenAt))
    .orderBy(asc(app.position));
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    shortLabel: r.shortLabel,
    examples: r.examples,
    hidden: r.hiddenAt !== null,
  }));
}

/** Which applications a category is listed under (step 6.2). Replaces the whole set; recorded in the history. */
export async function setCategoryApplications(
  db: Database,
  actor: Actor,
  categoryId: string,
  applicationIds: string[],
  opts: { context?: RequestContext; now?: Date } = {},
): Promise<Result<null>> {
  assertCan(actor, "catalogue.edit");
  const now = opts.now ?? new Date();
  const links = schema.catalogueCategoryApplications;
  return db.transaction(async (tx): Promise<Result<null>> => {
    const row = await categoryRow(tx, categoryId);
    const all = await tx.select().from(app);
    const wanted = [...new Set(applicationIds)];
    if (wanted.some((id) => !all.some((a) => a.id === id))) return { ok: false, errors: { _: "Choose from the list" } };
    const before = (await tx.select().from(links).where(eq(links.categoryId, categoryId))).map((l) => l.applicationId);
    if (before.length === wanted.length && before.every((id) => wanted.includes(id))) return { ok: true, value: null };
    await tx.delete(links).where(eq(links.categoryId, categoryId));
    if (wanted.length) await tx.insert(links).values(wanted.map((applicationId) => ({ categoryId, applicationId })));
    const names = all.filter((a) => wanted.includes(a.id)).map((a) => a.shortLabel);
    await record(tx, {
      actor,
      categoryId,
      summary: names.length
        ? `listed ${row.label} under ${names.join(", ")}`
        : `took ${row.label} out of every application`,
      action: "catalogue.category.applications",
      resourceType: "catalogue_category",
      resourceId: categoryId,
      before: { applicationIds: before },
      after: { applicationIds: wanted },
      context: opts.context,
      now,
    });
    return { ok: true, value: null };
  });
}
