"use server";

import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { buyerOf } from "@h2india/core/buyer";
import { FlagOffError } from "@h2india/config";
import {
  acceptQuote,
  closeRfq,
  editSentRfq,
  extendOfferDeadline,
  requestRevision,
  RfqError,
  type RfqEdit,
} from "@h2india/core/rfq";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// The buyer's RFQ actions (564:9 menu; 564:577, 566:776, 566:892, 566:1011), step 9.6. The company comes from the
// session; core checks rfq.create, moves the statuses and tells the suppliers.

type R = { ok: true } | { ok: false; error: string };

async function buyer() {
  const session = await getSession();
  if (!session) throw new Error("Sign in again.");
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  const b = await buyerOf(db, actor);
  if (!b) throw new Error("This account has no buyer company.");
  return { db, actor, org: b.organisationId };
}

async function run(id: string, work: () => Promise<unknown>): Promise<R> {
  try {
    await work();
  } catch (error) {
    if (error instanceof RfqError) return { ok: false, error: error.message };
    if (error instanceof Error && /Not allowed/.test(error.message))
      return { ok: false, error: "Your role can't change RFQs. Ask a company admin." };
    if (error instanceof Error && /may have changed/.test(error.message))
      return { ok: false, error: "This RFQ changed. Refresh to see it." };
    throw error;
  }
  revalidatePath(`/buyer/rfqs/${id}`);
  revalidatePath("/buyer/rfqs");
  return { ok: true };
}

export async function extendAction(id: string, day: string, time: string, why: string) {
  const { db, actor, org } = await buyer();
  const to = new Date(`${day}T${time}:00+05:30`);
  if (Number.isNaN(to.getTime())) return { ok: false as const, error: "Choose a date and time" };
  const context = await requestContext();
  return run(id, () => extendOfferDeadline(db, actor, org, id, to, context, new Date(), why));
}

/** Edit RFQ after sending (564:383): a new version, told to every supplier. */
export async function editRfqAction(id: string, edit: RfqEdit) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  return run(id, () => editSentRfq(db, actor, org, id, edit, context));
}

export async function closeAction(id: string, why: string, note: string) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  return run(id, () => closeRfq(db, actor, org, id, { reason: "closed", why, note }, context));
}

export async function declineAllAction(id: string, why: string, note: string) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  return run(id, () => closeRfq(db, actor, org, id, { reason: "declined all", why, note }, context));
}

export async function revisionAction(id: string, quoteId: string, aspects: string[], message: string) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  return run(id, () => requestRevision(db, actor, org, id, { quoteId, aspects, message }, context));
}

/** Accept a quote (569:9). Core refuses on the server while transactions are off (C8), whatever calls it. */
export async function acceptAction(id: string, quoteId: string) {
  const { db, actor, org } = await buyer();
  const context = await requestContext();
  try {
    await acceptQuote(db, actor, org, { rfqId: id, quoteId }, context);
  } catch (error) {
    if (error instanceof FlagOffError) return { ok: false as const, error: "Ordering opens in Launch 2." };
    if (error instanceof RfqError) return { ok: false as const, error: error.message };
    throw error;
  }
  revalidatePath(`/buyer/rfqs/${id}`);
  return { ok: true as const };
}
