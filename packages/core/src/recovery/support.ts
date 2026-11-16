import { WORK_ID_KEEP_DAYS } from "@h2india/config/files";
import { parseServerEnv } from "@h2india/config";
import { schema } from "@h2india/db";
import { renderRecovery } from "@h2india/emails";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { can } from "../authz/can";
import { hashToken } from "../companies/drafts";
import { getDb } from "../db";
import { attachFile, scheduleFileDeletion } from "../files/files";
import { deliverEmail } from "../notify/channels";
import { nextReference } from "../reference";
import { hitThrottle } from "../sign-in/throttle";
import { RecoveryError } from "./recovery";

// Lost email, "Or send a support request" (528:534, received 528:664; step 3.7, decisions A16, A22, A23). The person
// is signed out. Support gets an email with a link to a sign-in-protected review page; the Work ID is opened there
// through a short-lived link and deleted 30 days after the request is closed.

const { recoveryRequests: rr } = schema;

/** Support requests per IP address per day. */
export const SUPPORT_REQUESTS_PER_DAY = 5;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SupportRequestInput {
  actor: Actor;
  fullName: string;
  company: string;
  contactEmail: string;
  fileId: string;
  fileKey?: string;
  ip?: string;
  context?: RequestContext;
}

export type SupportField = "fullName" | "company" | "contactEmail" | "file";

export class SupportRequestError extends RecoveryError {
  constructor(
    readonly field: SupportField | null,
    message: string,
  ) {
    super(field ? "INVALID" : "TOO_MANY", message);
  }
}

export async function submitSupportRequest(input: SupportRequestInput): Promise<{ id: string; reference: string }> {
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  const company = input.company.trim().replace(/\s+/g, " ");
  const contactEmail = input.contactEmail.trim().toLowerCase();
  if (fullName.length < 2 || fullName.length > 120) throw new SupportRequestError("fullName", "Enter your full name");
  if (company.length < 2 || company.length > 160) throw new SupportRequestError("company", "Enter your company");
  if (!EMAIL.test(contactEmail) || contactEmail.length > 254) {
    throw new SupportRequestError("contactEmail", "Enter an email we can reach you on, like name@example.com");
  }
  if (!input.fileId) throw new SupportRequestError("file", "Add your work ID or a letter from your company");

  const db = getDb();
  const limit = await hitThrottle(db, `support-request:${input.ip ?? "unknown"}`, 86_400);
  if (limit.count > SUPPORT_REQUESTS_PER_DAY) {
    throw new SupportRequestError(null, "Too many requests from here today. Email H2 Economy support instead.");
  }

  const result = await db.transaction(async (tx) => {
    const reference = await nextReference(tx, "SUP");
    const [row] = await tx
      .insert(rr)
      .values({
        kind: "support",
        status: "Waiting for support",
        tokenHash: hashToken(randomBytes(24).toString("base64url")),
        reference,
        contactName: fullName,
        contactCompany: company,
        contactEmail,
        documentFileId: input.fileId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .returning({ id: rr.id });
    if (!row) throw new Error("support request insert returned nothing");
    await attachFile(tx, {
      actor: input.actor,
      fileId: input.fileId,
      key: input.fileKey,
      kind: "work_id",
      attachedType: "recovery_request",
      attachedId: row.id,
    }).catch(() => {
      throw new SupportRequestError("file", "Add your work ID again: the upload didn't finish");
    });
    await audit(tx, {
      actorId: input.actor.userId,
      action: "recovery.support.requested",
      resourceType: "recovery_request",
      resourceId: row.id,
      after: { reference, company },
      context: input.context,
    });
    return { id: row.id, reference };
  });

  const env = parseServerEnv();
  const mail = await renderRecovery(env.APP_URL, "supportRequest", {
    reference: result.reference,
    name: fullName,
    company,
    contactEmail,
    kind: "Lost email: support request with work ID",
    url: `${env.APP_URL}/account/recovery/${result.id}`,
  });
  // The contact address is not proven, so nothing is sent to it automatically; support replies after checking (A23).
  await deliverEmail({
    template: "email.support_request",
    event: "recovery.support_request",
    to: env.SUPPORT_EMAIL,
    replyTo: contactEmail,
    mail,
  });
  return result;
}

/** Support may handle a request: operators with queue and Users access (A16). */
export function canHandleSupport(actor: Actor): boolean {
  return can(actor, "queues.edit") && can(actor, "users.view");
}

/** Support marks a request handled. The Work ID is deleted 30 days later (A22). */
export async function closeSupportRequest(input: { actor: Actor; requestId: string; context?: RequestContext }) {
  if (!canHandleSupport(input.actor)) throw new RecoveryError("NOT_ALLOWED", "Not allowed to close this request");
  const db = getDb();
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(rr).where(eq(rr.id, input.requestId)).for("update");
    if (row?.kind !== "support") throw new RecoveryError("NOT_FOUND", "No such request");
    if (row.status !== "Waiting for support") return;
    const now = new Date();
    await tx
      .update(rr)
      .set({ status: "Closed", decidedBy: input.actor.userId, decidedAt: now })
      .where(eq(rr.id, row.id));
    if (row.documentFileId) {
      await scheduleFileDeletion(tx, row.documentFileId, new Date(now.getTime() + WORK_ID_KEEP_DAYS * 86_400_000));
    }
    await audit(tx, {
      actorId: input.actor.userId,
      action: "recovery.support.closed",
      resourceType: "recovery_request",
      resourceId: row.id,
      before: { status: row.status },
      after: { status: "Closed" },
      context: input.context,
    });
  });
}
