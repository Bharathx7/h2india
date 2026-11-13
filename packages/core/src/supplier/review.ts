import { schema, type Database, type Executor } from "@h2india/db";
import { and, desc, eq } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { can } from "../authz/can";
import { inScope, scopeFor, type Scope } from "../authz/scope";
import { buildChecklist, canSubmitForReview, supplierFacts } from "./checklist";

// "Submit for review" (584:8 step 5), step 8.1. Operators decide it in the Verification desk (step 8.2).

const r = schema.supplierReviews;

export const REVIEW_TRANSITIONS = {
  Submitted: ["Approved", "Changes requested"],
  "Changes requested": [],
  Approved: [],
} as const;

export class SupplierReviewError extends Error {}

export async function latestReview(db: Executor, scope: Scope, organisationId: string) {
  const [row] = await db
    .select()
    .from(r)
    .where(and(inScope(scope, r.organisationId), eq(r.organisationId, organisationId)))
    .orderBy(desc(r.submittedAt))
    .limit(1);
  return row ?? null;
}

export async function submitForReview(
  db: Database,
  actor: Actor,
  organisationId: string,
  context?: RequestContext,
): Promise<{ id: string }> {
  if (!can(actor, "company.manage", { organisationId }))
    throw new SupplierReviewError("Only a company admin can submit");
  const checklist = buildChecklist(await supplierFacts(db, organisationId));
  if (!canSubmitForReview(checklist)) throw new SupplierReviewError("Finish the steps above first");
  const latest = await latestReview(db, scopeFor(actor), organisationId);
  if (latest?.status === "Submitted") return { id: latest.id };
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(r).values({ organisationId, submittedBy: actor.userId }).returning({ id: r.id });
    if (!row) throw new Error("review not saved");
    await audit(tx, {
      actorId: actor.userId,
      action: "supplier.review.submitted",
      resourceType: "supplier_review",
      resourceId: row.id,
      companyId: organisationId,
      after: { status: "Submitted" },
      context,
    });
    return row;
  });
}
