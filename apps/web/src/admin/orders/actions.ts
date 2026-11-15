"use server";

import { getDb, Money } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import {
  decideDispute,
  operatorConfirmReceipt,
  OrderError,
  resendDeliveryCode,
  resolveIssue,
} from "@h2india/core/orders";
import { revalidatePath } from "next/cache";
import { operatorSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Orders and money in the back office (steps 11.5, 11.6). Core checks orders.edit or money.edit and audits.

export type AdminResult = { ok: true } | { ok: false; error: string; errors?: Record<string, string> };

async function operator() {
  const session = await operatorSession();
  if (!session) throw new OrderError("Sign in again.");
  return loadActor(getDb(), session.user.id);
}

async function run(path: string, work: () => Promise<unknown>): Promise<AdminResult> {
  try {
    await work();
  } catch (error) {
    if (error instanceof OrderError) return { ok: false, error: error.message, errors: error.errors };
    throw error;
  }
  revalidatePath(path);
  return { ok: true };
}

export async function decideDisputeAction(
  orderId: string,
  disputeId: string,
  form: { outcome: "refund_buyer" | "release_supplier" | "split"; refund: string; note: string },
): Promise<AdminResult> {
  const actor = await operator();
  let refundPaise: bigint | undefined;
  if (form.outcome === "split") {
    try {
      refundPaise = Money.parse(form.refund);
    } catch {
      return { ok: false, error: "Enter the refund in rupees", errors: { refund: "Enter an amount like 1,50,000" } };
    }
  }
  return run(`/admin/orders/${orderId}`, async () =>
    decideDispute(
      getDb(),
      actor,
      disputeId,
      { outcome: form.outcome, refundPaise, note: form.note },
      await requestContext(),
    ),
  );
}

export async function resendCodeAction(orderId: string, reason: string): Promise<AdminResult> {
  const actor = await operator();
  return run(`/admin/orders/${orderId}`, () => resendDeliveryCode(getDb(), actor, orderId, reason));
}

export async function confirmReceiptAction(
  orderId: string,
  condition: "Good" | "Damaged" | "Short",
  reason: string,
): Promise<AdminResult> {
  const actor = await operator();
  return run(`/admin/orders/${orderId}`, () => operatorConfirmReceipt(getDb(), actor, orderId, { condition, reason }));
}

export async function resolveIssueAction(issueId: string, resolution: string): Promise<AdminResult> {
  const actor = await operator();
  return run("/admin/money", async () => resolveIssue(getDb(), actor, issueId, resolution, await requestContext()));
}
