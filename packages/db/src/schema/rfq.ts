import { sql } from "drizzle-orm";
import { bigint, boolean, char, index, integer, jsonb, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { id, softDelete, timestamps, utc } from "../columns";
import { users } from "./auth";
import { deliverySites } from "./buyer";
import { catalogueCategories } from "./catalogue";
import { organisationGstins, organisations } from "./companies";
import { core } from "./core";
import { products } from "./products";

/**
 * Quote requests and quotes (step 9.2). Statuses change only through the transition tables in
 * packages/core/src/rfq/transitions.ts (changeStatus: history and audit). Money is whole paise. A sent quote version is
 * never changed: a revision is a new version, and the buyer can always open earlier ones (See v1, 619:8).
 */

/** A buyer company's request for quotes. Draft · In moderation · Returned · Sent · Quotes received · Closed. */
export const rfqs = core.table(
  "rfqs",
  {
    id: id(),
    /** RFQ-2026-0148 */
    reference: text("reference").notNull().unique(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("Draft"),
    title: text("title").notNull().default(""),
    categoryId: uuid("category_id").references(() => catalogueCategories.id),
    requirements: text("requirements"),
    deliverySiteId: uuid("delivery_site_id").references(() => deliverySites.id),
    billingGstinId: uuid("billing_gstin_id").references(() => organisationGstins.id),
    /** Needed on site by (a date, kept as midnight IST). */
    requiredBy: utc("required_by"),
    offerDeadline: utc("offer_deadline"),
    deliveryTerms: text("delivery_terms"),
    paymentTerms: text("payment_terms"),
    /** Files attached (drawings, specs), through the files service. */
    attachments: uuid("attachments")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    /** Where the RFQ started: product, category, compare, list, header, cart. */
    source: text("source"),
    submittedAt: utc("submitted_at"),
    sentAt: utc("sent_at"),
    closedAt: utc("closed_at"),
    /** Why it closed: accepted, declined all, closed by the buyer. */
    closeReason: text("close_reason"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("rfqs_organisation").on(t.organisationId, t.status), index("rfqs_status").on(t.status)],
);

/** What is asked for: one line per item, with the category's attribute values as specs. */
export const rfqItems = core.table(
  "rfq_items",
  {
    id: id(),
    rfqId: uuid("rfq_id")
      .notNull()
      .references(() => rfqs.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull(),
    unit: text("unit").notNull().default("units"),
    specs: jsonb("specs").$type<Record<string, unknown>>().notNull().default({}),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("rfq_items_rfq").on(t.rfqId, t.position)],
);

/**
 * A supplier the RFQ goes to (at most 5, verified only). Status: Sent · Viewed · Quoted · Declined · Expired (the
 * offer deadline passed without a quote). Suppliers see the RFQ only once it is Sent.
 */
export const rfqSuppliers = core.table(
  "rfq_suppliers",
  {
    id: id(),
    rfqId: uuid("rfq_id")
      .notNull()
      .references(() => rfqs.id, { onDelete: "cascade" }),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    status: text("status").notNull().default("Sent"),
    viewedAt: utc("viewed_at"),
    declinedAt: utc("declined_at"),
    declineReason: text("decline_reason"),
    declineNote: text("decline_note"),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("rfq_suppliers_unique").on(t.rfqId, t.organisationId),
    index("rfq_suppliers_organisation").on(t.organisationId, t.status),
  ],
);

/** H2 India's check of a multi-supplier RFQ (632:1138): Approved or Returned, with reasons. Append-only. */
export const rfqModerationDecisions = core.table(
  "rfq_moderation_decisions",
  {
    id: id(),
    rfqId: uuid("rfq_id")
      .notNull()
      .references(() => rfqs.id),
    decision: text("decision").notNull(),
    reasons: text("reasons")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    note: text("note"),
    moderatorId: uuid("moderator_id")
      .notNull()
      .references(() => users.id),
    at: utc("at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("rfq_moderation_rfq").on(t.rfqId, t.at)],
);

/**
 * One supplier's quote on one RFQ. Draft · Sent · Revised · Withdrawn · Expired · Not selected · Accepted. The figures
 * live on its versions; sentVersion is what the buyer sees.
 */
export const quotes = core.table(
  "quotes",
  {
    id: id(),
    /** Q-1001 */
    reference: text("reference").notNull().unique(),
    rfqId: uuid("rfq_id")
      .notNull()
      .references(() => rfqs.id),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    buyerOrganisationId: uuid("buyer_organisation_id")
      .notNull()
      .references(() => organisations.id),
    status: text("status").notNull().default("Draft"),
    /** The latest version sent to the buyer; null until the first is sent. */
    sentVersion: integer("sent_version"),
    withdrawnAt: utc("withdrawn_at"),
    withdrawReason: text("withdraw_reason"),
    withdrawNote: text("withdraw_note"),
    acceptedAt: utc("accepted_at"),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("quotes_rfq_supplier").on(t.rfqId, t.organisationId),
    index("quotes_organisation").on(t.organisationId, t.status),
    index("quotes_buyer").on(t.buyerOrganisationId),
  ],
);

/** A version of a quote. Draft until sent; never changed after. Totals are kept as sent. */
export const quoteVersions = core.table(
  "quote_versions",
  {
    id: id(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    /** Draft · Sent */
    state: text("state").notNull().default("Draft"),
    currency: char("currency", { length: 3 }).notNull().default("INR"),
    freightPaise: bigint("freight_paise", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    freightGstRateBps: integer("freight_gst_rate_bps").notNull().default(0),
    deliveryTerms: text("delivery_terms"),
    /** Delivered and freight included, for the comparison highlight. */
    freightIncluded: boolean("freight_included").notNull().default(false),
    leadTimeWeeks: integer("lead_time_weeks"),
    validUntil: utc("valid_until"),
    warrantyMonths: integer("warranty_months"),
    notes: text("notes"),
    /** What changed (required from v2; the buyer sees it). */
    changeNote: text("change_note"),
    documents: uuid("documents")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    subtotalPaise: bigint("subtotal_paise", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    gstPaise: bigint("gst_paise", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    totalPaise: bigint("total_paise", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    sentAt: utc("sent_at"),
    sentBy: uuid("sent_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("quote_versions_unique").on(t.quoteId, t.version)],
);

/** A priced line: HSN, quantity, unit price before GST and the GST rate in basis points (1800 = 18%). */
export const quoteLines = core.table(
  "quote_lines",
  {
    id: id(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => quoteVersions.id, { onDelete: "cascade" }),
    rfqItemId: uuid("rfq_item_id").references(() => rfqItems.id),
    description: text("description").notNull(),
    hsn: text("hsn"),
    quantity: integer("quantity").notNull(),
    unit: text("unit").notNull().default("units"),
    unitPricePaise: bigint("unit_price_paise", { mode: "bigint" }).notNull(),
    gstRateBps: integer("gst_rate_bps").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("quote_lines_version").on(t.versionId, t.position)],
);

/** Payment schedule (30% on confirmation, 70% before dispatch): percentages in basis points that add to 10000. */
export const quotePaymentLines = core.table(
  "quote_payment_lines",
  {
    id: id(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => quoteVersions.id, { onDelete: "cascade" }),
    percentBps: integer("percent_bps").notNull(),
    trigger: text("trigger").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("quote_payment_lines_version").on(t.versionId, t.position)],
);
