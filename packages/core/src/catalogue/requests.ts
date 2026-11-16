import { schema, type Database, type Executor } from "@h2india/db";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { inScope, type Scope } from "../authz/scope";
import { notify } from "../notify";
import { decideItem, QueueError } from "../queues";
import { changeStatus, type Transitions } from "../status";
import { addCategory } from "./taxonomy";

// Category requests (supplier QC, 16 Nov 2026). A supplier whose product fits no category asks for one; an operator
// in the Category requests queue approves it (adding the category through addCategory, with the name and place they
// settle on) or rejects it with a reason. The supplier's Admin and Catalogue people are told in the app either way;
// the email wording isn't designed yet (M21). Until a request is approved the supplier can't list in it: there is no
// category to choose.

const r = schema.categoryRequests;

export type CategoryRequestStatus = "Pending" | "Approved" | "Rejected";
export const CATEGORY_REQUEST_TRANSITIONS: Transitions = { Pending: ["Approved", "Rejected"] };

/** Limits on what a supplier types (characters). */
export const CATEGORY_REQUEST_LIMITS = { label: 80, description: 600, example: 160 } as const;

/** How many open requests a company may have at once, so the queue can't be flooded. */
export const OPEN_REQUESTS_PER_COMPANY = 10;

export class CategoryRequestError extends Error {
  constructor(
    message: string,
    readonly errors: Record<string, string> = {},
  ) {
    super(message);
  }
}

export interface CategoryRequestInput {
  classId: string;
  parentId?: string | null;
  label: string;
  description: string;
  example?: string | null;
}

/** Field problems in a request, or {}. Pure, so the form shows the same messages. */
export function categoryRequestProblems(input: CategoryRequestInput): Record<string, string> {
  const e: Record<string, string> = {};
  const label = input.label.trim();
  if (!input.classId) e.classId = "Choose a class";
  if (!label) e.label = "Name the category";
  else if (label.length > CATEGORY_REQUEST_LIMITS.label)
    e.label = `Keep the name under ${String(CATEGORY_REQUEST_LIMITS.label)} characters`;
  const description = input.description.trim();
  if (!description) e.description = "Say what products it is for";
  else if (description.length > CATEGORY_REQUEST_LIMITS.description)
    e.description = `Keep this under ${String(CATEGORY_REQUEST_LIMITS.description)} characters`;
  if ((input.example?.trim().length ?? 0) > CATEGORY_REQUEST_LIMITS.example)
    e.example = `Keep this under ${String(CATEGORY_REQUEST_LIMITS.example)} characters`;
  return e;
}

/** Request a category. Needs product.manage in the supplier company. */
export async function requestCategory(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: CategoryRequestInput,
  context?: RequestContext,
): Promise<{ id: string }> {
  assertCan(actor, "product.manage", { organisationId });
  const errors = categoryRequestProblems(input);
  const [klass] = input.classId
    ? await db
        .select({ id: schema.catalogueClasses.id })
        .from(schema.catalogueClasses)
        .where(eq(schema.catalogueClasses.id, input.classId))
    : [];
  if (input.classId && !klass) errors.classId = "Choose a class";
  let parentId: string | null = null;
  if (input.parentId) {
    const c = schema.catalogueCategories;
    const [parent] = await db
      .select({ id: c.id, classId: c.classId, parentId: c.parentId })
      .from(c)
      .where(and(eq(c.id, input.parentId), isNull(c.deletedAt), isNull(c.hiddenAt)));
    if (!parent || parent.classId !== input.classId || parent.parentId)
      errors.parentId = "Choose a category in this class";
    else parentId = parent.id;
  }
  if (Object.keys(errors).length) throw new CategoryRequestError("Check the highlighted fields", errors);
  return db.transaction(async (tx) => {
    const open = await tx
      .select({ id: r.id })
      .from(r)
      .where(and(eq(r.organisationId, organisationId), eq(r.status, "Pending")))
      .for("update");
    if (open.length >= OPEN_REQUESTS_PER_COMPANY)
      throw new CategoryRequestError(
        `You have ${String(OPEN_REQUESTS_PER_COMPANY)} requests waiting. We'll answer those first.`,
      );
    const [row] = await tx
      .insert(r)
      .values({
        organisationId,
        requestedBy: actor.userId,
        classId: input.classId,
        parentId,
        label: input.label.trim(),
        description: input.description.trim(),
        example: input.example?.trim() || null,
      })
      .returning({ id: r.id });
    if (!row) throw new Error("category request was not saved");
    await audit(tx, {
      actorId: actor.userId,
      action: "category_request.created",
      resourceType: "category_request",
      resourceId: row.id,
      companyId: organisationId,
      after: { classId: input.classId, parentId, label: input.label.trim() },
      context,
    });
    return row;
  });
}

const columns = {
  id: r.id,
  organisationId: r.organisationId,
  classId: r.classId,
  parentId: r.parentId,
  label: r.label,
  description: r.description,
  example: r.example,
  status: r.status,
  categoryId: r.categoryId,
  reason: r.reason,
  createdAt: r.createdAt,
  decidedAt: r.decidedAt,
};

