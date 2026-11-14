import type { ChosenDeadline } from "@h2india/config/clocks";
import { schema, type Database, type Executor } from "@h2india/db";
import { parseServerEnv } from "@h2india/config";
import { renderNewsletterIssue, type IssueChart, type IssueSection } from "@h2india/emails";
import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { cancelDeadline, onDeadline, startDeadline } from "../clocks/clocks";
import { deliverEmail } from "../notify/channels";
import { manageLink, unsubscribeHeaders, unsubscribeUrl } from "./index";

// Sending India H₂ Weekly (step 11.3). The issue is written in the CMS; this keeps its subject, preview and editor's
// note, schedules the send for an IST time (a deadline, so it survives restarts), and sends to confirmed subscribers
// only, in batches, each at most once, with the one-click unsubscribe headers. Editors need content.edit.

export type { IssueChart };

const s = schema.newsletterSends;
const d = schema.newsletterDeliveries;
const subs = schema.newsletterSubscribers;
const SEND: ChosenDeadline = "newsletterSend";

export class NewsletterSendError extends Error {}

export async function listSends(db: Executor) {
  return db.select().from(s).orderBy(desc(s.createdAt));
}

export async function sendFor(db: Executor, issueId: string) {
  const [row] = await db.select().from(s).where(eq(s.issueId, issueId));
  return row ?? null;
}

export async function confirmedCount(db: Executor) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subs)
    .where(eq(subs.status, "confirmed"));
  return row?.n ?? 0;
}

/** Save the send settings (648:312). A sent issue can't change. */
export async function saveSend(
  db: Database,
  actor: Actor,
  input: {
    issueId: string;
    subject: string;
    preview: string;
    editorNote: string;
    chart?: string | null;
    sponsor?: IssueSponsor | null;
  },
) {
  assertCan(actor, "content.edit");
  const existing = await sendFor(db, input.issueId);
  if (existing && existing.status !== "Draft" && existing.status !== "Scheduled")
    throw new NewsletterSendError("This issue has been sent and can't change");
  const values = {
    subject: input.subject.trim().slice(0, 200),
    preview: input.preview.trim().slice(0, 200),
    editorNote: input.editorNote.trim().slice(0, 1000),
    ...(input.chart !== undefined ? { chart: input.chart?.trim() || null } : {}),
    ...(input.sponsor !== undefined ? { sponsor: cleanSponsor(input.sponsor) } : {}),
    updatedBy: actor.userId,
    updatedAt: new Date(),
  };
  await db
    .insert(s)
    .values({ issueId: input.issueId, ...values })
    .onConflictDoUpdate({ target: s.issueId, set: values });
  return sendFor(db, input.issueId);
}

/** Schedule the send for an IST time. */
export async function scheduleSend(
  db: Database,
  actor: Actor,
  issueId: string,
  sendAt: Date,
  context?: RequestContext,
  now = new Date(),
) {
  assertCan(actor, "content.edit");
  const row = await sendFor(db, issueId);
  if (!row) throw new NewsletterSendError("Save the send settings first");
  if (!row.subject) throw new NewsletterSendError("Write a subject");
  if (row.status !== "Draft" && row.status !== "Scheduled") throw new NewsletterSendError("This issue has been sent");
  if (sendAt.getTime() <= now.getTime()) throw new NewsletterSendError("Choose a time in the future");
  await db.transaction(async (tx) => {
    await tx.update(s).set({ status: "Scheduled", sendAt, updatedAt: now }).where(eq(s.id, row.id));
    await cancelDeadline(tx, { type: SEND, subjectType: "newsletter_send", subjectId: row.id });
    await startDeadline(tx, {
      type: SEND,
      subjectType: "newsletter_send",
      subjectId: row.id,
      startedAt: now,
      dueAt: sendAt,
    });
    await audit(tx, {
      actorId: actor.userId,
      action: "newsletter.scheduled",
      resourceType: "newsletter_send",
      resourceId: row.id,
      after: { sendAt: sendAt.toISOString(), subject: row.subject },
      context,
    });
  });
}

export async function unscheduleSend(db: Database, actor: Actor, issueId: string, context?: RequestContext) {
  assertCan(actor, "content.edit");
  const row = await sendFor(db, issueId);
  if (row?.status !== "Scheduled") throw new NewsletterSendError("This issue isn't scheduled");
  await db.transaction(async (tx) => {
    await tx.update(s).set({ status: "Draft", sendAt: null }).where(eq(s.id, row.id));
    await cancelDeadline(tx, { type: SEND, subjectType: "newsletter_send", subjectId: row.id });
    await audit(tx, {
      actorId: actor.userId,
      action: "newsletter.unscheduled",
      resourceType: "newsletter_send",
      resourceId: row.id,
      context,
    });
  });
}

/** The send time arrives: the issue becomes Due and the next newsletter-send run sends it. */
onDeadline(SEND, async (tx, deadline, event) => {
  if (event !== "expire") return;
  await tx
    .update(s)
    .set({ status: "Due" })
    .where(and(eq(s.id, deadline.subjectId), eq(s.status, "Scheduled")));
});

export async function dueSends(db: Executor) {
  return db
    .select()
    .from(s)
    .where(sql`${s.status} in ('Due', 'Sending')`);
}

/** What goes in the issue: built by the web app from published CMS items (no prices), rendered here. */
export interface IssueContent {
  title: string;
  masthead: string;
  sections: IssueSection[];
  /** Chart of the week, from the India Hydrogen Tracker, with its source and as-of date. */
  chart?: IssueChart | null;
}

