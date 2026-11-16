import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { parseServerEnv } from "@h2india/config";
import { schema, type Database } from "@h2india/db";
import { and, eq, gte, isNull, lt, lte } from "drizzle-orm";
import type { PaymentPartner, SettlementLine, WebhookEvent, WebhookType } from "./types";
import { must } from "../../must";

// The simulated payment partner (A176). It behaves like a partner sandbox: each order gets its own virtual account,
// checkout opens our test pay page (/dev/pay/<paymentId>) where the tester chooses Succeed, Fail, Pending or Time out,
// and every outcome reaches H2 Economy only as a signed webhook through the same pipeline a real partner uses. Refunds and
// payouts settle a few seconds later (the worker's tick delivers them), so screens show Processing first. No money
// moves. Its own records (core.sim_partner_events) feed the settlement report, so reconciliation has two sides.

const se = schema.simPartnerEvents;
const PARTNER = "sim";
/** How long a refund or payout stays Processing before the simulated bank confirms it. */
const SETTLE_AFTER_MS = 5_000;

function key(): string {
  return createHmac("sha256", parseServerEnv().AUTH_SECRET).update("h2india-sim-payment-partner").digest("hex");
}

export function signSimWebhook(raw: string): string {
  return createHmac("sha256", key()).update(raw).digest("hex");
}

const digits = (seed: string, n: number) =>
  BigInt(`0x${createHash("sha256").update(seed).digest("hex").slice(0, 15)}`)
    .toString()
    .padStart(n, "0")
    .slice(-n);