/** A company's own requests, newest first (Products · Request a category). Company-owned: scoped. */
export async function companyCategoryRequests(db: Executor, scope: Scope, organisationId: string) {
  return db
    .select(columns)
    .from(r)
    .where(and(inScope(scope, r.organisationId), eq(r.organisationId, organisationId)))
    .orderBy(desc(r.createdAt));
}

/** Open requests for the queue, oldest first, with the company and who asked. */
export async function categoryRequestQueue(db: Executor, actor: Actor) {
  assertCan(actor, "queues.view");
  const rows = await db
    .select({
      ...columns,
      company: schema.organisations.legalName,
      requester: schema.users.name,
    })
    .from(r)
    .innerJoin(schema.organisations, eq(schema.organisations.id, r.organisationId))
    .leftJoin(schema.users, eq(schema.users.id, r.requestedBy))
    .where(eq(r.status, "Pending"))
    .orderBy(r.createdAt);
  return rows;
}

/** One request for the decision page, with where the supplier suggested it goes. */
export async function categoryRequestDetail(db: Executor, actor: Actor, id: string) {
  assertCan(actor, "queues.view");
  const [row] = await db
    .select({
      ...columns,
      company: schema.organisations.legalName,
      requester: schema.users.name,
    })
    .from(r)
    .innerJoin(schema.organisations, eq(schema.organisations.id, r.organisationId))
    .leftJoin(schema.users, eq(schema.users.id, r.requestedBy))
    .where(eq(r.id, id));
  if (!row) return null;
  const c = schema.catalogueCategories;
  const [klass] = await db
    .select({ label: schema.catalogueClasses.label })
    .from(schema.catalogueClasses)
    .where(eq(schema.catalogueClasses.id, row.classId));
  const [parent] = row.parentId ? await db.select({ label: c.label }).from(c).where(eq(c.id, row.parentId)) : [];
  return { ...row, classLabel: klass?.label ?? row.classId, parentLabel: parent?.label ?? null };
}

async function tellSupplier(
  db: Executor,
  organisationId: string,
  requestId: string,
  title: string,
  icon: "check-circle" | "alert-circle",
) {
  const people = await db
    .select({ id: schema.users.id })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(
      and(
        eq(schema.memberships.organisationId, organisationId),
        inArray(schema.memberships.role, ["Admin", "Catalogue"]),
      ),
    );
  for (const person of people)
    await notify({
      event: "category_request.decided",
      topic: "company.verification",
      userId: person.id,
      scope: organisationId,
      inApp: { category: "account", icon, title, href: `/supplier/products/categories#${requestId}` },
    });
}

/**
 * Approve (adds the category, possibly renamed or placed elsewhere) or reject (with a reason) in the Category
 * requests queue. Approving also needs catalogue.edit, since it changes the catalogue.
 */
export async function decideCategoryRequest(
  db: Database,
  actor: Actor,
  input:
    | { id: string; decision: "approve"; classId: string; parentId?: string | null; label: string }
    | { id: string; decision: "reject"; reason: string },
  context?: RequestContext,
): Promise<{ categoryId: string | null }> {
  assertCan(actor, "queues.edit");
  if (input.decision === "approve") assertCan(actor, "catalogue.edit");
  const [request] = await db.select().from(r).where(eq(r.id, input.id));
  if (!request) throw new CategoryRequestError("No such request");
  if (request.status !== "Pending") throw new QueueError("This request has already been decided");
  let categoryId: string | null = null;
  await decideItem(
    db,
    actor,
    {
      queue: "categories",
      subjectId: request.id,
      decision: input.decision,
      reasons: input.decision === "reject" ? [input.reason] : [],
    },
    async () => {
      if (input.decision === "approve") {
        const added = await addCategory(
          db,
          actor,
          { classId: input.classId, parentId: input.parentId ?? null, label: input.label },
          { context },
        );
        if (!added.ok) throw new CategoryRequestError("Check the highlighted fields", added.errors);
        categoryId = added.value.id;
      }
      const now = new Date();
      await changeStatus(db, {
        table: r,
        entityType: "category_request",
        id: request.id,
        from: "Pending",
        to: input.decision === "approve" ? "Approved" : "Rejected",
        actorId: actor.userId,
        companyId: request.organisationId,
        reason: input.decision === "reject" ? input.reason.trim() : undefined,
        transitions: CATEGORY_REQUEST_TRANSITIONS,
        context,
        also: async (tx) => {
          await tx
            .update(r)
            .set({
              categoryId,
              reason: input.decision === "reject" ? input.reason.trim() : null,
              decidedBy: actor.userId,
              decidedAt: now,
              updatedAt: now,
            })
            .where(eq(r.id, request.id));
        },
      });
    },
    context,
  );
  await tellSupplier(
    db,
    request.organisationId,
    request.id,
    input.decision === "approve"
      ? `${input.label.trim()} is now a category. You can list products in it.`
      : `Your request for ${request.label} wasn't approved`,
    input.decision === "approve" ? "check-circle" : "alert-circle",
  ).catch(() => undefined);
  return { categoryId };
}