export interface IssueSponsor {
  name: string;
  headline: string;
  text: string;
  url: string;
}

/** A sponsor slot needs a name, a headline and an https link; anything less is no sponsor. */
export function cleanSponsor(x: IssueSponsor | null): IssueSponsor | null {
  if (!x) return null;
  const v = {
    name: x.name.trim().slice(0, 80),
    headline: x.headline.trim().slice(0, 120),
    text: x.text.trim().slice(0, 240),
    url: x.url.trim(),
  };
  if (!v.name && !v.headline && !v.url) return null;
  if (!v.name || !v.headline) throw new NewsletterSendError("A sponsor needs a name and a headline");
  if (!/^https:\/\/\S+\.\S+/.test(v.url))
    throw new NewsletterSendError("Give the sponsor's link, starting with https://");
  return v;
}

function render(
  row: typeof s.$inferSelect,
  content: IssueContent,
  links: { manageUrl: string; unsubscribeUrl: string },
  subject = row.subject,
) {
  return renderNewsletterIssue({
    appUrl: parseServerEnv().APP_URL,
    subject,
    title: content.title,
    masthead: content.masthead,
    preview: row.preview,
    editorNote: row.editorNote,
    sections: content.sections,
    chart: content.chart ?? null,
    sponsor: row.sponsor ?? null,
    ...links,
  });
}

/**
 * Send the next batch to confirmed subscribers who haven't had it. Returns how many went. When nobody is left the send
 * is Sent. Safe to run again: a delivery is recorded before the email goes, so nobody gets it twice.
 */
export async function sendBatch(db: Database, sendId: string, content: IssueContent, batch = 200, now = new Date()) {
  const [row] = await db.select().from(s).where(eq(s.id, sendId));
  if (!row || (row.status !== "Due" && row.status !== "Sending")) return 0;
  if (row.status === "Due") await db.update(s).set({ status: "Sending" }).where(eq(s.id, sendId));
  const done = db.select({ id: d.subscriberId }).from(d).where(eq(d.sendId, sendId));
  const next = await db
    .select({ id: subs.id, email: subs.email, linkNonce: subs.linkNonce })
    .from(subs)
    .where(and(eq(subs.status, "confirmed"), notInArray(subs.id, done)))
    .limit(batch);
  let sent = 0;
  for (const sub of next) {
    const claimed = await db.insert(d).values({ sendId, subscriberId: sub.id }).onConflictDoNothing().returning();
    if (!claimed.length) continue;
    const mail = await render(row, content, {
      manageUrl: manageLink(sub, now.getTime()),
      unsubscribeUrl: unsubscribeUrl(sub.id),
    });
    await deliverEmail({
      template: "email.newsletter_issue",
      event: "newsletter.issue",
      userId: null,
      to: sub.email,
      mail: { ...mail, headers: unsubscribeHeaders(sub.id) },
    });
    sent++;
  }
  await db
    .update(s)
    .set({ delivered: sql`${s.delivered} + ${sent}` })
    .where(eq(s.id, sendId));
  if (next.length < batch) await db.update(s).set({ status: "Sent", sentAt: now }).where(eq(s.id, sendId));
  return sent;
}

/** Send a test to one address (648:312 "Send a test"). Not counted as delivered. */
export async function sendTest(
  db: Database,
  actor: Actor,
  issueId: string,
  to: string,
  content: IssueContent,
  now = new Date(),
) {
  assertCan(actor, "content.edit");
  const row = await sendFor(db, issueId);
  if (!row) throw new NewsletterSendError("Save the send settings first");
  const mail = await render(row, content, { manageUrl: "#", unsubscribeUrl: "#" }, `[Test] ${row.subject}`);
  await deliverEmail({ template: "email.newsletter_issue", event: "newsletter.test", userId: actor.userId, to, mail });
  await db.update(s).set({ lastTestAt: now }).where(eq(s.id, row.id));
}

export interface SendStats {
  status: string;
  sentAt: Date | null;
  /** People it went to (one delivery row each). */
  sent: number;
  /** Emails handed to the mail service without an error. */
  delivered: number;
  /** As the email provider reports them (M6); null until it does. */
  opens: number | null;
  clicks: number | null;
  /** Recipients who unsubscribed after this issue and before the next one went. */
  unsubscribed: number;
}

/** How an issue did (Stats, 647:660). Counts only; nobody's address is shown. */
export async function sendStats(db: Executor, issueId: string, now = new Date()): Promise<SendStats | null> {
  const row = await sendFor(db, issueId);
  if (!row) return null;
  const [sent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(d)
    .where(eq(d.sendId, row.id));
  let unsubscribed = 0;
  if (row.sentAt) {
    const [next] = await db
      .select({ at: sql<Date | null>`min(${s.sentAt})` })
      .from(s)
      .where(sql`${s.sentAt} > ${row.sentAt}`);
    const until = next?.at ? new Date(next.at) : now;
    const [u] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(d)
      .innerJoin(subs, eq(subs.id, d.subscriberId))
      .where(
        and(eq(d.sendId, row.id), sql`${subs.unsubscribedAt} >= ${row.sentAt}`, sql`${subs.unsubscribedAt} < ${until}`),
      );
    unsubscribed = u?.n ?? 0;
  }
  return {
    status: row.status,
    sentAt: row.sentAt,
    sent: sent?.n ?? 0,
    delivered: row.delivered,
    opens: row.opens,
    clicks: row.clicks,
    unsubscribed,
  };
}
