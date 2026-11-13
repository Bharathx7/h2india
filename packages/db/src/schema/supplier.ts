import { sql } from "drizzle-orm";
import { index, jsonb, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { id, utc } from "../columns";
import { users } from "./auth";
import { organisations } from "./companies";
import { core } from "./core";

// The supplier workspace (Stage 8).

/**
 * "Submit for review" (584:8 step 5): the supplier asks H2 India to check the company and first listing. Operators
 * decide it in the Verification desk (step 8.2). Statuses change only through changeStatus().
 */
export const supplierReviews = core.table(
  "supplier_reviews",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    /** Submitted, Approved, Changes requested */
    status: text("status").notNull().default("Submitted"),
    submittedBy: uuid("submitted_by").references(() => users.id),
    submittedAt: utc("submitted_at")
      .notNull()
      .default(sql`now()`),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: utc("decided_at"),
    reason: text("reason"),
    /** The operator's Verification checklist (635:9), by item key. */
    checks: jsonb("checks").$type<Record<string, boolean>>().notNull().default({}),
    updatedAt: utc("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("supplier_reviews_org").on(t.organisationId, t.submittedAt)],
);

/**
 * A verification document (step 8.2; 586:8, Upload document 272:4545): GSTIN, PAN, CIN, Udyam, factory licence,
 * certificates, or a site visit recorded by H2 India. Status: Submitted, Verified, Needs re-upload, Rejected, Expired.
 * A re-upload is a new row that `replaces` the old one; the old one stays for the record.
 */
export const verificationDocuments = core.table(
  "verification_documents",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    /** gstin, pan, cin, udyam, factory_licence, site_visit, certificate, dpiit, sight */
    type: text("type").notNull(),
    /** For certificates: "ISO 22734", "ATEX Zone 1", "PESO approval". */
    name: text("name"),
    /** What it covers: "Diaphragm compressor DC-500", "Ambattur plant, Chennai". */
    scope: text("scope"),
    number: text("number"),
    fileId: uuid("file_id"),
    issuedBy: text("issued_by"),
    issuedOn: utc("issued_on"),
    expiresOn: utc("expires_on"),
    /** Site visits: when H2 India visits. */
    visitAt: utc("visit_at"),
    status: text("status").notNull().default("Submitted"),
    reason: text("reason"),
    checkedAt: utc("checked_at"),
    checkedBy: uuid("checked_by").references(() => users.id),
    /** When the "expires soon" email went (673:221), so it goes once. */
    noticeSentAt: utc("notice_sent_at"),
    replaces: uuid("replaces"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: utc("updated_at")
      .notNull()
      .default(sql`now()`),
    deletedAt: utc("deleted_at"),
  },
  (t) => [
    index("verification_documents_org").on(t.organisationId, t.type),
    index("verification_documents_expiry")
      .on(t.expiresOn)
      .where(sql`${t.status} = 'Verified'`),
  ],
);

/**
 * A badge (step 8.2): a public promise, granted only by an operator from recorded evidence (playbook watch-out).
 * Status: Active, Paused (a document it rests on lapsed), Revoked (with a reason). One row per company and kind.
 */
export const supplierBadges = core.table(
  "supplier_badges",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    /** verified_supplier, site_verified, sight_awardee, made_in_india_self, made_in_india_verified, dpiit */
    kind: text("kind").notNull(),
    status: text("status").notNull().default("Active"),
    /** What was checked, in words, for the record. */
    evidence: text("evidence").notNull(),
    /** The documents it rests on: one lapsing pauses the badge. */
    documentIds: uuid("document_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    verifiedBy: uuid("verified_by").references(() => users.id),
    grantedAt: utc("granted_at")
      .notNull()
      .default(sql`now()`),
    lastCheckedAt: utc("last_checked_at")
      .notNull()
      .default(sql`now()`),
    reason: text("reason"),
    updatedAt: utc("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [uniqueIndex("supplier_badges_kind").on(t.organisationId, t.kind)],
);

/** Automated checks (635:9): GSTIN active, PAN and CIN on MCA records, bank name match. The latest result per check. */
export const verificationChecks = core.table(
  "verification_checks",
  {
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    /** gstin, pan, cin, bank */
    check: text("check").notNull(),
    /** pass, fail, unavailable */
    result: text("result").notNull(),
    detail: text("detail").notNull().default(""),
    checkedAt: utc("checked_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [uniqueIndex("verification_checks_one").on(t.organisationId, t.check)],
);

/**
 * The payout bank account (step 8.6; 588:222). The full account number is stored only encrypted; pages, emails, logs
 * and the audit log see the last four digits. Status: Pending (checked, waiting for the passkey), Held (confirmed;
 * payouts held until holdUntil), Active, Failed (the check didn't match), Cancelled, Replaced.
 */
export const payoutBankAccounts = core.table(
  "payout_bank_accounts",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    holderName: text("holder_name").notNull(),
    accountLast4: text("account_last4").notNull(),
    /** AES-256-GCM, for the payout provider (Launch 2). Never logged. */
    accountCipher: text("account_cipher").notNull(),
    ifsc: text("ifsc").notNull(),
    branch: text("branch"),
    status: text("status").notNull().default("Pending"),
    /** "Test deposit of ₹1" or "Name match" (M4). */
    checkMethod: text("check_method"),
    /** The name the bank returned. */
    bankName: text("bank_name"),
    nameMatches: jsonb("name_matches").$type<boolean>(),
    failReason: text("fail_reason"),
    checkedAt: utc("checked_at"),
    confirmedAt: utc("confirmed_at"),
    holdUntil: utc("hold_until"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: utc("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("payout_bank_accounts_org").on(t.organisationId, t.createdAt)],
);