export function simPartner(getDb: () => Database): PaymentPartner {
  async function record(
    kind: string,
    partnerRef: string,
    amountPaise: bigint,
    opts: { orderRef?: string | null; idemKey?: string; webhook?: WebhookEvent; deliverInMs?: number } = {},
  ) {
    const db = getDb();
    if (opts.idemKey) {
      const [seen] = await db.select().from(se).where(eq(se.idempotencyKey, opts.idemKey));
      if (seen) return seen;
    }
    const [row] = await db
      .insert(se)
      .values({
        kind,
        partnerRef,
        orderRef: opts.orderRef ?? null,
        amountPaise,
        idempotencyKey: opts.idemKey ?? null,
        webhook: opts.webhook ? (opts.webhook as unknown as Record<string, unknown>) : null,
        deliverAt: opts.webhook ? new Date(Date.now() + (opts.deliverInMs ?? 0)) : null,
      })
      .returning();
    return must(row);
  }

  return {
    name: PARTNER,

    createOrderAccount({ orderRef }) {
      // A stable virtual account per order, as a partner's "smart collect" account would be.
      return Promise.resolve({
        accountNo: `2223${digits(orderRef, 10)}`,
        ifsc: "SIMB0000001",
        payeeName: "H2 Economy order account (simulated)",
      });
    },

    async createCheckout({ orderRef, amountPaise }, idemKey) {
      const db = getDb();
      const [seen] = await db.select().from(se).where(eq(se.idempotencyKey, idemKey));
      const paymentId = seen?.partnerRef ?? `simpay_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
      if (!seen) await record("payment", paymentId, amountPaise, { orderRef, idemKey });
      const base = parseServerEnv().APP_URL.replace(/\/$/, "");
      return { paymentId, checkoutUrl: `${base}/dev/pay/${paymentId}` };
    },

    hold() {
      // Funds stay in the order's account until release; nothing to call in the simulator.
      return Promise.resolve();
    },

    async release({ amountPaise }, idemKey) {
      const row = await record("transfer", `simtr_${digits(idemKey, 12)}`, amountPaise, { idemKey });
      return { transferId: row.partnerRef };
    },

    async refund({ paymentId, amountPaise, reason }, idemKey) {
      const refundId = `simrf_${digits(idemKey, 12)}`;
      await record("refund", refundId, amountPaise, {
        idemKey,
        webhook: event("refund.processed", { refundId, paymentId, amountPaise: amountPaise.toString(), reason }),
        deliverInMs: SETTLE_AFTER_MS,
      });
      return { refundId };
    },

    async payout({ amountPaise, ref }, idemKey) {
      const payoutId = `simpo_${digits(idemKey, 12)}`;
      await record("payout", payoutId, amountPaise, {
        idemKey,
        webhook: event("payout.processed", {
          payoutId,
          amountPaise: amountPaise.toString(),
          utr: `SIMUTR${digits(idemKey + ref, 10)}`,
        }),
        deliverInMs: SETTLE_AFTER_MS,
      });
      return { payoutId };
    },

    verifyWebhook(rawBody, signature) {
      if (!signature) return false;
      const expected = Buffer.from(signSimWebhook(rawBody), "hex");
      const given = Buffer.from(signature, "hex");
      return expected.length === given.length && timingSafeEqual(expected, given);
    },

    async settlementReport(day) {
      const from = new Date(`${day}T00:00:00+05:30`);
      const to = new Date(from.getTime() + 86_400_000);
      const rows = await getDb()
        .select()
        .from(se)
        .where(and(eq(se.status, "settled"), gte(se.createdAt, from), lt(se.createdAt, to)));
      return rows
        .filter((r) => r.kind === "payment" || r.kind === "refund" || r.kind === "payout")
        .map((r): SettlementLine => ({
          partnerRef: r.partnerRef,
          kind: r.kind as SettlementLine["kind"],
          orderRef: r.orderRef,
          amountPaise: r.amountPaise,
          at: r.createdAt.toISOString(),
        }));
    },
  };
}

function event(type: WebhookType, data: WebhookEvent["data"]): WebhookEvent {
  return { id: `simevt_${randomUUID()}`, type, at: new Date().toISOString(), data };
}

export type SimOutcome = "succeed" | "fail" | "pending" | "timeout";

/**
 * The test pay page's buttons (and flow tests): the simulated customer finishes a checkout. Succeed and the failures
 * become a webhook delivered at once; Pending delivers nothing, so the order shows the pending outcome until the tester
 * comes back. Returns the event to deliver, or null.
 */
export async function simCompleteCheckout(
  db: Database,
  paymentId: string,
  outcome: SimOutcome,
  amountPaise?: bigint,
): Promise<WebhookEvent | null> {
  const [row] = await db
    .select()
    .from(se)
    .where(and(eq(se.partnerRef, paymentId), eq(se.kind, "payment")));
  if (!row) throw new Error("No such simulated payment");
  if (outcome === "pending") return null;
  const amount = amountPaise ?? row.amountPaise;
  const type: WebhookType =
    outcome === "succeed" ? "payment.succeeded" : outcome === "fail" ? "payment.failed" : "payment.timed_out";
  const ev = event(type, {
    paymentId,
    orderRef: row.orderRef ?? undefined,
    amountPaise: amount.toString(),
    reason: outcome === "fail" ? "Declined by the bank (simulated)" : undefined,
  });
  await db
    .update(se)
    .set({
      status: outcome === "succeed" ? "settled" : "failed",
      amountPaise: amount,
      webhook: ev as unknown as Record<string, unknown>,
      deliverAt: new Date(),
    })
    .where(eq(se.id, row.id));
  return ev;
}

/** A simulated bank transfer (NEFT/RTGS) into an order's account: the partner tells us with transfer.received. */
export async function simBankTransfer(db: Database, orderRef: string, amountPaise: bigint): Promise<WebhookEvent> {
  const ref = `simnf_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const ev = event("transfer.received", {
    paymentId: ref,
    orderRef,
    amountPaise: amountPaise.toString(),
    utr: `SIMNEFT${digits(ref, 10)}`,
  });
  await db.insert(se).values({
    kind: "payment",
    partnerRef: ref,
    orderRef,
    amountPaise,
    status: "settled",
    webhook: ev as unknown as Record<string, unknown>,
    deliverAt: new Date(),
  });
  return ev;
}

/**
 * Webhooks the simulator owes: due and not yet delivered. The worker's tick calls this and hands each to the webhook
 * pipeline (receiveWebhook), signed, exactly as an HTTP delivery would arrive.
 */
export async function simDueWebhooks(db: Database, now: Date = new Date()) {
  const rows = await db
    .select()
    .from(se)
    .where(and(isNull(se.deliveredAt), lte(se.deliverAt, now)));
  return rows
    .filter((r) => r.webhook)
    .map((r) => {
      const raw = JSON.stringify(r.webhook);
      return { id: r.id, raw, signature: signSimWebhook(raw) };
    });
}

export async function simMarkDelivered(db: Database, id: string, settled: boolean) {
  await db
    .update(se)
    .set({ deliveredAt: new Date(), ...(settled ? { status: "settled" } : {}) })
    .where(eq(se.id, id));
}
