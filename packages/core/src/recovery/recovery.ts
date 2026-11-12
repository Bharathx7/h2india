import { parseServerEnv } from "@h2india/config";
import { schema } from "@h2india/db";
import { renderRecovery } from "@h2india/emails";
import { randomBytes } from "node:crypto";
import { and, eq, gt, ne, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { can } from "../authz/can";
import { DEFAULT_ROLE } from "../authz/catalogue";
import { hashToken } from "../companies/drafts";
import { normaliseMobile } from "../companies/rules";
import { getDb } from "../db";
import { deliverEmail, deliverSms, TemplateNotApprovedError } from "../notify/channels";
import { notify } from "../notify/notify";
import { nextReference } from "../reference";
import { normaliseEmail } from "../sign-in/rules";
import { checkCode, sendCode } from "./codes";

// Account recovery (step 3.5, Figma 528:8). Three paths, each needing two independent proofs:
//  • lost passkey: a code to the work email and a code to the mobile on file, then a new passkey (528:53, 528:217)
//  • changed mobile: a code to the work email and a code to the new number, then an Admin approves (528:293, 528:480; A14)
//  • lost email: a code to the mobile on file and an Admin's confirmation, then a new work email (528:534; A15)
// Where the company's only Admin is the person, H2 India support approves instead (A17). No shortcut "for support".

const { recoveryRequests: rr, users: u, memberships: m, organisations: o, verifications: v } = schema;

export type RecoveryKind = "passkey" | "mobile" | "email";
export type Factor = "email" | "mobile" | "new_mobile";

export class RecoveryError extends Error {
  constructor(
    readonly code:
      | "NOT_FOUND"
      | "EXPIRED"
      | "NOT_READY"
      | "NOT_ALLOWED"
      | "INVALID_MOBILE"
      | "INVALID_EMAIL"
      | "EMAIL_TAKEN"
      | "INVALID"
      | "TOO_MANY",
    message: string,
  ) {
    super(message);
  }
}

const HOURS = 60 * 60 * 1000;
const STARTED_HOURS = 24;
const WAITING_DAYS = 7;

export function maskMobile(mobile: string | null): string | null {
  if (!mobile) return null;
  const digits = mobile.replace(/\D/g, "").slice(-10);
  return `+91 ••••• ${digits.slice(5)}`;
}

type Mail = { subject: string; html: string; text: string };
const security = (to: string, mail: Mail, template: "email.new_email_confirm" | "email.mobile_changed") =>
  deliverEmail({ template, event: `account.${template.slice(6)}`, to, mail, security: true });

async function byToken(token: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(rr)
    .where(eq(rr.tokenHash, hashToken(token)));
  if (!row) throw new RecoveryError("NOT_FOUND", "No such recovery");
  if (row.expiresAt < new Date()) throw new RecoveryError("EXPIRED", "This recovery has expired");
  return row;
}

/** Step 1 of every path. Codes go only to an account that exists; the screen looks the same either way. */
export async function startRecovery(input: { kind: RecoveryKind; email: string }) {
  const db = getDb();
  const email = normaliseEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new RecoveryError("INVALID_EMAIL", "Enter your work email");
  const [user] = await db.select().from(u).where(eq(u.email, email));
  const [seat] = user
    ? await db.select({ organisationId: m.organisationId }).from(m).where(eq(m.userId, user.id)).limit(1)
    : [];
  const token = randomBytes(24).toString("base64url");
  await db.insert(rr).values({
    kind: input.kind,
    tokenHash: hashToken(token),
    userId: user?.id ?? null,
    organisationId: seat?.organisationId ?? null,
    expiresAt: new Date(Date.now() + STARTED_HOURS * HOURS),
  });
  const [row] = await db
    .select({ id: rr.id })
    .from(rr)
    .where(eq(rr.tokenHash, hashToken(token)));
  if (user && row) {
    const first = user.name.trim().split(/\s+/)[0] || undefined;
    if (input.kind !== "email")
      await sendCode({ key: `recovery:${row.id}:email`, channel: "email", to: email, name: first });
    if (input.kind !== "mobile" && user.mobile) {
      await sendCode({ key: `recovery:${row.id}:mobile`, channel: "sms", to: user.mobile });
    }
  }
  return { token, email, maskedMobile: maskMobile(user?.mobile ?? null) };
}

export interface RecoveryView {
  id: string;
  kind: string;
  status: string;
  email: string | null;
  maskedMobile: string | null;
  emailVerified: boolean;
  mobileVerified: boolean;
  newMobile: string | null;
  newMobileVerified: boolean;
  company: string | null;
  approverName: string | null;
  reference: string | null;
}

export async function readRecovery(token: string | undefined): Promise<RecoveryView | null> {
  if (!token) return null;
  const db = getDb();
  const [row] = await db
    .select({ r: rr, email: u.email, mobile: u.mobile, company: o.legalName })
    .from(rr)
    .leftJoin(u, eq(u.id, rr.userId))
    .leftJoin(o, eq(o.id, rr.organisationId))
    .where(and(eq(rr.tokenHash, hashToken(token)), gt(rr.expiresAt, sql`now()`)));
  if (!row) return null;
  const approver = row.r.organisationId ? await otherAdmin(row.r.organisationId, row.r.userId) : null;
  return {
    id: row.r.id,
    kind: row.r.kind,
    status: row.r.status,
    email: row.email,
    maskedMobile: maskMobile(row.mobile),
    emailVerified: row.r.emailVerifiedAt !== null,
    mobileVerified: row.r.mobileVerifiedAt !== null,
    newMobile: row.r.newMobile,
    newMobileVerified: row.r.newMobileVerifiedAt !== null,
    company: row.company,
    approverName: approver?.name ?? null,
    reference: row.r.reference,
  };
}

/** An Admin of the company other than this person, who can approve; null when the person is the only Admin. */
async function otherAdmin(organisationId: string, userId: string | null) {
  const [row] = await getDb()
    .select({ id: u.id, name: u.name, email: u.email })
    .from(m)
    .innerJoin(u, eq(u.id, m.userId))
    .where(
      and(
        eq(m.organisationId, organisationId),
        eq(m.role, DEFAULT_ROLE.creator),
        userId ? ne(m.userId, userId) : undefined,
      ),
    )
    .orderBy(m.createdAt)
    .limit(1);
  return row ?? null;
}

export async function verifyFactor(input: { token: string; factor: Factor; code: string }): Promise<void> {
  const row = await byToken(input.token);
  const db = getDb();
  const [user] = row.userId ? await db.select().from(u).where(eq(u.id, row.userId)) : [];
  const to = input.factor === "email" ? user?.email : input.factor === "mobile" ? user?.mobile : row.newMobile;
  // An unknown email gets the same answer as a wrong code.
  await checkCode({ key: `recovery:${row.id}:${input.factor}`, to: to ?? `none:${row.id}`, code: input.code });
  const now = new Date();
  await db
    .update(rr)
    .set(
      input.factor === "email"
        ? { emailVerifiedAt: now }
        : input.factor === "mobile"
          ? { mobileVerifiedAt: now }
          : { newMobileVerifiedAt: now },
    )
    .where(eq(rr.id, row.id));
}

/** Changed mobile: send a code to the new number (528:293). */
export async function sendNewMobileCode(input: { token: string; mobile: string }): Promise<string> {
  const row = await byToken(input.token);
  const mobile = normaliseMobile(input.mobile);
  if (!mobile) throw new RecoveryError("INVALID_MOBILE", "Enter a 10-digit mobile number");
  await getDb().update(rr).set({ newMobile: mobile, newMobileVerifiedAt: null }).where(eq(rr.id, row.id));
  if (row.userId) await sendCode({ key: `recovery:${row.id}:new_mobile`, channel: "sms", to: mobile });
  return mobile;
}

/** Lost passkey: both codes given, so the person may sign in once and create a new passkey. Returns the user id. */
export async function claimRecoverySession(token: string): Promise<string> {
  const row = await byToken(token);
  const db = getDb();
  const passkeyReady =
    row.kind === "passkey" && row.status === "Started" && row.emailVerifiedAt && row.mobileVerifiedAt;
  const emailReady = row.kind === "email" && row.status === "Approved" && row.mobileVerifiedAt;
  if (!row.userId || !(passkeyReady || emailReady)) throw new RecoveryError("NOT_READY", "Both proofs are needed");
  const next = row.kind === "passkey" ? "Completed" : "Signed in";
  const updated = await db
    .update(rr)
    .set({ status: next })
    .where(and(eq(rr.id, row.id), eq(rr.status, row.status)))
    .returning({ id: rr.id });
  if (updated.length === 0) throw new RecoveryError("NOT_READY", "Already used");
  await audit(db, {
    actorId: row.userId,
    action: `recovery.${row.kind}.signed_in`,
    resourceType: "recovery_request",
    resourceId: row.id,
    companyId: row.organisationId,
  });
  if (row.kind === "passkey") await notifyPasskeyReset(row.userId, row.organisationId);
  return row.userId;
}

async function admins(organisationId: string, except: string | null) {
  return getDb()
    .select({ id: u.id, name: u.name, email: u.email })
    .from(m)
    .innerJoin(u, eq(u.id, m.userId))
    .where(
      and(
        eq(m.organisationId, organisationId),
        eq(m.role, DEFAULT_ROLE.creator),
        except ? ne(m.userId, except) : undefined,
      ),
    );
}

async function notifyPasskeyReset(userId: string, organisationId: string | null) {
  if (!organisationId) return;
  const env = parseServerEnv();
  const db = getDb();
  const [person] = await db.select({ name: u.name, email: u.email }).from(u).where(eq(u.id, userId));
  const [org] = await db.select({ name: o.legalName }).from(o).where(eq(o.id, organisationId));
  const who = person?.name || person?.email || "A team member";
  for (const admin of await admins(organisationId, userId)) {
    await notify({
      event: "recovery.passkey_reset",
      topic: "team.requests",
      userId: admin.id,
      scope: organisationId,
      email: {
        template: "email.passkey_reset_admin",
        mail: await renderRecovery(env.APP_URL, "passkeyReset", {
          adminName: admin.name.split(/\s+/)[0] ?? "",
          person: who,
          company: org?.name ?? "your company",
          supportEmail: env.SUPPORT_EMAIL,
        }),
      },
      inApp: {
        category: "team",
        icon: "lock",
        title: `${who} reset their passkey`,
        body: "No action is needed if you expected this.",
      },
    });
  }
}

/** Sends the request to the other Admins, or to H2 India support when there is none (A17). */
async function askForApproval(row: typeof rr.$inferSelect, what: "mobile" | "email"): Promise<string> {
  const env = parseServerEnv();
  const db = getDb();
  const [person] = row.userId
    ? await db.select({ name: u.name, email: u.email }).from(u).where(eq(u.id, row.userId))
    : [];
  const [org] = row.organisationId
    ? await db.select({ name: o.legalName }).from(o).where(eq(o.id, row.organisationId))
    : [];
  const url = `${env.APP_URL}/account/recovery/${row.id}`;
  const approvers = row.organisationId ? await admins(row.organisationId, row.userId) : [];
  const status = approvers.length > 0 ? "Waiting for admin" : "Waiting for support";
  await db
    .update(rr)
    .set({ status, expiresAt: new Date(Date.now() + WAITING_DAYS * 24 * HOURS) })
    .where(eq(rr.id, row.id));
  const name = person?.name || person?.email || "A team member";
  if (approvers.length > 0) {
    for (const admin of approvers) {
      await notify({
        event: "recovery.approval_needed",
        topic: "team.requests",
        userId: admin.id,
        scope: row.organisationId ?? "",
        email: {
          template: "email.recovery_approval",
          mail: await renderRecovery(env.APP_URL, "recoveryApproval", {
            adminName: admin.name.split(/\s+/)[0] ?? "",
            person: name,
            company: org?.name ?? "your company",
            what,
            url,
          }),
        },
        inApp: {
          category: "team",
          icon: "shield-check",
          title: what === "mobile" ? `Approve ${name}'s new mobile number` : `Confirm it's ${name}`,
          body: what === "mobile" ? "It takes effect when you approve it" : "They lost access to their work email",
          href: `/account/recovery/${row.id}`,
          actionLabel: "Review request",
        },
      });
    }
  } else {
    const reference = await nextReference(db, "SUP");
    await db.update(rr).set({ reference }).where(eq(rr.id, row.id));
    await deliverEmail({
      template: "email.support_request",
      event: "recovery.support_request",
      to: env.SUPPORT_EMAIL,
      mail: await renderRecovery(env.APP_URL, "supportRequest", {
        reference,
        name,
        company: org?.name ?? "No company",
        contactEmail: person?.email ?? "",
        kind: what === "mobile" ? "New mobile number to approve" : "Lost email: confirm the person",
        url,
      }),
    });
  }
  await audit(db, {
    actorId: row.userId,
    action: `recovery.${row.kind}.requested`,
    resourceType: "recovery_request",
    resourceId: row.id,
    companyId: row.organisationId,
    after: { status },
  });
  return status;
}

/** Changed mobile, step 2 (528:480): wait for an Admin, or change at once for individual members (A14). */
export async function submitMobileChange(token: string): Promise<string> {
  const row = await byToken(token);
  if (
    row.kind !== "mobile" ||
    row.status !== "Started" ||
    !row.emailVerifiedAt ||
    !row.newMobileVerifiedAt ||
    !row.userId
  ) {
    throw new RecoveryError("NOT_READY", "Both proofs are needed");
  }
  if (row.organisationId) return askForApproval(row, "mobile");
  await applyMobileChange(row.id, row.userId, row.newMobile ?? "", null);
  return "Completed";
}

async function applyMobileChange(requestId: string, userId: string, mobile: string, decidedBy: string | null) {
  const env = parseServerEnv();
  const db = getDb();
  const [before] = await db.select({ mobile: u.mobile, email: u.email }).from(u).where(eq(u.id, userId));
  await db.transaction(async (tx) => {
    await tx.update(u).set({ mobile, mobileVerifiedAt: new Date() }).where(eq(u.id, userId));
    await tx
      .update(rr)
      .set({ status: "Completed", decidedBy, decidedAt: decidedBy ? new Date() : null })
      .where(eq(rr.id, requestId));
    await audit(tx, {
      actorId: decidedBy ?? userId,
      action: "user.mobile.changed",
      resourceType: "user",
      resourceId: userId,
      before: { mobile: before?.mobile ?? null },
      after: { mobile },
    });
  });
  // A courtesy notice: if its SMS template isn't approved yet (M5), the refusal is logged and the change still stands.
  await deliverSms({
    template: "sms.mobile_changed",
    event: "account.mobile_changed",
    userId,
    to: mobile,
    data: {},
  }).catch((error: unknown) => {
    if (!(error instanceof TemplateNotApprovedError)) throw error;
  });
  if (before?.email) {
    await security(
      before.email,
      await renderRecovery(env.APP_URL, "mobileChanged", { mobile }),
      "email.mobile_changed",
    );
  }
}

/** Lost email, "Use my mobile and admin" (528:534): after the mobile code, ask an Admin (or support) to confirm. */
export async function submitLostEmail(token: string): Promise<string> {
  const row = await byToken(token);
  if (row.kind !== "email" || row.status !== "Started" || !row.mobileVerifiedAt || !row.userId) {
    throw new RecoveryError("NOT_READY", "The mobile code is needed");
  }
  return askForApproval(row, "email");
}

/** An Admin of that company, or an operator handling the support queue, approves or declines (A14 to A17). */
export async function decideRecovery(input: {
  actor: Actor;
  requestId: string;
  approve: boolean;
  context?: RequestContext;
}) {
  const db = getDb();
  const [row] = await db.select().from(rr).where(eq(rr.id, input.requestId));
  if (!row || !row.userId) throw new RecoveryError("NOT_FOUND", "No such request");
  const isAdmin =
    row.status === "Waiting for admin" &&
    row.organisationId !== null &&
    input.actor.userId !== row.userId &&
    can(input.actor, "team.manage", { organisationId: row.organisationId });
  const isSupport =
    row.status === "Waiting for support" && can(input.actor, "queues.edit") && can(input.actor, "users.view");
  if (!isAdmin && !isSupport) throw new RecoveryError("NOT_ALLOWED", "Not allowed to answer this request");
  const decidedBy = input.actor.userId;
  if (!input.approve) {
    await db.update(rr).set({ status: "Declined", decidedBy, decidedAt: new Date() }).where(eq(rr.id, row.id));
  } else if (row.kind === "mobile") {
    await applyMobileChange(row.id, row.userId, row.newMobile ?? "", decidedBy);
  } else {
    await db.update(rr).set({ status: "Approved", decidedBy, decidedAt: new Date() }).where(eq(rr.id, row.id));
  }
  await audit(db, {
    actorId: decidedBy,
    action: `recovery.${row.kind}.${input.approve ? "approved" : "declined"}`,
    resourceType: "recovery_request",
    resourceId: row.id,
    companyId: row.organisationId,
    context: input.context,
  });
}

/**
 * What the review page shows (not drawn; built from the design system, decision A11). Only the people who may answer
 * see it: an Admin of the company, or operators with Users access (support, A16). Anyone else gets null.
 */
export async function recoveryForReview(actor: Actor, requestId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return null;
  const [row] = await getDb()
    .select({ r: rr, name: u.name, email: u.email, company: o.legalName })
    .from(rr)
    .leftJoin(u, eq(u.id, rr.userId))
    .leftJoin(o, eq(o.id, rr.organisationId))
    .where(eq(rr.id, requestId));
  if (!row) return null;
  const admin =
    row.r.organisationId !== null &&
    row.r.userId !== actor.userId &&
    can(actor, "team.manage", { organisationId: row.r.organisationId });
  return admin || can(actor, "users.view") ? row : null;
}

/** Lost email, after signing in (A15): send a confirmation link to the new work email. */
export async function requestNewEmail(input: { userId: string; email: string }): Promise<void> {
  const db = getDb();
  const email = normaliseEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new RecoveryError("INVALID_EMAIL", "Enter your new work email");
  const [taken] = await db.select({ id: u.id }).from(u).where(eq(u.email, email));
  if (taken) throw new RecoveryError("EMAIL_TAKEN", "That email already has an account");
  const [row] = await db
    .select()
    .from(rr)
    .where(and(eq(rr.userId, input.userId), eq(rr.kind, "email"), eq(rr.status, "Signed in")))
    .limit(1);
  if (!row) throw new RecoveryError("NOT_READY", "No recovery in progress");
  const token = randomBytes(24).toString("base64url");
  await db.update(rr).set({ newEmail: email }).where(eq(rr.id, row.id));
  await db.delete(v).where(eq(v.identifier, `recovery-email:${row.id}`));
  await db.insert(v).values({
    identifier: `recovery-email:${row.id}`,
    value: hashToken(token),
    expiresAt: new Date(Date.now() + 24 * HOURS),
  });
  const env = parseServerEnv();
  await security(
    email,
    await renderRecovery(env.APP_URL, "newEmail", {
      email,
      url: `${env.APP_URL}/forgot-access/email/confirm?request=${row.id}&token=${token}`,
    }),
    "email.new_email_confirm",
  );
}

/** The link in the new-email message: the new address becomes the sign-in email. */
export async function confirmNewEmail(input: { requestId: string; token: string }): Promise<string> {
  const db = getDb();
  const [code] = await db
    .select()
    .from(v)
    .where(eq(v.identifier, `recovery-email:${input.requestId}`));
  if (!code || code.expiresAt < new Date() || code.value !== hashToken(input.token)) {
    throw new RecoveryError("EXPIRED", "This link has expired");
  }
  const [row] = await db.select().from(rr).where(eq(rr.id, input.requestId));
  if (!row?.userId || !row.newEmail) throw new RecoveryError("NOT_FOUND", "No such request");
  const userId = row.userId;
  const [before] = await db.select({ email: u.email }).from(u).where(eq(u.id, userId));
  await db.transaction(async (tx) => {
    await tx
      .update(u)
      .set({ email: row.newEmail ?? "", emailVerified: true })
      .where(eq(u.id, userId));
    await tx.update(rr).set({ status: "Completed" }).where(eq(rr.id, row.id));
    await tx.delete(v).where(eq(v.id, code.id));
    await audit(tx, {
      actorId: userId,
      action: "user.email.changed",
      resourceType: "user",
      resourceId: userId,
      companyId: row.organisationId,
      before: { email: before?.email ?? null },
      after: { email: row.newEmail },
    });
  });
  return row.newEmail;
}
