import { sql } from "drizzle-orm";
import { bigint, boolean, char, index, integer, jsonb, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { id, timestamps, utc } from "../columns";
import { users } from "./auth";
import { deliverySites } from "./buyer";
import { organisationGstins, organisations } from "./companies";
import { core } from "./core";
import { products } from "./products";
import { quotes, quoteVersions } from "./rfq";

/**
 * Orders, payments and the ledger (Stage 10, A176). Statuses change only through the transition table in
 * packages/core/src/orders/transitions.ts (changeStatus: history and audit). Money is whole paise. Financial tables
 * (payments, ledger, payouts, refunds) are append-only or change only their status; corrections are new rows.
 */

/** A buyer's cart (80:5973): fixed-price items from one supplier at a time. */
export const carts = core.table(
  "carts",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    supplierId: uuid("supplier_id").references(() => organisations.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("carts_owner").on(t.organisationId, t.userId)],
);

export const cartItems = core.table(
  "cart_items",
  {
    id: id(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    addedAt: utc("added_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [uniqueIndex("cart_items_product").on(t.cartId, t.productId)],
);

/**
 * An order (807:14435). Status: Awaiting approval (internal, G1) · Pending acceptance · Accepted · Awaiting payment ·
 * Ready to dispatch · Shipped · Delivered · Accepted by buyer · Closed · Declined · Cancelled · Disputed. Overdue is
 * worked out from clocks, never stored.
 */
export const orders = core.table(
  "orders",
  {
    id: id(),
    /** ORD-2026-0091 */
    reference: text("reference").notNull().unique(),
    buyerOrganisationId: uuid("buyer_organisation_id")
      .notNull()
      .references(() => organisations.id),
    supplierOrganisationId: uuid("supplier_organisation_id")
      .notNull()
      .references(() => organisations.id),
    placedBy: uuid("placed_by")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull(),
    /** cart or quote */
    source: text("source").notNull(),
    quoteId: uuid("quote_id").references(() => quotes.id),
    quoteVersionId: uuid("quote_version_id").references(() => quoteVersions.id),
    /** A to D (M12). Every order is A or B until the thresholds are set; C and D are handled by Operations (G3). */
    tier: text("tier").notNull().default("A"),
    deliverySiteId: uuid("delivery_site_id").references(() => deliverySites.id),
    billingGstinId: uuid("billing_gstin_id").references(() => organisationGstins.id),
    /** Who receives at site: gets the delivery code by SMS (step 10.9). */
    receiverName: text("receiver_name"),
    receiverMobile: text("receiver_mobile"),
    /** bank_transfer, online, pay_later, letter_of_credit */
    paymentMethod: text("payment_method").notNull().default("bank_transfer"),
    currency: char("currency", { length: 3 }).notNull().default("INR"),
    subtotalPaise: bigint("subtotal_paise", { mode: "bigint" }).notNull(),
    gstPaise: bigint("gst_paise", { mode: "bigint" }).notNull(),
    freightPaise: bigint("freight_paise", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    totalPaise: bigint("total_paise", { mode: "bigint" }).notNull(),
    /** The rate card version in force when the supplier accepted (step 10.11). */
    rateCardVersion: text("rate_card_version"),
    dispatchBy: utc("dispatch_by"),
    acceptedAt: utc("accepted_at"),
    declinedAt: utc("declined_at"),
    /** Free text, told to the buyer (693:8). */
    declineReason: text("decline_reason"),
    shippedAt: utc("shipped_at"),
    deliveredAt: utc("delivered_at"),
    buyerAcceptedAt: utc("buyer_accepted_at"),
    closedAt: utc("closed_at"),
    cancelledAt: utc("cancelled_at"),
    cancelReason: text("cancel_reason"),
    ...timestamps,
  },
  (t) => [
    index("orders_buyer").on(t.buyerOrganisationId, t.status),
    index("orders_supplier").on(t.supplierOrganisationId, t.status),
    index("orders_status").on(t.status),
  ],
);

/** What was ordered, priced as placed (never changed). */
export const orderLines = core.table(
  "order_lines",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id),
    description: text("description").notNull(),
    hsn: text("hsn"),
    quantity: integer("quantity").notNull(),
    unit: text("unit").notNull().default("units"),
    unitPricePaise: bigint("unit_price_paise", { mode: "bigint" }).notNull(),
    gstRateBps: integer("gst_rate_bps").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("order_lines_order").on(t.orderId, t.position)],
);

/**
 * A payment milestone (808:14517), fixed at order creation from the quote's schedule; amounts add to the total
 * exactly. Status: Upcoming · Due · Partly paid · Paid.
 */
export const orderMilestones = core.table(
  "order_milestones",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    label: text("label").notNull(),
    /** on_confirmation, before_dispatch, on_delivery, on_acceptance */
    trigger: text("trigger").notNull(),
    percentBps: integer("percent_bps").notNull(),
    amountPaise: bigint("amount_paise", { mode: "bigint" }).notNull(),
    paidPaise: bigint("paid_paise", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    status: text("status").notNull().default("Upcoming"),
    dueAt: utc("due_at"),
    paidAt: utc("paid_at"),
  },
  (t) => [uniqueIndex("order_milestones_position").on(t.orderId, t.position)],
);

/** One approver's decision on an order (806:14572). Step 1 and, above the higher limit, step 2. Append-only. */
export const orderApprovals = core.table(
  "order_approvals",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    step: integer("step").notNull(),
    approverId: uuid("approver_id")
      .notNull()
      .references(() => users.id),
    /** Set when the approver acts for someone through a delegation. */
    onBehalfOf: uuid("on_behalf_of").references(() => users.id),
    decision: text("decision").notNull(),
    note: text("note"),
    at: utc("at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [uniqueIndex("order_approvals_step").on(t.orderId, t.step)],
);

/**
 * The one shipment of an order (G6) and its dispatch checklist (693:814): each item is saved as the supplier adds it;
 * Mark as shipped unlocks when all are done. After shipping, proof of delivery sends the receiving contact the code.
 */
export const shipments = core.table("shipments", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id)
    .unique(),
  /** Tax invoice (GST): number and file. */
  invoiceNumber: text("invoice_number"),
  invoiceFileId: uuid("invoice_file_id"),
  /** E-invoice IRN and when it was generated. */
  irn: text("irn"),
  irnAt: utc("irn_at"),
  ewayBillNumber: text("eway_bill_number"),
  ewayBillFileId: uuid("eway_bill_file_id"),
  /** "Certificates for this product": what the supplier confirmed (test report, licence or why none is needed). */
  certificatesNote: text("certificates_note"),
  certificatesAt: utc("certificates_at"),
  /** Carrier and tracking: who carries it, LR or tracking number, expected arrival. */
  transporter: text("transporter"),
  lrNumber: text("lr_number"),
  expectedAt: utc("expected_at"),
  shippedAt: utc("shipped_at"),
  shippedBy: uuid("shipped_by").references(() => users.id),
  /** Proof of delivery (308:6627); uploading it sends the receiving contact the delivery code. */
  podFileIds: uuid("pod_file_ids")
    .array()
    .notNull()
    .default(sql`'{}'::uuid[]`),
  podAt: utc("pod_at"),
  /** "Delivered on" and "Received by" on Upload proof of delivery (308:6627). */
  deliveredOn: utc("delivered_on"),
  receivedBy: text("received_by"),
  codeSentAt: utc("code_sent_at"),
  ...timestamps,
});

/**
 * The dispatch date: the buyer asks to change it (344:27740) and the supplier agrees or declines; agreed changes move
 * the balance due date. The supplier may also move it (G8: the buyer is told). Status: Requested · Agreed · Declined.
 */
export const dispatchDateChanges = core.table("dispatch_date_changes", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  fromDate: utc("from_date"),
  toDate: utc("to_date").notNull(),
  reason: text("reason").notNull(),
  /** buyer or supplier */
  requestedBy: text("requested_by").notNull(),
  status: text("status").notNull(),
  changedBy: uuid("changed_by")
    .notNull()
    .references(() => users.id),
  decidedBy: uuid("decided_by").references(() => users.id),
  decidedAt: utc("decided_at"),
  at: utc("at")
    .notNull()
    .default(sql`now()`),
});

/**
 * The receiving contact's link (695:13): single use, expires, opened with a six-digit code sent by SMS. The token and
 * code are stored hashed. Five wrong codes lock it.
 */
export const deliveryLinks = core.table(
  "delivery_links",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    tokenHash: text("token_hash").notNull().unique(),
    codeHash: text("code_hash").notNull(),
    wrongTries: integer("wrong_tries").notNull().default(0),
    lockedAt: utc("locked_at"),
    usedAt: utc("used_at"),
    expiresAt: utc("expires_at").notNull(),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("delivery_links_order").on(t.orderId)],
);

