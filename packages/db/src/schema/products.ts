import { sql } from "drizzle-orm";
import { bigint, boolean, char, index, integer, jsonb, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authorship, id, softDelete, timestamps, utc } from "../columns";
import { catalogueCategories } from "./catalogue";
import { core } from "./core";
import { users } from "./auth";
import { organisations } from "./companies";

export interface ProductFact {
  label: string;
  value: string;
  unit?: string;
  note?: string;
}

export interface ProductCertificate {
  name: string;
  number?: string;
  validUntil?: string;
  issuer?: string;
}

/** What a service page shows (400:11134): set only for listings in the Services class. */
export interface ServiceDetails {
  statesServed?: string[];
  accreditations?: { name: string; url?: string }[];
  scope?: string;
  deliverables?: string[];
  standards?: string[];
  facts?: ProductFact[];
  references?: { eyebrow: string; title: string; text: string; href?: string }[];
  faqs?: { question: string; answer: string }[];
  /** "Usually replies in 2 working days" appears only once reply times are measured (RFQs, step 9). */
  proposalHint?: string;
}

export interface ProductDocument {
  label: string;
  fileId: string;
}

/**
 * Products (step 6.3; the supplier's editor is step 8.3). A product belongs to one supplier organisation and one
 * category (a category or a sub-category); its specifications are `attributes`, checked against that category's
 * schema (checkAttributeValues). Prices exist only for fixed-price items and show only on the product page (6.4);
 * quote-only items never hold a price. Statuses change only through changeStatus(): Draft → In review → Live, Paused.
 */
export const products = core.table(
  "products",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => catalogueCategories.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    brand: text("brand"),
    /** The brand record (step 6.5), when the maker is listed under Brands. */
    brandId: uuid("brand_id"),
    model: text("model"),
    /** The grey line under the name in tables, for example "Containerised · 40 ft". */
    variant: text("variant"),
    summary: text("summary"),
    attributes: jsonb("attributes").$type<Record<string, unknown>>().notNull().default({}),
    /** Certificates and approvals named on the listing, for example ISO 22734, PESO approval. */
    certifications: text("certifications")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** quote (Request a quote), fixed (a price on the product page) or indicative (a range on the product page, A141). */
    pricing: text("pricing").notNull().default("quote"),
    /** Fixed-price items only, in paise. Never read outside the product page's price rule. */
    pricePaise: bigint("price_paise", { mode: "bigint" }),
    priceCurrency: char("price_currency", { length: 3 }),
    /** Indicative items only (A141): the supplier's rough range, shown on the product page only, in paise. */
    indicativeMinPaise: bigint("indicative_min_paise", { mode: "bigint" }),
    indicativeMaxPaise: bigint("indicative_max_paise", { mode: "bigint" }),
    /** GST on a fixed price, in basis points (1800 = 18%), entered by the supplier with the price. */
    gstRateBps: integer("gst_rate_bps"),
    /** Minimum order, in units (393:8151 "Minimum order: 2 units"). */
    minOrder: integer("min_order"),
    leadTimeMinWeeks: integer("lead_time_min_weeks"),
    leadTimeMaxWeeks: integer("lead_time_max_weeks"),
    madeInIndia: boolean("made_in_india").notNull().default(false),
    /** Application ids (browse by application) shown as chips under Overview (393:7370). */
    applicationIds: text("application_ids")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** A product's own test condition per attribute, for example "At rated load (≈210 Nm³/h)" (393:7379). */
    attributeNotes: jsonb("attribute_notes").$type<Record<string, string>>().notNull().default({}),
    /** Installation facts (393:7505): label, value, unit, note. */
    installation: jsonb("installation").$type<ProductFact[]>().notNull().default([]),
    /** Compliance and certificates (393:7538). */
    certificates: jsonb("certificates").$type<ProductCertificate[]>().notNull().default([]),
    /** Downloads (393:7561): file ids from the files service, each with its label. */
    documents: jsonb("documents").$type<ProductDocument[]>().notNull().default([]),
    warrantyMonths: integer("warranty_months"),
    warrantyNote: text("warranty_note"),
    /** Service in India (393:7643), for example "Pune · Vadodara · Chennai". */
    serviceCities: text("service_cities"),
    serviceNote: text("service_note"),
    /** Services only (400:11134). */
    service: jsonb("service").$type<ServiceDetails>(),
    /** Draft, In review, Needs changes, Rejected, Live, Paused, Archived (step 8.3). */
    status: text("status").notNull().default("Draft"),
    publishedAt: utc("published_at"),
    /** The supplier's own SKU (step 8.5): a re-imported row with the same SKU updates, never duplicates. */
    sku: text("sku"),
    /** made_to_order or in_stock (Quick stock and price 722:12379). */
    stock: text("stock").notNull().default("made_to_order"),
    stockQty: integer("stock_qty"),
    /** Product photos (602:281): file ids of product_image uploads, in order. */
    images: jsonb("images").$type<{ fileId: string }[]>().notNull().default([]),
    /** Why a new listing was rejected, as the operator wrote it (603:8). */
    rejectReason: text("reject_reason"),
    sample: boolean("sample").notNull().default(false),
    ...timestamps,
    ...authorship,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("products_slug")
      .on(t.slug)
      .where(sql`${t.deletedAt} is null`),
    index("products_category").on(t.categoryId, t.status),
    index("products_organisation").on(t.organisationId),
    index("products_attributes").using("gin", t.attributes),
    uniqueIndex("products_sku")
      .on(t.organisationId, t.sku)
      .where(sql`${t.sku} is not null and ${t.deletedAt} is null`),
  ],
);

