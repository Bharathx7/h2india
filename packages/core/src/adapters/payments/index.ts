import { parseServerEnv } from "@h2india/config";
import { schema } from "@h2india/db";
import { getDb } from "../../db";
import { simPartner } from "./sim";
import type { PaymentPartner } from "./types";

// The one payment partner (step 10.4). Until M3 is chosen it is the simulated partner (A176), which a production build
// refuses unless PAYMENT_SIM_ALLOWED=true (staging). Every call is recorded, masked, in core.payment_partner_calls.

let current: PaymentPartner | null = null;

export class PaymentPartnerUnavailable extends Error {
  readonly code = "PAYMENT_PARTNER_UNAVAILABLE";
}

function choose(): PaymentPartner {
  const env = parseServerEnv();
  // Only the simulated partner exists until M3; the real one is added here with its own PAYMENT_PARTNER value.
  if (env.NODE_ENV === "production" && env.PAYMENT_SIM_ALLOWED !== "true") {
    throw new PaymentPartnerUnavailable(
      "The simulated payment partner is switched off in production. Connect the real partner (M3).",
    );
  }
  return simPartner(getDb);
}

/** The partner, wrapped so every call is logged. Tests can swap it with usePaymentPartner(). */
export function paymentPartner(): PaymentPartner {
  current ??= logged(choose());
  return current;
}

export function usePaymentPartner(partner: PaymentPartner | null) {
  current = partner ? logged(partner) : null;
}

const MASK = /account|ifsc|card|vpa|upi/i;
function masked(value: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "bigint") out[k] = v.toString();
      else if (typeof v === "string" && MASK.test(k)) out[k] = `••••${v.slice(-4)}`;
      else out[k] = v;
    }
  }
  return out;
}

function logged(p: PaymentPartner): PaymentPartner {
  const log = async (operation: string, request: unknown, idem: string | null, run: () => Promise<unknown>) => {
    let response: unknown = null;
    let error: string | null = null;
    try {
      response = await run();
      return response;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      await getDb()
        .insert(schema.paymentPartnerCalls)
        .values({
          partner: p.name,
          operation,
          idempotencyKey: idem,
          request: masked(request),
          response: response === null ? null : masked(response),
          error,
        })
        .catch((e: unknown) => {
          console.error("payments: could not record a partner call", e);
        });
    }
  };
  return {
    name: p.name,
    createOrderAccount: (o) => log("createOrderAccount", o, null, () => p.createOrderAccount(o)) as never,
    createCheckout: (o, k) => log("createCheckout", o, k, () => p.createCheckout(o, k)) as never,
    hold: (id) => log("hold", { paymentId: id }, null, () => p.hold(id)) as never,
    release: (o, k) => log("release", o, k, () => p.release(o, k)) as never,
    refund: (o, k) => log("refund", o, k, () => p.refund(o, k)) as never,
    payout: (o, k) => log("payout", o, k, () => p.payout(o, k)) as never,
    verifyWebhook: (raw, sig) => p.verifyWebhook(raw, sig),
    settlementReport: (day) => p.settlementReport(day),
  };
}

export type { PaymentPartner, SettlementLine, WebhookEvent, WebhookType } from "./types";
export {
  signSimWebhook,
  simBankTransfer,
  simCompleteCheckout,
  simDueWebhooks,
  simMarkDelivered,
  type SimOutcome,
} from "./sim";
