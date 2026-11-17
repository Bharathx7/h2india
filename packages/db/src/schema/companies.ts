import { sql } from "drizzle-orm";
import { bigint, boolean, index, integer, jsonb, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { id, softDelete, timestamps, utc } from "../columns";
import { users } from "./auth";
import { core } from "./core";

// Companies (step 3.3): organisations, their GSTINs, memberships, join requests and invitations.
// Duplicates are stopped on GSTIN and PAN, never on the name (playbook step 3.3).

/** A buyer company, a supplier company, or both. Status words follow the badges. */
export const organisations = core.table(
  "organisations",
  {
    id: id(),
    kind: text("kind").notNull(), // buyer | supplier | both
    legalName: text("legal_name").notNull(),
    /** From the GSTIN; null for a company without a GSTIN yet. One company per PAN. */
    pan: text("pan"),
    state: text("state"),
    registeredAddress: text("registered_address"),
    /** Verified · Unverified · Pending (a GSTIN check is still running) */
    verification: text("verification").notNull().default("Unverified"),
    /** Suspended by an operator (step 11.4, G10): its listings leave the marketplace and search until lifted. */
    suspendedAt: utc("suspended_at"),
    suspendReason: text("suspend_reason"),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("organisations_pan_unique")
      .on(t.pan)
      .where(sql`${t.pan} IS NOT NULL AND ${t.deletedAt} IS NULL`),
    index("organisations_legal_name_idx").on(sql`lower(${t.legalName})`),
  ],
);

/**
 * A company's public profile basics (step 4.6, A38; frame 481:8). Pre-seeded profiles come from the importer as
 * Unclaimed until the company claims them (step 6.7). `import_key` is the stable key from the import file, so running
 * the same import again updates instead of duplicating.
 */
export const companyProfiles = core.table(
  "company_profiles",
  {
    organisationId: uuid("organisation_id")
      .primaryKey()
      .references(() => organisations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    importKey: text("import_key").unique(),
    tradeName: text("trade_name").notNull(),
    /** The chips on 481:8, for example Manufacturer, Services. */
    types: text("types")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    city: text("city"),
    website: text("website"),
    categories: text("categories")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    summary: text("summary"),
    foundedYear: integer("founded_year"),
    /** For example 51–200 (481:8 "51–200 employees"). */
    employees: text("employees"),
    /** Unclaimed · Claimed (step 6.7 adds the claim states). */
    /** The published storefront (590:8, step 8.7): what the profile's About and Products tabs show beyond the basics. */
    storefront: jsonb("storefront").$type<StorefrontData>().notNull().default({}),
    claimStatus: text("claim_status").notNull().default("Claimed"),
    sample: boolean("sample").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("company_profiles_claim_idx").on(t.claimStatus)],
);

/** A GSTIN of a company and the result of its check on the GST portal. */
export const organisationGstins = core.table(
  "organisation_gstins",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    gstin: text("gstin").notNull().unique(),
    stateCode: text("state_code").notNull(),
    /** Place shown next to the GSTIN, for example "Pune, Maharashtra". */
    place: text("place"),
    /** Active · Inactive · Cancelled · Pending (not checked yet) */
    portalStatus: text("portal_status").notNull().default("Pending"),
    legalName: text("legal_name"),
    checkedAt: utc("checked_at"),
    /** Orders are billed to the default GSTIN unless the buyer chooses another (574:638). */
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("organisation_gstins_organisation_idx").on(t.organisationId)],
);

/** A person in a company. Roles and order limits are refined in step 3.4. */
export const memberships = core.table(
  "memberships",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // owner | admin | member (step 3.4)
    orderLimitPaise: bigint("order_limit_paise", { mode: "bigint" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("memberships_org_user_unique").on(t.organisationId, t.userId),
    index("memberships_user_idx").on(t.userId),
  ],
);

/**
 * A company's own changes to a role's default permissions (founder QC, 17 Nov 2026): a ticked box on Team that the
 * defaults don't have (granted true), or a default the company took away (granted false). Admin is never changed.
 * Read by loadActor(); changed only through setRolePermission() (@h2india/core/authz), audited.
 */
export const companyRolePermissions = core.table(
  "company_role_permissions",
  {
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    permissionKey: text("permission_key").notNull(),
    granted: boolean("granted").notNull(),
    changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("company_role_permissions_unique").on(t.organisationId, t.role, t.permissionKey)],
);

/** A request to join an existing company: Pending · Approved · Rejected · Expired · Cancelled (365:27779). */
export const joinRequests = core.table(
  "join_requests",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("Pending"),
    expiresAt: utc("expires_at").notNull(),
    lastReminderAt: utc("last_reminder_at"),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: utc("decided_at"),
    reason: text("reason"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("join_requests_one_pending")
      .on(t.organisationId, t.userId)
      .where(sql`${t.status} = 'Pending'`),
    index("join_requests_user_idx").on(t.userId),
  ],
);

/** An invitation to join a company by email. The token is stored hashed. Screens come with company settings. */
export const invitations = core.table(
  "invitations",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: uuid("invited_by").references(() => users.id),
    expiresAt: utc("expires_at").notNull(),
    acceptedAt: utc("accepted_at"),
    revokedAt: utc("revoked_at"),
    ...timestamps,
  },
  (t) => [index("invitations_org_idx").on(t.organisationId)],
);

/**
 * What a person has entered in the Join flow before their email is confirmed. Identified by a random token in an
 * http-only cookie (stored here hashed). Copied to the account only once that email is confirmed.
 */
export const joinDrafts = core.table(
  "join_drafts",
  {
    tokenHash: text("token_hash").primaryKey(),
    path: text("path"), // buyer | supplier | member
    organisationId: uuid("organisation_id").references(() => organisations.id, { onDelete: "set null" }),
    email: text("email"),
    mobile: text("mobile"),
    mobileVerifiedAt: utc("mobile_verified_at"),
    fullName: text("full_name"),
    jobRole: text("job_role"),
    termsAcceptedAt: utc("terms_accepted_at"),
    termsVersion: text("terms_version"),
    expiresAt: utc("expires_at").notNull(),
    ...timestamps,
  },
  (t) => [index("join_drafts_expires_at_idx").on(t.expiresAt)],
);

/** The storefront's sections (590:8): banner and logo, about, capabilities, locations, contact. */
export interface StorefrontData {
  logoFileId?: string;
  about?: string;
  capabilities?: string;
  capacity?: string;
  leadTime?: string;
  industries?: string[];
  locations?: { name: string; city: string; state: string; kind: string }[];
  contactEmail?: string;
  contactPhone?: string;
}

/**
 * An appeal against a company's suspension (G10): sent from the supplier workspace, decided in admin Users › Appeals.
 * Status: Open · Lifted · Upheld. One open appeal per company at a time.
 */
export const suspensionAppeals = core.table(
  "suspension_appeals",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    sentBy: uuid("sent_by")
      .notNull()
      .references(() => users.id),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("Open"),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: utc("decided_at"),
    note: text("note"),
    createdAt: utc("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("suspension_appeals_org").on(t.organisationId, t.status)],
);
