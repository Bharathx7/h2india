import { bigint, boolean, index, integer, text, uuid } from "drizzle-orm/pg-core";
import { id, timestamps, utc } from "../columns";
import { core } from "./core";

// Sign-in tables (step 3.2, ADR 0003). Better Auth reads and writes them through its Drizzle adapter, so the
// property names are Better Auth's field names; the columns follow our conventions (snake_case, uuid v7, UTC).
// Better Auth generates the ids (advanced.database.generateId), so id() is only the fallback.

export const users = core.table("users", {
  id: id(),
  name: text("name").notNull().default(""),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Join step 3 (525:207). Mobile is for verification and recovery only (decision C6).
  mobile: text("mobile"),
  mobileVerifiedAt: utc("mobile_verified_at"),
  jobRole: text("job_role"),
  /** buyer | supplier | member: the path chosen in Join step 1. Null until the person has joined. */
  profileType: text("profile_type"),
  /**
   * When a buyer or supplier also joined as a member (founder QC, 17 Nov 2026): membership is a yes/no beside the
   * profile type, so one account can be a buyer and a member. Everyone with profile type "member" is a member too.
   * Read only through isMember() (@h2india/core/members).
   */
  memberSince: utc("member_since"),
  termsAcceptedAt: utc("terms_accepted_at"),
  /** The Terms of use version accepted (step 5.8), or "unpublished" while the text waits for M2. */
  termsVersion: text("terms_version"),
  /** Suspended by an operator (653:568, step 11.4): sign-in refused and sessions ended until lifted. */
  suspendedAt: utc("suspended_at"),
  suspendReason: text("suspend_reason"),
  ...timestamps,
});

export const sessions = core.table(
  "sessions",
  {
    id: id(),
    token: text("token").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: utc("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

/** Sign-in methods linked to a user other than passkeys: Google, and the email-code marker Better Auth keeps. */
export const accounts = core.table(
  "accounts",
  {
    id: id(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: utc("access_token_expires_at"),
    refreshTokenExpiresAt: utc("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("accounts_user_id_idx").on(t.userId)],
);

/** Short-lived values: sign-in codes (stored hashed) and OAuth state. Old rows are cleared by a scheduled job. */
export const verifications = core.table(
  "verifications",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: utc("expires_at").notNull(),
    ...timestamps,
  },
  (t) => [
    index("verifications_identifier_idx").on(t.identifier),
    index("verifications_expires_at_idx").on(t.expiresAt),
  ],
);

export const passkeys = core.table(
  "passkeys",
  {
    id: id(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    credentialID: text("credential_id").notNull().unique(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: boolean("backed_up").notNull(),
    transports: text("transports"),
    aaguid: text("aaguid"),
    createdAt: utc("created_at").notNull().defaultNow(),
  },
  (t) => [index("passkeys_user_id_idx").on(t.userId)],
);

/** Better Auth's per-IP request counters. */
export const rateLimits = core.table("rate_limits", {
  id: id(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/** Our own sign-in counters per email (decision A2): codes sent, wrong codes, pauses. One atomic upsert per hit. */
export const signInThrottle = core.table(
  "sign_in_throttle",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    expiresAt: utc("expires_at").notNull(),
  },
  (t) => [index("sign_in_throttle_expires_at_idx").on(t.expiresAt)],
);