/** What arrived (695:110): Good, Damaged or Short, notes, up to five photos. */
export const deliveryReceipts = core.table("delivery_receipts", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id)
    .unique(),
  condition: text("condition").notNull(),
  notes: text("notes"),
  photoFileIds: uuid("photo_file_ids")
    .array()
    .notNull()
    .default(sql`'{}'::uuid[]`),
  receivedBy: text("received_by"),
  /** link (the code page) or operator (G5 fallback, with a reason) */
  via: text("via").notNull().default("link"),
  recordedBy: uuid("recorded_by").references(() => users.id),
  reason: text("reason"),
  at: utc("at")
    .notNull()
    .default(sql`now()`),
});

/**
 * A dispute (697:579, 813:12602). Status: Open · Supplier replied · Under review · Resolved. The supplier answers with
 * an offer; the buyer accepts it, or either side asks H2 India to decide (step 11.5). The disputed amount stays held.
 */
export const disputes = core.table(
  "disputes",
  {
    id: id(),
    /** DSP-2026-0012 */
    reference: text("reference").notNull().unique(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    status: text("status").notNull().default("Open"),
    reason: text("reason").notNull(),
    details: text("details").notNull(),
    /** "What would fix it?" (330:27342). */
    wantedFix: text("wanted_fix"),
    photoFileIds: uuid("photo_file_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    disputedPaise: bigint("disputed_paise", { mode: "bigint" }).notNull(),
    acceptedPaise: bigint("accepted_paise", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    supplierReply: text("supplier_reply"),
    supplierRepliedAt: utc("supplier_replied_at"),
    /** The supplier's offer (813:12602): replace, partial_refund or disagree. */
    offer: text("offer"),
    offerRefundPaise: bigint("offer_refund_paise", { mode: "bigint" }),
    supplierFileIds: uuid("supplier_file_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    /** Who asked H2 India to decide (buyer or supplier), moving it to Under review. */
    escalatedBy: text("escalated_by"),
    escalatedAt: utc("escalated_at"),
    /** refund_buyer, release_supplier, split */
    outcome: text("outcome"),
    refundPaise: bigint("refund_paise", { mode: "bigint" }),
    decisionNote: text("decision_note"),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: utc("decided_at"),
    openedBy: uuid("opened_by")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [index("disputes_order").on(t.orderId), index("disputes_status").on(t.status)],
);

/** Refunds (700:8): R-2026-0031. Status: Processing · Refunded · Failed. */
export const refunds = core.table(
  "refunds",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    disputeId: uuid("dispute_id").references(() => disputes.id),
    paymentId: uuid("payment_id"),
    amountPaise: bigint("amount_paise", { mode: "bigint" }).notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("Processing"),
    partnerRefundId: text("partner_refund_id"),
    requestedBy: uuid("requested_by").references(() => users.id),
    confirmedAt: utc("confirmed_at"),
    ...timestamps,
  },
  (t) => [index("refunds_order").on(t.orderId)],
);

/** The order's own account at the payment partner for bank transfers (690:9). Never the supplier's bank. */
export const orderAccounts = core.table("order_accounts", {
  orderId: uuid("order_id")
    .primaryKey()
    .references(() => orders.id),
  accountNumber: text("account_number").notNull(),
  ifsc: text("ifsc").notNull(),
  payeeName: text("payee_name").notNull(),
  partner: text("partner").notNull(),
  createdAt: utc("created_at")
    .notNull()
    .default(sql`now()`),
});

/**
 * A payment into an order (online checkout or bank transfer), confirmed only by the partner (webhook or
 * reconciliation). Status: Pending · Succeeded · Failed · Timed out. Unique on the partner's payment id.
 */
export const payments = core.table(
  "payments",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    milestoneId: uuid("milestone_id").references(() => orderMilestones.id),
    method: text("method").notNull(),
    partner: text("partner").notNull(),
    partnerPaymentId: text("partner_payment_id").notNull().unique(),
    checkoutUrl: text("checkout_url"),
    amountPaise: bigint("amount_paise", { mode: "bigint" }).notNull(),
    status: text("status").notNull().default("Pending"),
    failReason: text("fail_reason"),
    attempt: integer("attempt").notNull().default(1),
    confirmedAt: utc("confirmed_at"),
    ...timestamps,
  },
  (t) => [index("payments_order").on(t.orderId, t.createdAt)],
);

/** Every webhook the partner sends, stored before processing, unique by its event id (playbook Section 9). */
export const paymentWebhookEvents = core.table("payment_webhook_events", {
  id: id(),
  partner: text("partner").notNull(),
  eventId: text("event_id").notNull().unique(),
  type: text("type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  receivedAt: utc("received_at")
    .notNull()
    .default(sql`now()`),
  processedAt: utc("processed_at"),
  error: text("error"),
});

/** Every call to the partner, masked, for audit (step 10.4). Append-only. */
export const paymentPartnerCalls = core.table(
  "payment_partner_calls",
  {
    id: id(),
    partner: text("partner").notNull(),
    operation: text("operation").notNull(),
    idempotencyKey: text("idempotency_key"),
    request: jsonb("request").$type<Record<string, unknown>>().notNull(),
    response: jsonb("response").$type<Record<string, unknown>>(),
    error: text("error"),
    at: utc("at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("payment_partner_calls_at").on(t.at)],
);

/** A balanced ledger transaction (705:8): one per money event, unique by its source event. Append-only. */
export const ledgerTransactions = core.table(
  "ledger_transactions",
  {
    id: id(),
    /** ORD:ORD-2026-0091:release */
    ref: text("ref").notNull(),
    /** The partner event or our own event id; posting the same event twice is impossible. */
    sourceEventId: text("source_event_id").notNull().unique(),
    kind: text("kind").notNull(),
    orderId: uuid("order_id").references(() => orders.id),
    /** Set on a correction: the transaction it reverses. */
    reverses: uuid("reverses"),
    memo: text("memo"),
    at: utc("at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("ledger_transactions_order").on(t.orderId), index("ledger_transactions_at").on(t.at)],
);

/** One side of a ledger transaction: debit or credit to an account, in paise. Append-only. */
export const ledgerLines = core.table(
  "ledger_lines",
  {
    id: id(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => ledgerTransactions.id),
    account: text("account").notNull(),
    orderId: uuid("order_id").references(() => orders.id),
    organisationId: uuid("organisation_id").references(() => organisations.id),
    debitPaise: bigint("debit_paise", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    creditPaise: bigint("credit_paise", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
  },
  (t) => [index("ledger_lines_account").on(t.account), index("ledger_lines_order").on(t.orderId)],
);

/**
 * What a supplier is owed for one order after acceptance (816:12500), with the fee and deductions worked out under the
 * order's rate card. One row per release.
 */
export const orderSettlements = core.table(
  "order_settlements",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    supplierOrganisationId: uuid("supplier_organisation_id")
      .notNull()
      .references(() => organisations.id),
    releasedPaise: bigint("released_paise", { mode: "bigint" }).notNull(),
    orderValueExGstPaise: bigint("order_value_ex_gst_paise", { mode: "bigint" }).notNull(),
    feePaise: bigint("fee_paise", { mode: "bigint" }).notNull(),
    gstOnFeePaise: bigint("gst_on_fee_paise", { mode: "bigint" }).notNull(),
    tcsPaise: bigint("tcs_paise", { mode: "bigint" }).notNull(),
    tdsPaise: bigint("tds_paise", { mode: "bigint" }).notNull(),
    netPaise: bigint("net_paise", { mode: "bigint" }).notNull(),
    rateCardVersion: text("rate_card_version").notNull(),
    launchOffer: boolean("launch_offer").notNull(),
    payoutDueAt: utc("payout_due_at").notNull(),
    payoutId: uuid("payout_id"),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("order_settlements_supplier").on(t.supplierOrganisationId, t.payoutDueAt)],
);

/** A payout run to one supplier (817:12613): PO-2026-0118. Status: Scheduled · Processing · Paid · Failed. */
export const payouts = core.table(
  "payouts",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    supplierOrganisationId: uuid("supplier_organisation_id")
      .notNull()
      .references(() => organisations.id),
    bankAccountId: uuid("bank_account_id"),
    amountPaise: bigint("amount_paise", { mode: "bigint" }).notNull(),
    status: text("status").notNull().default("Scheduled"),
    runAt: utc("run_at").notNull(),
    partnerPayoutId: text("partner_payout_id"),
    utr: text("utr"),
    failReason: text("fail_reason"),
    paidAt: utc("paid_at"),
    ...timestamps,
  },
  (t) => [index("payouts_supplier").on(t.supplierOrganisationId, t.runAt)],
);

/** Differences the reconciliation found (705:8 mismatches). Resolved by a reversing entry or a note. */
export const reconciliationIssues = core.table(
  "reconciliation_issues",
  {
    id: id(),
    day: text("day").notNull(),
    kind: text("kind").notNull(),
    orderId: uuid("order_id").references(() => orders.id),
    partnerRef: text("partner_ref"),
    expectedPaise: bigint("expected_paise", { mode: "bigint" }),
    actualPaise: bigint("actual_paise", { mode: "bigint" }),
    detail: text("detail").notNull(),
    resolvedAt: utc("resolved_at"),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolution: text("resolution"),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("reconciliation_issues_day").on(t.day)],
);

/**
 * The simulated payment partner's own records (A176): what the "partner" did, and webhooks waiting to be delivered.
 * Only the simulator writes here; the settlement report is read from it, so reconciliation compares two sides.
 * Removed when the real partner (M3) is connected.
 */
export const simPartnerEvents = core.table(
  "sim_partner_events",
  {
    id: id(),
    /** payment, refund, payout, transfer */
    kind: text("kind").notNull(),
    partnerRef: text("partner_ref").notNull(),
    orderRef: text("order_ref"),
    amountPaise: bigint("amount_paise", { mode: "bigint" }).notNull(),
    /** created, settled, failed */
    status: text("status").notNull().default("created"),
    idempotencyKey: text("idempotency_key").unique(),
    webhook: jsonb("webhook").$type<Record<string, unknown>>(),
    deliverAt: utc("deliver_at"),
    deliveredAt: utc("delivered_at"),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("sim_partner_events_ref").on(t.partnerRef), index("sim_partner_events_due").on(t.deliverAt)],
);
