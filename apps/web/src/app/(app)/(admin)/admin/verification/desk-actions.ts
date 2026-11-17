"use server";

import { getDb, StatusConflictError } from "@h2india/core";
import { ForbiddenError, loadActor } from "@h2india/core/authz";
import {
  decideDocument,
  decideSupplierReview,
  grantBadge,
  revokeBadge,
  runAutomatedChecks,
  VerificationError,
} from "@h2india/core/supplier";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Verification desk (635:9), step 8.2. Core checks verification.edit and writes the audit log for every decision.

type Result = { ok: true } | { ok: false; error: string };

async function run(
  work: (db: ReturnType<typeof getDb>, actor: Awaited<ReturnType<typeof loadActor>>) => Promise<unknown>,
): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in again." };
  const db = getDb();
  try {
    await work(db, await loadActor(db, session.user.id));
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: "You can see this but not decide it." };
    if (error instanceof VerificationError) return { ok: false, error: error.message };
    // Two operators on the same item (founder QC, 17 Nov 2026: the second got an error page).
    if (error instanceof StatusConflictError)
      return { ok: false, error: "Someone else decided this a moment ago. Refresh to see what they chose." };
    throw error;
  }
  revalidatePath("/admin/verification");
  return { ok: true };
}

export async function decideDocumentAction(
  documentId: string,
  outcome: "Verified" | "Needs re-upload" | "Rejected",
  reason: string,
) {
  const context = await requestContext();
  return run((db, actor) => decideDocument(db, actor, { documentId, outcome, reason, context }));
}

export async function grantBadgeAction(organisationId: string, kind: string, evidence: string) {
  const context = await requestContext();
  return run((db, actor) => grantBadge(db, actor, { organisationId, kind, evidence, context }));
}

export async function revokeBadgeAction(badgeId: string, reason: string, note: string) {
  const context = await requestContext();
  return run((db, actor) => revokeBadge(db, actor, { badgeId, reason, note, context }));
}

export async function runChecksAction(organisationId: string) {
  return run((db, actor) => runAutomatedChecks(db, actor, organisationId));
}

export async function decideReviewAction(
  reviewId: string,
  approve: boolean,
  reason: string,
  checks: Record<string, boolean>,
) {
  const context = await requestContext();
  return run((db, actor) => decideSupplierReview(db, actor, { reviewId, approve, reason, checks, context }));
}
