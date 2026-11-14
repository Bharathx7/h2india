"use server";

import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { approveRfq, assignModerator, rejectRfq, returnRfq, RfqError } from "@h2india/core/rfq";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// RFQ moderation (629:1148, 632:1138), step 9.4. Core checks queues.edit, audits and sends the notices.

type R = { ok: true } | { ok: false; error: string };

async function operator() {
  const session = await getSession();
  if (!session) throw new Error("Sign in again.");
  return { actor: await loadActor(getDb(), session.user.id), userId: session.user.id };
}

async function run(work: () => Promise<unknown>, id?: string): Promise<R> {
  try {
    await work();
  } catch (error) {
    if (error instanceof RfqError) return { ok: false, error: error.message };
    if (error instanceof Error && /not in|may have changed/.test(error.message))
      return { ok: false, error: "Someone else decided this RFQ already. Refresh to see it." };
    if (error instanceof Error && /Not allowed/.test(error.message))
      return { ok: false, error: "You can't moderate RFQs." };
    throw error;
  }
  revalidatePath("/admin/queues/rfqs");
  if (id) revalidatePath(`/admin/queues/rfqs/${id}`);
  return { ok: true };
}

export async function decideRfqAction(
  id: string,
  outcome: "approve" | "changes" | "reject",
  text: string,
  addSuppliers: string[] = [],
): Promise<R> {
  const { actor } = await operator();
  const context = await requestContext();
  const db = getDb();
  return run(() => {
    if (outcome === "approve") return approveRfq(db, actor, id, context, new Date(), addSuppliers);
    if (outcome === "changes") return returnRfq(db, actor, id, { reasons: [text], note: text }, context);
    return rejectRfq(db, actor, id, { reason: text }, context);
  }, id);
}

export async function assignRfqAction(id: string, toMe: boolean): Promise<R> {
  const { actor, userId } = await operator();
  return run(() => assignModerator(getDb(), actor, id, toMe ? userId : null, undefined), id);
}
