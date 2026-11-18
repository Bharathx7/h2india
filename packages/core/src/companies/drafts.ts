import { parseServerEnv } from "@h2india/config";
import { schema, type Executor } from "@h2india/db";
import { createHmac, randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { flagNow } from "../admin/system";
import { getDb } from "../db";
import { normaliseEmail } from "../sign-in/rules";
import type { JoinPath } from "./rules";

// What a person types in the Join flow before their email is confirmed lives in a draft, identified by a random
// token in an http-only cookie. It is copied to their account only after they have proved the email (decision A7),
// so typing someone else's email never changes that person's account.

const { joinDrafts: d, users: u } = schema;
const DRAFT_DAYS = 7;

export function hashToken(token: string): string {
  return createHmac("sha256", parseServerEnv().AUTH_SECRET).update(token).digest("base64url");
}

export interface JoinDraft {
  path: JoinPath | null;
  organisationId: string | null;
  email: string | null;
  mobile: string | null;
  mobileVerified: boolean;
  fullName: string | null;
  jobRole: string | null;
  termsAccepted: boolean;
  termsVersion: string | null;
}

export async function startDraft(): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await getDb()
    .insert(d)
    .values({ tokenHash: hashToken(token), expiresAt: sql`now() + make_interval(days => ${DRAFT_DAYS})` });
  return token;
}

export async function readDraft(token: string | undefined): Promise<JoinDraft | null> {
  if (!token) return null;
  const [row] = await getDb()
    .select()
    .from(d)
    .where(and(eq(d.tokenHash, hashToken(token)), gt(d.expiresAt, sql`now()`)));
  if (!row) return null;
  return {
    path: (row.path as JoinPath | null) ?? null,
    organisationId: row.organisationId,
    email: row.email,
    mobile: row.mobile,
    mobileVerified: row.mobileVerifiedAt !== null,
    fullName: row.fullName,
    jobRole: row.jobRole,
    termsAccepted: row.termsAcceptedAt !== null,
    termsVersion: row.termsVersion,
  };
}

export interface DraftPatch {
  path?: JoinPath;
  organisationId?: string | null;
  email?: string;
  fullName?: string;
  jobRole?: string;
  termsAccepted?: boolean;
  /** The Terms of use version shown when they ticked the box (step 5.8). */
  termsVersion?: string;
}

export async function updateDraft(token: string, patch: DraftPatch): Promise<void> {
  await getDb()
    .update(d)
    .set({
      ...(patch.path ? { path: patch.path } : {}),
      ...(patch.organisationId !== undefined ? { organisationId: patch.organisationId } : {}),
      ...(patch.email !== undefined ? { email: normaliseEmail(patch.email) } : {}),
      ...(patch.fullName !== undefined ? { fullName: patch.fullName.trim() } : {}),
      ...(patch.jobRole !== undefined ? { jobRole: patch.jobRole } : {}),
      ...(patch.termsAccepted ? { termsAcceptedAt: new Date(), termsVersion: patch.termsVersion ?? null } : {}),
    })
    .where(eq(d.tokenHash, hashToken(token)));
}

/**
 * Saves the mobile on the draft without a code, while the Join SMS code is switched off (founder, 18 Nov 2026,
 * `mobileVerification`). The number stays unverified: notifications never text it and recovery can't use it.
 */
export async function saveDraftMobile(token: string, mobile: string): Promise<void> {
  await getDb()
    .update(d)
    .set({ mobile, mobileVerifiedAt: null })
    .where(eq(d.tokenHash, hashToken(token)));
}

/** Whether Join asks for the SMS code (System settings switch "Mobile number check"). */
export const mobileCodeRequired = (): Promise<boolean> => flagNow(getDb(), "mobileVerification");

/** Marks the mobile as verified on the draft (called by mobile.ts after a correct code). */
export async function markMobileVerified(ex: Executor, token: string, mobile: string): Promise<void> {
  await ex
    .update(d)
    .set({ mobile, mobileVerifiedAt: new Date() })
    .where(eq(d.tokenHash, hashToken(token)));
}

/**
 * Copies the draft to the signed-in person's account. Only when the draft's email is the account's email
 * (proved by the link or the sign-in code). Returns the path chosen.
 */
export async function applyDraft(token: string, user: { id: string; email: string }): Promise<JoinDraft | null> {
  const draft = await readDraft(token);
  if (!draft?.path || !draft.fullName || !draft.mobile || !draft.termsAccepted) return null;
  if (!draft.mobileVerified && (await mobileCodeRequired())) return null;
  if (draft.email && normaliseEmail(draft.email) !== normaliseEmail(user.email)) return null;
  await getDb()
    .update(u)
    .set({
      name: draft.fullName,
      mobile: draft.mobile,
      mobileVerifiedAt: draft.mobileVerified ? new Date() : null,
      jobRole: draft.jobRole,
      profileType: draft.path,
      termsAcceptedAt: new Date(),
      termsVersion: draft.termsVersion,
    })
    .where(eq(u.id, user.id));
  return draft;
}

export async function discardDraft(token: string): Promise<void> {
  await getDb()
    .delete(d)
    .where(eq(d.tokenHash, hashToken(token)));
}

/** The join profile of a signed-in person: null profileType means they have not finished Join step 3. */
export async function joinProfile(userId: string) {
  const [row] = await getDb()
    .select({ name: u.name, email: u.email, profileType: u.profileType, mobile: u.mobile })
    .from(u)
    .where(eq(u.id, userId));
  return row ?? null;
}

/** Sets the path for a person who already has a profile (for example, starting a company after a rejection). */
export async function setProfileType(userId: string, path: JoinPath): Promise<void> {
  await getDb().update(u).set({ profileType: path }).where(eq(u.id, userId));
}
