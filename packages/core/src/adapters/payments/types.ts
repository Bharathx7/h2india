// The payment partner (step 10.4, playbook interface). One adapter: an account per order for bank transfers, hosted
// checkout for UPI, cards and net banking, holds and releases, payouts, refunds, signed webhooks and the daily
// settlement report. Every call that moves money carries an idempotency key. Swap the simulated partner for the M3
// choice in ./index.ts; nothing else changes.

export interface SettlementLine {
  /** The partner's id for the payment, refund or payout. */
  partnerRef: string;
  kind: "payment" | "refund" | "payout";
  orderRef: string | null;
  amountPaise: bigint;
  /** ISO time. */
  at: string;
}

export type WebhookType =
  | "payment.succeeded"
  | "payment.failed"
  | "payment.timed_out"
  | "transfer.received" // a bank transfer arrived in an order's account
  | "refund.processed"
  | "refund.failed"
  | "payout.processed"
  | "payout.failed";

export interface WebhookEvent {
  id: string;
  type: WebhookType;
  /** ISO time. */
  at: string;
  data: {
    orderRef?: string;
    paymentId?: string;
    refundId?: string;
    payoutId?: string;
    /** Paise as a string (JSON has no bigint). */
    amountPaise?: string;
    utr?: string;
    reason?: string;
  };
}

export interface PaymentPartner {
  readonly name: string;
  createOrderAccount(o: {
    orderRef: string;
    amountPaise: bigint;
  }): Promise<{ accountNo: string; ifsc: string; payeeName: string }>;
  createCheckout(
    o: { orderRef: string; milestoneId: string; amountPaise: bigint; method: "upi" | "card" | "netbanking" },
    idemKey: string,
  ): Promise<{ paymentId: string; checkoutUrl: string }>;
  hold(paymentId: string): Promise<void>;
  release(
    o: { paymentId: string; supplierAccountId: string; amountPaise: bigint },
    idemKey: string,
  ): Promise<{ transferId: string }>;
  refund(o: { paymentId: string; amountPaise: bigint; reason: string }, idemKey: string): Promise<{ refundId: string }>;
  payout(
    o: { supplierAccountId: string; amountPaise: bigint; ref: string },
    idemKey: string,
  ): Promise<{ payoutId: string }>;
  verifyWebhook(rawBody: string, signature: string | null): boolean;
  settlementReport(day: string): Promise<SettlementLine[]>;
}
