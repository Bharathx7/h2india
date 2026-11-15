"use server";

import { Money } from "@h2india/core";
import {
  acceptDelivery,
  acceptDisputeOffer,
  approveOrder,
  cancelOrder,
  escalateDispute,
  OrderError,
  rejectApproval,
  reportProblem,
  requestDispatchDate,
  startOnlinePayment,
} from "@h2india/core/orders";
import { revalidatePath } from "next/cache";
import { cartBuyer } from "@/cart/session";
import { requestContext } from "@/server/request-context";

// Buyer order actions (steps 10.3, 10.5, 10.10). The company is the person's own buyer company.

export type BuyerOrderResult =
  { ok: true; url?: string } | { ok: false; error: string; errors?: Record<string, string> };

async function run(orderId: string, work: () => Promise<{ url?: string } | undefined>): Promise<BuyerOrderResult> {
  try {
    const r = await work();
    revalidatePath(`/buyer/orders/${orderId}`);
    revalidatePath("/buyer/orders");
    return { ok: true, url: r ? r.url : undefined };
  } catch (error) {
    if (error instanceof OrderError) {
      const messages: Record<string, string> = {
        step_up: "Confirm it's you with your passkey first.",
        quote_expired: "The quote this order came from has expired. Ask the supplier for a revised quote.",
        retry_limit: "You've tried this payment 3 times. Pay by bank transfer instead, or try again tomorrow.",
      };
      return { ok: false, error: messages[error.message] ?? error.message, errors: error.errors };
    }
    throw error;
  }
}

async function me() {
  const m = await cartBuyer();
  if (!m) throw new OrderError("Sign in again.");
  return m;
}

export async function approveAction(orderId: string, note: string) {
  const m = await me();
  return run(orderId, async () => {
    await approveOrder(m.db, m.actor, m.buyer.organisationId, orderId, { note }, await requestContext());
    return undefined;
  });
}

export async function rejectAction(orderId: string, reason: string) {
  const m = await me();
  return run(orderId, async () => {
    await rejectApproval(m.db, m.actor, m.buyer.organisationId, orderId, reason, await requestContext());
    return undefined;
  });
}

export async function cancelAction(orderId: string, reason: string) {
  const m = await me();
  return run(orderId, async () => {
    await cancelOrder(m.db, m.actor, m.buyer.organisationId, orderId, reason, await requestContext());
    return undefined;
  });
}

export async function payOnlineAction(orderId: string, milestoneId: string, method: "upi" | "card" | "netbanking") {
  const m = await me();
  return run(orderId, async () => {
    const c = await startOnlinePayment(
      m.db,
      m.actor,
      m.buyer.organisationId,
      { orderId, milestoneId, method },
      await requestContext(),
    );
    return { url: c.checkoutUrl };
  });
}

export async function acceptDeliveryAction(orderId: string) {
  const m = await me();
  return run(orderId, async () => {
    await acceptDelivery(m.db, m.actor, m.buyer.organisationId, orderId, await requestContext());
    return undefined;
  });
}

export async function reportProblemAction(
  orderId: string,
  form: { reason: string; details: string; fix: string; accepted: string; fileIds: string[] },
) {
  const m = await me();
  let acceptedPaise = 0n;
  if (form.accepted.trim()) {
    try {
      acceptedPaise = Money.parse(form.accepted);
    } catch {
      return {
        ok: false as const,
        error: "Enter the amount in rupees",
        errors: { accepted: "Enter an amount like 14,75,000" },
      };
    }
  }
  return run(orderId, async () => {
    await reportProblem(
      m.db,
      m.actor,
      m.buyer.organisationId,
      orderId,
      { reason: form.reason, details: form.details, fix: form.fix, acceptedPaise, photoFileIds: form.fileIds },
      await requestContext(),
    );
    return undefined;
  });
}

export async function acceptOfferAction(orderId: string, disputeId: string) {
  const m = await me();
  return run(orderId, async () => {
    await acceptDisputeOffer(m.db, m.actor, m.buyer.organisationId, disputeId, await requestContext());
    return undefined;
  });
}

export async function escalateAction(orderId: string, disputeId: string) {
  const m = await me();
  return run(orderId, async () => {
    await escalateDispute(m.db, m.actor, m.buyer.organisationId, disputeId, await requestContext());
    return undefined;
  });
}

export async function requestDateAction(orderId: string, date: string, reason: string) {
  const m = await me();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return { ok: false as const, error: "Choose a date", errors: { date: "Choose a date" } };
  return run(orderId, async () => {
    await requestDispatchDate(
      m.db,
      m.actor,
      m.buyer.organisationId,
      orderId,
      { date: new Date(`${date}T00:00:00+05:30`), reason },
      await requestContext(),
    );
    return undefined;
  });
}
