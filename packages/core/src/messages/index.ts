import { schema, type Database, type Executor } from "@h2india/db";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { audit } from "../audit";
import type { Actor } from "../authz/actor";
import { can } from "../authz/can";
import { notify } from "../notify/notify";

// Messages (step 9.7): threads between one buyer company and one supplier about an RFQ. Only people with messages.use
// at either company can open a thread; anyone else gets "no such thread", so guessing an address learns nothing. New
// messages raise an in-app notice for the other side (the email waits for its wording, M21).

const t = schema.messageThreads;
const m = schema.messages;
const reads = schema.messageReads;

export class MessageError extends Error {}

export type Side = "buyer" | "supplier";

/** The company this person writes for in this thread, or null when they may not see it. */
export function sideIn(
  actor: Actor,
  thread: { buyerOrganisationId: string; supplierOrganisationId: string },
): { side: Side; organisationId: string } | null {
  if (can(actor, "messages.use", { organisationId: thread.buyerOrganisationId }))
    return { side: "buyer", organisationId: thread.buyerOrganisationId };
  if (can(actor, "messages.use", { organisationId: thread.supplierOrganisationId }))
    return { side: "supplier", organisationId: thread.supplierOrganisationId };
  return null;
}

/**
 * The thread about an RFQ with one of its suppliers, made the first time either side opens it. The RFQ must have been
 * sent to that supplier.
 */
export async function rfqThread(db: Database, actor: Actor, input: { rfqId: string; supplierId: string }) {
  const [row] = await db
    .select({ rfq: schema.rfqs, recipient: schema.rfqSuppliers.id })
    .from(schema.rfqs)
    .innerJoin(
      schema.rfqSuppliers,
      and(eq(schema.rfqSuppliers.rfqId, schema.rfqs.id), eq(schema.rfqSuppliers.organisationId, input.supplierId)),
    )
    .where(and(eq(schema.rfqs.id, input.rfqId), sql`${schema.rfqs.sentAt} is not null`));
  if (!row) throw new MessageError("No such conversation");
  const pair = { buyerOrganisationId: row.rfq.organisationId, supplierOrganisationId: input.supplierId };
  if (!sideIn(actor, pair)) throw new MessageError("No such conversation");
  await db
    .insert(t)
    .values({ ...pair, rfqId: input.rfqId })
    .onConflictDoNothing();
  const [thread] = await db
    .select()
    .from(t)
    .where(and(eq(t.rfqId, input.rfqId), eq(t.supplierOrganisationId, input.supplierId)));
  if (!thread) throw new Error("thread insert returned nothing");
  return thread;
}

export interface ThreadRow {
  id: string;
  /** The other company's name. */
  with: string;
  withId: string;
  verified: boolean;
  reference: string | null;
  about: string;
  kind: "rfq" | "order" | "question";
  last: string;
  lastAt: Date;
  unread: number;
  rfqId: string | null;
}

/** The inbox (572:8): this company's threads, newest first, with the other side, the last message and unread count. */
export async function listThreads(
  db: Executor,
  actor: Actor,
  input: { organisationId: string; side: Side; kind?: "rfq" | "order" | "question"; q?: string },
): Promise<ThreadRow[]> {
  if (!can(actor, "messages.use", { organisationId: input.organisationId }) || !actor.userId) return [];
  const mine = input.side === "buyer" ? t.buyerOrganisationId : t.supplierOrganisationId;
  const other = input.side === "buyer" ? t.supplierOrganisationId : t.buyerOrganisationId;
  const rows = await db
    .select({
      t,
      with: sql<string>`coalesce(${schema.companyProfiles.tradeName}, ${schema.organisations.legalName})`,
      verified: sql<boolean>`${schema.organisations.verification} = 'Verified'`,
      reference: sql<string | null>`(select r.reference from core.rfqs r where r.id = ${t.rfqId})`,
      about: sql<string>`coalesce((select r.title from core.rfqs r where r.id = ${t.rfqId}), '')`,
      last: sql<string>`coalesce((select x.body from core.messages x where x.thread_id = ${t.id} order by x.created_at desc limit 1), '')`,
      unread: sql<number>`(select count(*)::int from core.messages x where x.thread_id = ${t.id} and x.author_organisation_id <> ${input.organisationId}
        and x.created_at > coalesce((select r.read_at from core.message_reads r where r.thread_id = ${t.id} and r.user_id = ${actor.userId}), 'epoch'))`,
    })
    .from(t)
    .innerJoin(schema.organisations, eq(schema.organisations.id, other))
    .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, other))
    .where(eq(mine, input.organisationId))
    .orderBy(desc(t.lastMessageAt));
  const kindOf = (x: (typeof rows)[number]["t"]): ThreadRow["kind"] =>
    x.orderId ? "order" : x.rfqId ? "rfq" : "question";
  const q = input.q?.trim().toLowerCase() ?? "";
  return rows
    .map((x) => ({
      id: x.t.id,
      with: x.with,
      withId: input.side === "buyer" ? x.t.supplierOrganisationId : x.t.buyerOrganisationId,
      verified: x.verified,
      reference: x.reference,
      about: x.about,
      kind: kindOf(x.t),
      last: x.last,
      lastAt: x.t.lastMessageAt,
      unread: x.unread,
      rfqId: x.t.rfqId,
    }))
    .filter(
      (x) =>
        (!input.kind || x.kind === input.kind) &&
        (!q || `${x.with} ${x.reference ?? ""} ${x.about} ${x.last}`.toLowerCase().includes(q)),
    );
}

