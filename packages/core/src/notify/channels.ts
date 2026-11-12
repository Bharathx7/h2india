import { parseServerEnv } from "@h2india/config";
import { schema, type Executor } from "@h2india/db";
import {
  APPROVED_TEXT,
  TEMPLATES,
  type Channel,
  type TemplateEntry,
  type TemplateId,
  type TextTemplateId,
} from "@h2india/emails/registry";
import { and, eq, inArray, lte, lt, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { getDb } from "../db";
import { mailTransport } from "../mail/transport";

// Channel adapters and the delivery log (step 3.9). Every message goes through one of these functions, which records a
// delivery row with the provider's answer. SMS and WhatsApp send only approved templates, with their exact wording.

const { notificationDeliveries: dl, templateApprovals: ta } = schema;

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const channelOf = (template: TemplateId): Channel => (TEMPLATES[template] as TemplateEntry).channel;

export class TemplateNotApprovedError extends Error {
  readonly code = "NOT_APPROVED";
  constructor(readonly template: string) {
    super(`Template ${template} is not approved by the provider yet`);
  }
}

export type ApprovalStatus = "Not submitted" | "In review" | "Approved" | "Rejected";

/**
 * Whether a template may be sent (A25): a Super admin marks SMS and WhatsApp templates approved once the provider
 * confirms them (M5). The fake providers used locally and in tests treat templates without a status as approved.
 */
export async function templateStatus(ex: Executor, template: TemplateId): Promise<ApprovalStatus> {
  const channel = channelOf(template);
  if (channel === "email") return "Approved";
  const [row] = await ex.select({ status: ta.status }).from(ta).where(eq(ta.template, template));
  if (row) return row.status as ApprovalStatus;
  const env = parseServerEnv();
  const provider: string = channel === "sms" ? env.SMS_PROVIDER : env.WHATSAPP_PROVIDER;
  return provider === "fake" ? "Approved" : "Not submitted";
}

export async function setTemplateApproval(
  ex: Executor,
  actor: Actor,
  input: { template: TemplateId; status: ApprovalStatus; providerTemplateId?: string },
  context?: RequestContext,
): Promise<void> {
  assertCan(actor, "settings.edit");
  if (channelOf(input.template) === "email") throw new Error("Emails need no provider approval");
  await ex.transaction(async (tx) => {
    const [before] = await tx.select().from(ta).where(eq(ta.template, input.template));
    await tx
      .insert(ta)
      .values({
        template: input.template,
        status: input.status,
        providerTemplateId: input.providerTemplateId ?? null,
        updatedBy: actor.userId,
      })
      .onConflictDoUpdate({
        target: ta.template,
        set: {
          status: input.status,
          providerTemplateId: input.providerTemplateId ?? before?.providerTemplateId ?? null,
          updatedBy: actor.userId,
          updatedAt: new Date(),
        },
      });
    await audit(tx, {
      actorId: actor.userId,
      action: "template.approval",
      resourceType: "message_template",
      resourceId: input.template,
      before: before ? { status: before.status } : null,
      after: { status: input.status },
      context,
    });
  });
}

interface Base {
  template: TemplateId;
  event: string;
  userId?: string | null;
}

async function record(values: typeof dl.$inferInsert): Promise<string> {
  const [row] = await getDb().insert(dl).values(values).returning({ id: dl.id });
  if (!row) throw new Error("delivery insert returned nothing");
  return row.id;
}

async function mark(id: string, change: Partial<typeof dl.$inferInsert>) {
  await getDb().update(dl).set(change).where(eq(dl.id, id));
}

/**
 * Sends an email and logs it. Security messages (codes, sign-in and confirmation links) come from the security sender
 * and are never kept for a later retry; the caller sees the failure at once.
 */
export async function deliverEmail(
  input: Base & { to: string; mail: RenderedEmail; security?: boolean; replyTo?: string },
): Promise<void> {
  const env = parseServerEnv();
  const id = await record({
    event: input.event,
    channel: "email",
    template: input.template,
    userId: input.userId ?? null,
    recipient: input.to,
    status: "Sending",
    provider: "smtp",
    payload: input.security ? null : { subject: input.mail.subject, html: input.mail.html, text: input.mail.text },
    attempts: 1,
  });
  await sendEmailNow(id, {
    from: input.security ? (env.EMAIL_FROM_SECURITY ?? env.EMAIL_FROM) : env.EMAIL_FROM,
    to: input.to,
    replyTo: input.replyTo,
    mail: input.mail,
    retry: !input.security,
  });
}

async function sendEmailNow(
  id: string,
  m: { from: string; to: string; replyTo?: string; mail: RenderedEmail; retry: boolean; attempts?: number },
) {
  try {
    const info = (await mailTransport(parseServerEnv()).sendMail({
      from: m.from,
      to: m.to,
      replyTo: m.replyTo,
      subject: m.mail.subject,
      html: m.mail.html,
      text: m.mail.text,
    })) as { messageId?: string; response?: string };
    await mark(id, {
      status: "Sent",
      sentAt: new Date(),
      providerMessageId: info.messageId ?? null,
      providerStatus: info.response?.slice(0, 200) ?? null,
      error: null,
      sendAfter: null,
    });
  } catch (error) {
    const attempts = m.attempts ?? 1;
    await mark(id, {
      status: "Failed",
      error: (error as Error).message.slice(0, 500),
      // Retried by the notify-due sweep with back-off: 1, 4, 9, 16 minutes. Security mail is not retried.
      sendAfter: m.retry && attempts < 5 ? new Date(Date.now() + attempts * attempts * 60_000) : null,
    });
    if (!m.retry) throw error;
  }
}

function fakeAddress(channel: "sms" | "whatsapp", to: string) {
  return `${channel}-${to.replace(/\D/g, "")}@${channel}.h2india.local`;
}

/** The fake providers deliver to Mailpit as an email, so people and tests read SMS and WhatsApp like any message. */
async function fakeSend(channel: "sms" | "whatsapp", to: string, text: string): Promise<string | undefined> {
  const env = parseServerEnv();
  const info = (await mailTransport(env).sendMail({
    from: env.EMAIL_FROM,
    to: fakeAddress(channel, to),
    subject: `${channel === "sms" ? "SMS" : "WhatsApp"} to ${to}`,
    text,
  })) as { messageId?: string };
  return info.messageId;
}

async function deliverText(
  channel: "sms" | "whatsapp",
  input: Base & { template: TextTemplateId; to: string; data: Record<string, string> },
  opts: { sendAfter?: Date } = {},
): Promise<"Sent" | "Waiting"> {
  const status = await templateStatus(getDb(), input.template);
  const text = (APPROVED_TEXT[input.template] as (d: Record<string, string>) => string)(input.data);
  const base = {
    event: input.event,
    channel,
    template: input.template,
    userId: input.userId ?? null,
    recipient: input.to,
    provider: "fake",
  };
  if (status !== "Approved") {
    await record({ ...base, status: "Refused", reason: "not_approved" });
    throw new TemplateNotApprovedError(input.template);
  }
  if (opts.sendAfter) {
    await record({ ...base, status: "Waiting", reason: "quiet_hours", sendAfter: opts.sendAfter, payload: { text } });
    return "Waiting";
  }
  const id = await record({ ...base, status: "Sending", attempts: 1 });
  const messageId = await fakeSend(channel, input.to, text);
  await mark(id, {
    status: "Sent",
    sentAt: new Date(),
    providerMessageId: messageId ?? null,
    providerStatus: "accepted",
  });
  return "Sent";
}

/** SMS: only registered (DLT) templates, with their exact wording. */
export async function deliverSms(input: Base & { template: TextTemplateId; to: string; data: Record<string, string> }) {
  if (channelOf(input.template) !== "sms") throw new Error(`${input.template} is not an SMS template`);
  await deliverText("sms", input);
}

/** WhatsApp: only approved templates; held during quiet hours. */
export async function deliverWhatsApp(
  input: Base & { template: TextTemplateId; to: string; data: Record<string, string> },
  opts: { sendAfter?: Date } = {},
) {
  if (channelOf(input.template) !== "whatsapp") throw new Error(`${input.template} is not a WhatsApp template`);
  return deliverText("whatsapp", input, opts);
}

/** Logs a message that wasn't sent because of the person's choices (kept so support can answer "why no email?"). */
export async function recordSkipped(input: Base & { channel: string; recipient?: string | null; reason: string }) {
  await record({
    event: input.event,
    channel: input.channel,
    template: input.template,
    userId: input.userId ?? null,
    recipient: input.recipient ?? null,
    status: "Skipped",
    reason: input.reason,
  });
}

/**
 * Sends what is due (scheduled every minute with the clocks, step 3.8): WhatsApp held by quiet hours, and failed emails
 * whose retry time has come.
 */
export async function sendDueDeliveries(now: Date = new Date()): Promise<number> {
  const db = getDb();
  const due = await db
    .select()
    .from(dl)
    .where(and(inArray(dl.status, ["Waiting", "Failed"]), lte(dl.sendAfter, now), lt(dl.attempts, 5)))
    .limit(100);
  let sent = 0;
  for (const row of due) {
    // Claim it, so two sweeps never send the same message.
    const [claimed] = await db
      .update(dl)
      .set({ status: "Sending", attempts: sql`${dl.attempts} + 1` })
      .where(and(eq(dl.id, row.id), eq(dl.status, row.status)))
      .returning({ attempts: dl.attempts });
    if (!claimed || !row.recipient || !row.payload) continue;
    const env = parseServerEnv();
    if (row.channel === "email") {
      const p = row.payload as unknown as RenderedEmail;
      await sendEmailNow(row.id, {
        from: env.EMAIL_FROM,
        to: row.recipient,
        mail: p,
        retry: true,
        attempts: claimed.attempts,
      });
    } else {
      try {
        const messageId = await fakeSend(row.channel as "sms" | "whatsapp", row.recipient, String(row.payload.text));
        await mark(row.id, {
          status: "Sent",
          sentAt: new Date(),
          providerMessageId: messageId ?? null,
          sendAfter: null,
        });
      } catch (error) {
        await mark(row.id, {
          status: "Failed",
          error: (error as Error).message.slice(0, 500),
          sendAfter: new Date(Date.now() + claimed.attempts * claimed.attempts * 60_000),
        });
      }
    }
    sent++;
  }
  return sent;
}
