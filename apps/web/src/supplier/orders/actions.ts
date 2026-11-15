"use server";

import { Money } from "@h2india/core";
import {
  changeDispatchDate,
  decideDispatchDate,
  escalateDispute,
  OrderError,
  replyToDispute,
  saveDispatchDetails,
  supplierAccept,
  supplierDecline,
  uploadProofOfDelivery,
  dispatchOrder,
  type DispatchItemInput,
  type DisputeOffer,
} from "@h2india/core/orders";
import { revalidatePath } from "next/cache";
import { requestContext } from "@/server/request-context";
import { supplierActor } from "../actions";

// Supplier order actions (steps 10.7 to 10.10). The company is always the person's own supplier company
// (supplierActor), never a value from the form.

export type ActionResult = { ok: true } | { ok: false; error: string; errors?: Record<string, string> };

async function run(orderId: string, work: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await work();
  } catch (error) {
    if (error instanceof OrderError) return { ok: false, error: error.message, errors: error.errors };
    throw error;
  }
  revalidatePath(`/supplier/orders/${orderId}`);
  revalidatePath("/supplier/orders");
  return { ok: true };
}

/** "18 Nov 2026" or 2026-11-18 from a date input, as midnight IST. */
const istDate = (v: string) => new Date(`${v}T00:00:00+05:30`);
const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function acceptOrderAction(orderId: string, dispatchBy: string): Promise<ActionResult> {
  const { db, actor, supplier } = await supplierActor();
  if (!validDate(dispatchBy))
    return { ok: false, error: "Choose a dispatch date", errors: { dispatchBy: "Choose the date you'll dispatch" } };
  return run(orderId, async () =>
    supplierAccept(
      db,
      actor,
      supplier.organisationId,
      orderId,
      { dispatchBy: istDate(dispatchBy) },
      await requestContext(),
    ),
  );
}

export async function declineOrderAction(orderId: string, reason: string): Promise<ActionResult> {
  const { db, actor, supplier } = await supplierActor();
  return run(orderId, async () =>
    supplierDecline(db, actor, supplier.organisationId, orderId, { reason }, await requestContext()),
  );
}

export interface DispatchForm {
  invoiceNumber?: string;
  invoiceFileId?: string;
  irn?: string;
  ewayBillNumber?: string;
  certificatesNote?: string;
  transporter?: string;
  lrNumber?: string;
  expectedAt?: string;
}

export async function saveDispatchAction(orderId: string, form: DispatchForm): Promise<ActionResult> {
  const { db, actor, supplier } = await supplierActor();
  if (form.expectedAt !== undefined && !validDate(form.expectedAt))
    return { ok: false, error: "Choose the expected date", errors: { expectedAt: "Choose the expected arrival date" } };
  const input: DispatchItemInput = {
    ...form,
    expectedAt: form.expectedAt ? istDate(form.expectedAt) : undefined,
  };
  return run(orderId, async () =>
    saveDispatchDetails(db, actor, supplier.organisationId, orderId, input, await requestContext()),
  );
}

export async function markShippedAction(orderId: string): Promise<ActionResult> {
  const { db, actor, supplier } = await supplierActor();
  return run(orderId, async () => dispatchOrder(db, actor, supplier.organisationId, orderId, await requestContext()));
}

export async function proofOfDeliveryAction(
  orderId: string,
  form: { fileIds: string[]; deliveredOn: string; receivedBy: string },
): Promise<ActionResult> {
  const { db, actor, supplier } = await supplierActor();
  if (!validDate(form.deliveredOn))
    return { ok: false, error: "Choose the delivery date", errors: { deliveredOn: "Choose the delivery date" } };
  return run(orderId, async () =>
    uploadProofOfDelivery(
      db,
      actor,
      supplier.organisationId,
      orderId,
      { fileIds: form.fileIds, deliveredOn: istDate(form.deliveredOn), receivedBy: form.receivedBy },
      await requestContext(),
    ),
  );
}

export async function changeDateAction(orderId: string, date: string, reason: string): Promise<ActionResult> {
  const { db, actor, supplier } = await supplierActor();
  if (!validDate(date)) return { ok: false, error: "Choose a date", errors: { date: "Choose the new dispatch date" } };
  return run(orderId, async () =>
    changeDispatchDate(
      db,
      actor,
      supplier.organisationId,
      orderId,
      { date: istDate(date), reason },
      await requestContext(),
    ),
  );
}

export async function decideDateAction(orderId: string, requestId: string, agree: boolean): Promise<ActionResult> {
  const { db, actor, supplier } = await supplierActor();
  return run(orderId, async () =>
    decideDispatchDate(db, actor, supplier.organisationId, requestId, agree, await requestContext()),
  );
}

export async function disputeResponseAction(
  orderId: string,
  disputeId: string,
  form: { offer: DisputeOffer; reply: string; refund: string; fileIds: string[] },
): Promise<ActionResult> {
  const { db, actor, supplier } = await supplierActor();
  let refundPaise: bigint | undefined;
  if (form.offer === "partial_refund") {
    try {
      refundPaise = Money.parse(form.refund);
    } catch {
      return { ok: false, error: "Enter the refund in rupees", errors: { refund: "Enter an amount like 1,50,000" } };
    }
  }
  return run(orderId, async () =>
    replyToDispute(
      db,
      actor,
      supplier.organisationId,
      disputeId,
      { offer: form.offer, reply: form.reply, refundPaise, fileIds: form.fileIds },
      await requestContext(),
    ),
  );
}

export async function askH2IndiaAction(orderId: string, disputeId: string): Promise<ActionResult> {
  const { db, actor, supplier } = await supplierActor();
  return run(orderId, async () =>
    escalateDispute(db, actor, supplier.organisationId, disputeId, await requestContext()),
  );
}