/** One thread's messages, oldest first (after a time, for polling). Null when the reader may not see it. */
export async function threadMessages(db: Executor, actor: Actor, threadId: string, after?: Date) {
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) return null;
  const [thread] = await db.select().from(t).where(eq(t.id, threadId));
  if (!thread) return null;
  const me = sideIn(actor, thread);
  if (!me) return null;
  const rows = await db
    .select({ m, author: schema.users.name })
    .from(m)
    .innerJoin(schema.users, eq(schema.users.id, m.authorId))
    .where(after ? and(eq(m.threadId, threadId), gt(m.createdAt, after)) : eq(m.threadId, threadId))
    .orderBy(asc(m.createdAt));
  const ids = [...new Set(rows.flatMap((r) => r.m.attachments))];
  const files = ids.length
    ? await db
        .select({
          id: schema.files.id,
          name: schema.files.name,
          bytes: schema.files.bytes,
          status: schema.files.status,
        })
        .from(schema.files)
        .where(inArray(schema.files.id, ids))
    : [];
  return {
    thread,
    me,
    messages: rows.map((r) => ({
      id: r.m.id,
      body: r.m.body,
      mine: r.m.authorOrganisationId === me.organisationId,
      author: r.author,
      at: r.m.createdAt,
      files: r.m.attachments.map((f) => files.find((x) => x.id === f)).filter((x) => x !== undefined),
    })),
  };
}

/** Mark a thread read up to now for this person. */
export async function markThreadRead(db: Executor, actor: Actor, threadId: string, now = new Date()) {
  if (!actor.userId) return;
  await db
    .insert(reads)
    .values({ threadId, userId: actor.userId, readAt: now })
    .onConflictDoUpdate({ target: [reads.threadId, reads.userId], set: { readAt: now } });
}

/** Send a message. The other side's people with messages.use get an in-app notice. */
export async function postMessage(
  db: Database,
  actor: Actor,
  input: { threadId: string; body: string; attachments?: string[] },
  now = new Date(),
) {
  const [thread] = await db.select().from(t).where(eq(t.id, input.threadId));
  const me = thread ? sideIn(actor, thread) : null;
  if (!thread || !me || !actor.userId) throw new MessageError("No such conversation");
  const body = input.body.trim();
  if (!body && !input.attachments?.length) throw new MessageError("Write a message");
  if (body.length > 4000) throw new MessageError("Keep a message to 4,000 characters");
  const authorId = actor.userId;
  const [row] = await db.transaction(async (tx) => {
    const made = await tx
      .insert(m)
      .values({
        threadId: thread.id,
        authorId,
        authorOrganisationId: me.organisationId,
        body,
        attachments: input.attachments ?? [],
        createdAt: now,
      })
      .returning();
    await tx.update(t).set({ lastMessageAt: now }).where(eq(t.id, thread.id));
    await tx
      .insert(reads)
      .values({ threadId: thread.id, userId: authorId, readAt: now })
      .onConflictDoUpdate({ target: [reads.threadId, reads.userId], set: { readAt: now } });
    await audit(tx, {
      actorId: authorId,
      action: "message.sent",
      resourceType: "message_thread",
      resourceId: thread.id,
      companyId: me.organisationId,
      after: { attachments: input.attachments?.length ?? 0 },
    });
    return made;
  });
  const otherOrg = me.side === "buyer" ? thread.supplierOrganisationId : thread.buyerOrganisationId;
  const [from] = await db
    .select({ name: sql<string>`coalesce(${schema.companyProfiles.tradeName}, ${schema.organisations.legalName})` })
    .from(schema.organisations)
    .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, schema.organisations.id))
    .where(eq(schema.organisations.id, me.organisationId));
  const people = await db
    .select({ id: schema.memberships.userId })
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.organisationId, otherOrg),
        sql`exists (select 1 from core.roles ro join core.role_permissions rp on rp.role_id = ro.id
          where ro.name = ${schema.memberships.role} and rp.permission_key = 'messages.use')`,
      ),
    );
  const href = me.side === "buyer" ? `/supplier/messages?thread=${thread.id}` : `/buyer/messages?thread=${thread.id}`;
  for (const p of people) {
    try {
      await notify({
        event: "message.received",
        topic: "message.received",
        userId: p.id,
        scope: otherOrg,
        inApp: {
          category: "quotes",
          icon: "message-square",
          title: `${from?.name ?? "Someone"}: ${body.slice(0, 120) || "sent a file"}`,
          href,
        },
      });
    } catch (error) {
      console.error("message notice failed", error);
    }
  }
  return row;
}

/** Unread messages for this person across their company's threads (the sidebar count on 572:8). */
export async function unreadMessages(db: Executor, actor: Actor, organisationId: string, side: Side) {
  return (await listThreads(db, actor, { organisationId, side })).reduce((n, x) => n + x.unread, 0);
}
