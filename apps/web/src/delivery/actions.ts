"use server";

import { checkForm, getDb, type FormGuard } from "@h2india/core";
import { OrderError, recordReceipt, RECEIPT_CONDITIONS } from "@h2india/core/orders";
import { requestContext } from "@/server/request-context";

// The receiving contact's delivery page (695:13), step 10.9. No account: the single-use link and the six-digit SMS
// code are the proof. Form protection like every public form (checkForm); five wrong codes lock the link.

export type ReceiptResult =
  | { ok: true }
  | {
      ok: false;
      state: "wrong" | "locked" | "closed" | "invalid" | "blocked";
      left?: number;
      error?: string;
      errors?: Record<string, string>;
    };

export async function recordReceiptAction(input: {
  token: string;
  code: string;
  condition: string;
  notes: string;
  receivedBy: string;
  photos: { fileId: string; key: string }[];
  guard: FormGuard;
}): Promise<ReceiptResult> {
  const context = await requestContext();
  if (!(await checkForm({ form: "delivery-receipt", ip: context.ip ?? null, guard: input.guard })).ok)
    return { ok: false, state: "blocked", error: "Too many tries from this connection. Wait a few minutes." };
  const condition = RECEIPT_CONDITIONS.find((c) => c === input.condition);
  if (!condition) return { ok: false, state: "invalid", errors: { condition: "Choose what arrived" } };
  try {
    const r = await recordReceipt(getDb(), {
      token: input.token,
      code: input.code.replace(/\D/g, ""),
      condition,
      notes: input.notes,
      receivedBy: input.receivedBy,
      photos: input.photos,
    });
    if (r.ok) return { ok: true };
    return { ok: false, state: r.state as "wrong" | "locked" | "closed", left: "left" in r ? r.left : undefined };
  } catch (error) {
    if (error instanceof OrderError) return { ok: false, state: "invalid", error: error.message, errors: error.errors };
    throw error;
  }
}