/** An operator's note on one field (602:281: "H2 India: add the test conditions..."). */
export interface ReviewNote {
  /** An attribute key, or a section: category, details, documents, commercial. */
  field: string;
  section: "category" | "details" | "specifications" | "documents" | "commercial";
  text: string;
}

/**
 * A listing submitted for review (step 8.3; Listings queue 629:367, Moderation 632:695). For a new listing the data
 * is the product itself; for a live listing it is the changed version, kept here while the live one stays up, and
 * applied on approval. Status: Draft (a live listing's unsent change), In review, Needs changes, Approved, Rejected.
 */
export const productRevisions = core.table(
  "product_revisions",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    /** new listing, spec change, category change, certificate added, from datasheet */
    kind: text("kind").notNull(),
    status: text("status").notNull().default("In review"),
    /** The reviewable fields as submitted. */
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    /** Automated checks (632:695): key → { ok, label, detail }. */
    checks: jsonb("checks")
      .$type<{ key: string; ok: boolean; label: string; detail?: string }[]>()
      .notNull()
      .default([]),
    notes: jsonb("notes").$type<ReviewNote[]>().notNull().default([]),
    reason: text("reason"),
    submittedBy: uuid("submitted_by").references(() => users.id),
    submittedAt: utc("submitted_at"),
    assigneeId: uuid("assignee_id").references(() => users.id),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: utc("decided_at"),
    ...timestamps,
  },
  (t) => [
    index("product_revisions_queue").on(t.status, t.submittedAt),
    index("product_revisions_product").on(t.productId),
  ],
);

/**
 * Ask a technical question (402:12544), step 6.4. Kept for the supplier's messages (step 9.7), where it becomes the
 * first message of a thread. The asker's email and phone are never shared; their company name only if they chose to.
 */
export const productQuestions = core.table(
  "product_questions",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    /** The supplier the question goes to (company-owned). */
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    askerId: uuid("asker_id")
      .notNull()
      .references(() => users.id),
    question: text("question").notNull(),
    /** The asker's company name, only when they chose to share it. */
    sharedCompany: text("shared_company"),
    status: text("status").notNull().default("Open"),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("product_questions_supplier").on(t.organisationId, t.createdAt)],
);

/** Report this listing (755:15048), step 6.4: goes to the Listings queue (step 11.2). The supplier never sees who. */
export const listingReports = core.table(
  "listing_reports",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    /** incorrect-specs, counterfeit, misleading-certificate, prohibited, duplicate, other */
    problem: text("problem").notNull(),
    details: text("details").notNull(),
    email: text("email"),
    reporterId: uuid("reporter_id").references(() => users.id),
    status: text("status").notNull().default("Received"),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("listing_reports_status").on(t.status, t.createdAt)],
);

/** One field read from a datasheet (step 8.4). Confidence is worked out from the engine's score and the thresholds. */
export interface ExtractedFieldRow {
  attributeKey: string;
  value: string | number | { min: number; max: number } | null;
  unit?: string;
  score: number;
  confidence: "high" | "medium" | "low";
  sourcePage?: number;
  sourceText?: string;
  /** The value can't be saved: outside the attribute's allowed range or of the wrong kind. */
  problem?: string;
}

/**
 * A datasheet read by the extraction engine (step 8.4; Datasheet review 610:8). Runs only in the worker; the file stays
 * private. Status: Queued, Reading, Ready, Failed, Submitted. The engine and model version are kept for audit.
 */
export const datasheetExtractions = core.table(
  "datasheet_extractions",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    fileId: uuid("file_id").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => catalogueCategories.id),
    status: text("status").notNull().default("Queued"),
    engine: text("engine"),
    engineVersion: text("engine_version"),
    /** Where the file was processed (M8). */
    region: text("region"),
    fields: jsonb("fields").$type<ExtractedFieldRow[]>().notNull().default([]),
    /** The supplier's check per field: accepted, edited (with the value), absent (not in the datasheet). */
    decisions: jsonb("decisions")
      .$type<Record<string, { state: "accepted" | "edited" | "absent"; value?: unknown }>>()
      .notNull()
      .default({}),
    productId: uuid("product_id").references(() => products.id),
    error: text("error"),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [index("datasheet_extractions_org").on(t.organisationId, t.createdAt)],
);
