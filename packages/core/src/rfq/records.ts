import type { ChosenDeadline } from "@h2india/config/clocks";
import { schema, type Database, type Executor } from "@h2india/db";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan, can } from "../authz/can";
import { inScope, type Scope } from "../authz/scope";
import { cancelDeadline, completeDeadline, onDeadline, startClock, startDeadline } from "../clocks/clocks";
import { nextReference } from "../reference";
import { changeStatus } from "../status";
import { sendRfqChecked, sendRfqReceived } from "./notices";
import { quoteFigures, scheduleProblem, type PaymentLine } from "./totals";
import {
  MAX_RFQ_SUPPLIERS,
  needsModeration,
  quoteTransitions,
  rfqTransitions,
  type QuoteMove,
  type QuoteStatus,
  type RfqMove,
  type RfqStatus,
} from "./transitions";

// RFQ and quote records (step 9.2). Buyers work on their company's RFQs (rfq.create); suppliers see an RFQ only once
// it is Sent to them, and answer with quote.send; H2 India moderates with queues.edit. Statuses move only through
// moveRfq()/moveQuote(), which take a move the transition table allows (anything else is a type error) and write the
// history and audit log. Deadlines: rfqModeration (clock), rfqOfferDeadline and quoteValidity (chosen times).

const r = schema.rfqs;
const ri = schema.rfqItems;
const rs = schema.rfqSuppliers;
const q = schema.quotes;
const qv = schema.quoteVersions;
const ql = schema.quoteLines;
const qp = schema.quotePaymentLines;

export class RfqError extends Error {
  constructor(
    message: string,
    readonly errors: Record<string, string> = {},
  ) {
    super(message);
  }
}

type Ctx = {
  context?: RequestContext;
  reason?: string;
  metadata?: Record<string, unknown>;
  also?: (tx: Executor) => Promise<void>;
};

/** Move an RFQ. The pair must be in rfqTransitions (a type error otherwise, and checked again at run time). */
export async function moveRfq(
  ex: Executor,
  actorId: string | null,
  rfq: { id: string; organisationId: string },
  move: RfqMove,
  ctx: Ctx = {},
) {
  await changeStatus(ex, {
    table: r,
    entityType: "rfq",
    id: rfq.id,
    from: move.from,
    to: move.to,
    actorId,
    companyId: rfq.organisationId,
    transitions: rfqTransitions,
    ...ctx,
  });
}

/** Move a quote. The pair must be in quoteTransitions. */
export async function moveQuote(
  ex: Executor,
  actorId: string | null,
  quote: { id: string; organisationId: string },
  move: QuoteMove,
  ctx: Ctx = {},
) {
  await changeStatus(ex, {
    table: q,
    entityType: "quote",
    id: quote.id,
    from: move.from,
    to: move.to,
    actorId,
    companyId: quote.organisationId,
    transitions: quoteTransitions,
    ...ctx,
  });
}

/** Notices go after the change is saved; a failed send never undoes it (the notify log shows the failure). */
async function tell(work: () => Promise<void>) {
  try {
    await work();
  } catch (error) {
    console.error("rfq notice failed", error);
  }
}

const OFFER: ChosenDeadline = "rfqOfferDeadline";
const VALIDITY: ChosenDeadline = "quoteValidity";

// ------------------------------------------------------------------------------------------------ buyer: drafts

export interface RfqItemInput {
  productId?: string | null;
  description: string;
  quantity: number;
  unit?: string;
  specs?: Record<string, unknown>;
}

export interface RfqDraftInput {
  title?: string;
  categoryId?: string | null;
  requirements?: string | null;
  deliverySiteId?: string | null;
  billingGstinId?: string | null;
  requiredBy?: Date | null;
  offerDeadline?: Date | null;
  deliveryTerms?: string | null;
  paymentTerms?: string | null;
  attachments?: string[];
  source?: string | null;
  items?: RfqItemInput[];
  /** Supplier companies (at most 5, verified only). */
  supplierIds?: string[];
}

async function ownRfq(ex: Executor, organisationId: string, id: string) {
  const [row] = await ex
    .select()
    .from(r)
    .where(and(eq(r.id, id), eq(r.organisationId, organisationId), isNull(r.deletedAt)));
  if (!row) throw new RfqError("No such RFQ");
  return row;
}

/** Verified, live supplier companies among the ids (the RFQ promise is "verified suppliers"). */
export async function verifiedSuppliers(ex: Executor, ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  const o = schema.organisations;
  const rows = await ex
    .select({ id: o.id })
    .from(o)
    .where(and(inArray(o.id, ids), inArray(o.kind, ["supplier", "both"]), eq(o.verification, "Verified")));
  return rows.map((x) => x.id);
}

async function writeDraft(tx: Executor, rfqId: string, organisationId: string, input: RfqDraftInput) {
  const set: Partial<typeof r.$inferInsert> = { updatedAt: new Date() };
  if (input.title !== undefined) set.title = input.title.trim().slice(0, 160);
  if (input.categoryId !== undefined) set.categoryId = input.categoryId;
  if (input.requirements !== undefined) set.requirements = input.requirements?.trim() || null;
  if (input.billingGstinId !== undefined) set.billingGstinId = input.billingGstinId;
  if (input.requiredBy !== undefined) set.requiredBy = input.requiredBy;
  if (input.offerDeadline !== undefined) set.offerDeadline = input.offerDeadline;
  if (input.deliveryTerms !== undefined) set.deliveryTerms = input.deliveryTerms?.trim() || null;
  if (input.paymentTerms !== undefined) set.paymentTerms = input.paymentTerms?.trim() || null;
  if (input.attachments !== undefined) set.attachments = input.attachments;
  if (input.source !== undefined) set.source = input.source;
  if (input.deliverySiteId !== undefined) {
    if (input.deliverySiteId) {
      const [site] = await tx
        .select({ id: schema.deliverySites.id })
        .from(schema.deliverySites)
        .where(
          and(
            eq(schema.deliverySites.id, input.deliverySiteId),
            eq(schema.deliverySites.organisationId, organisationId),
            isNull(schema.deliverySites.deletedAt),
          ),
        );
      if (!site) throw new RfqError("Choose one of your delivery sites");
    }
    set.deliverySiteId = input.deliverySiteId;
  }
  await tx.update(r).set(set).where(eq(r.id, rfqId));
  if (input.items !== undefined) {
    await tx.delete(ri).where(eq(ri.rfqId, rfqId));
    const items = input.items.filter((i) => i.description.trim());
    if (items.length)
      await tx.insert(ri).values(
        items.map((i, n) => ({
          rfqId,
          productId: i.productId ?? null,
          description: i.description.trim(),
          quantity: Math.max(1, Math.floor(i.quantity)),
          unit: i.unit?.trim() || "units",
          specs: i.specs ?? {},
          position: n,
        })),
      );
  }
  if (input.supplierIds !== undefined) {
    const unique = [...new Set(input.supplierIds)];
    if (unique.length > MAX_RFQ_SUPPLIERS) throw new RfqError(`Choose up to ${String(MAX_RFQ_SUPPLIERS)} suppliers`);
    const ok = await verifiedSuppliers(tx, unique);
    if (ok.length !== unique.length) throw new RfqError("Choose verified suppliers only");
    await tx.delete(rs).where(eq(rs.rfqId, rfqId));
    if (unique.length) await tx.insert(rs).values(unique.map((organisationId) => ({ rfqId, organisationId })));
  }
}

/** Start an RFQ as a draft (wizard step 1). It takes its RFQ-2026-0001 reference now. */
export async function createRfq(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: RfqDraftInput,
  context?: RequestContext,
) {
  assertCan(actor, "rfq.create", { organisationId });
  if (!actor.userId) throw new RfqError("Sign in again");
  const userId = actor.userId;
  return db.transaction(async (tx) => {
    const reference = await nextReference(tx, "RFQ");
    const [row] = await tx.insert(r).values({ reference, organisationId, createdBy: userId }).returning();
    if (!row) throw new Error("rfq insert returned nothing");
    await writeDraft(tx, row.id, organisationId, input);
    await audit(tx, {
      actorId: userId,
      action: "rfq.created",
      resourceType: "rfq",
      resourceId: row.id,
      companyId: organisationId,
      after: { reference },
      context,
    });
    return { id: row.id, reference };
  });
}

/** Save changes to a draft. A returned RFQ goes back to Draft the first time it is edited. */
export async function updateRfqDraft(
  db: Database,
  actor: Actor,
  organisationId: string,
  rfqId: string,
  input: RfqDraftInput,
  context?: RequestContext,
) {
  assertCan(actor, "rfq.create", { organisationId });
  const row = await ownRfq(db, organisationId, rfqId);
  if (row.status === "Returned") {
    await moveRfq(db, actor.userId, row, { from: "Returned", to: "Draft" }, { context, reason: "Edited after return" });
  } else if (row.status !== "Draft") {
    throw new RfqError("This RFQ has been sent and can't be edited here");
  }
  await db.transaction((tx) => writeDraft(tx, rfqId, organisationId, input));
}

/** What a draft still needs before it can be sent (wizard validation, 399:10344). Empty when ready. */
export async function draftProblems(ex: Executor, rfqId: string, now: Date = new Date()) {
  const [row] = await ex.select().from(r).where(eq(r.id, rfqId));
  if (!row) return { rfq: "No such RFQ" };
  const items = await ex.select().from(ri).where(eq(ri.rfqId, rfqId));
  const suppliers = await ex.select().from(rs).where(eq(rs.rfqId, rfqId));
  const e: Record<string, string> = {};
  if (!row.title.trim()) e.title = "Give the request a title";
  if (!items.length) e.items = "Say what you need and how many";
  if (!suppliers.length) e.suppliers = "Choose at least one supplier";
  if (suppliers.length > MAX_RFQ_SUPPLIERS) e.suppliers = `Choose up to ${String(MAX_RFQ_SUPPLIERS)} suppliers`;
  if (!row.deliverySiteId) e.deliverySite = "Choose where to deliver";
  if (!row.offerDeadline) e.offerDeadline = "Set an offer deadline";
  else if (row.offerDeadline.getTime() <= now.getTime()) e.offerDeadline = "The offer deadline must be in the future";
  if (row.requiredBy && row.offerDeadline && row.requiredBy.getTime() < row.offerDeadline.getTime())
    e.requiredBy = "The needed-by date must be after the offer deadline";
  return e;
}

async function sendToSuppliers(tx: Executor, rfq: { id: string; offerDeadline: Date | null }, now: Date) {
  await tx.update(r).set({ sentAt: now }).where(eq(r.id, rfq.id));
  if (rfq.offerDeadline)
    await startDeadline(tx, {
      type: OFFER,
      subjectType: "rfq",
      subjectId: rfq.id,
      startedAt: now,
      dueAt: rfq.offerDeadline,
    });
}

/**
 * Send a draft. To one supplier it goes straight out (Sent); to two or more, H2 India checks it first (In moderation,
 * 1 working day). Returns the new status.
 */
export async function submitRfq(
  db: Database,
  actor: Actor,
  organisationId: string,
  rfqId: string,
  context?: RequestContext,
  now: Date = new Date(),
): Promise<RfqStatus> {
  assertCan(actor, "rfq.create", { organisationId });
  const row = await ownRfq(db, organisationId, rfqId);
  if (row.status !== "Draft") throw new RfqError("Only a draft can be sent");
  const problems = await draftProblems(db, rfqId, now);
  if (Object.keys(problems).length) throw new RfqError("Check the highlighted fields", problems);
  const count = (await db.select({ id: rs.id }).from(rs).where(eq(rs.rfqId, rfqId))).length;
  // Suppliers chosen earlier must still be verified when it is sent.
  const ids = (await db.select({ o: rs.organisationId }).from(rs).where(eq(rs.rfqId, rfqId))).map((x) => x.o);
  if ((await verifiedSuppliers(db, ids)).length !== ids.length)
    throw new RfqError("A supplier you chose is no longer verified. Choose another", {
      suppliers: "Choose verified suppliers only",
    });
  if (needsModeration(count)) {
    await moveRfq(
      db,
      actor.userId,
      row,
      { from: "Draft", to: "In moderation" },
      {
        context,
        also: async (tx) => {
          await tx.update(r).set({ submittedAt: now }).where(eq(r.id, rfqId));
          await startClock(tx, { clock: "rfqModeration", subjectType: "rfq", subjectId: rfqId, from: now });
        },
      },
    );
    return "In moderation";
  }
  await moveRfq(
    db,
    actor.userId,
    row,
    { from: "Draft", to: "Sent" },
    {
      context,
      also: async (tx) => {
        await tx.update(r).set({ submittedAt: now }).where(eq(r.id, rfqId));
        await sendToSuppliers(tx, row, now);
      },
    },
  );
  await tell(() => sendRfqReceived(db, rfqId));
  return "Sent";
}

/** Delete a draft (soft). */
export async function deleteRfqDraft(db: Database, actor: Actor, organisationId: string, rfqId: string) {
  assertCan(actor, "rfq.create", { organisationId });
  const row = await ownRfq(db, organisationId, rfqId);
  if (row.status !== "Draft" && row.status !== "Returned") throw new RfqError("Only a draft can be deleted");
  await db.update(r).set({ deletedAt: new Date() }).where(eq(r.id, rfqId));
}

// ------------------------------------------------------------------------------------------------ moderation

/** Approve a checked RFQ (632:1138): it goes to every chosen supplier. */
export async function approveRfq(
  db: Database,
  actor: Actor,
  rfqId: string,
  context?: RequestContext,
  now = new Date(),
) {
  assertCan(actor, "queues.edit");
  if (!actor.userId) throw new RfqError("Sign in again");
  const moderatorId = actor.userId;
  const [row] = await db.select().from(r).where(eq(r.id, rfqId));
  if (!row) throw new RfqError("No such RFQ");
  if (row.offerDeadline && row.offerDeadline.getTime() <= now.getTime())
    throw new RfqError("The offer deadline has passed. Return it so the buyer can set a new one");
  await moveRfq(
    db,
    moderatorId,
    row,
    { from: "In moderation", to: "Sent" },
    {
      context,
      also: async (tx) => {
        await tx.insert(schema.rfqModerationDecisions).values({ rfqId, decision: "Approved", moderatorId });
        await completeDeadline(tx, { type: "rfqModeration", subjectType: "rfq", subjectId: rfqId });
        await sendToSuppliers(tx, row, now);
      },
    },
  );
  const suppliers = (await db.select({ id: rs.id }).from(rs).where(eq(rs.rfqId, rfqId))).length;
  await tell(() => sendRfqReceived(db, rfqId));
  await tell(() => sendRfqChecked(db, rfqId, { approved: true, suppliers }));
}

/** Return an RFQ to the buyer with reasons (they edit and send it again). */
export async function returnRfq(
  db: Database,
  actor: Actor,
  rfqId: string,
  input: { reasons: string[]; note?: string },
  context?: RequestContext,
) {
  assertCan(actor, "queues.edit");
  if (!actor.userId) throw new RfqError("Sign in again");
  const moderatorId = actor.userId;
  const reasons = input.reasons.map((x) => x.trim()).filter(Boolean);
  if (!reasons.length) throw new RfqError("Choose at least one reason");
  const [row] = await db.select().from(r).where(eq(r.id, rfqId));
  if (!row) throw new RfqError("No such RFQ");
  await moveRfq(
    db,
    moderatorId,
    row,
    { from: "In moderation", to: "Returned" },
    {
      context,
      reason: reasons.join("; "),
      also: async (tx) => {
        await tx
          .insert(schema.rfqModerationDecisions)
          .values({ rfqId, decision: "Returned", reasons, note: input.note?.trim() || null, moderatorId });
        await completeDeadline(tx, { type: "rfqModeration", subjectType: "rfq", subjectId: rfqId });
      },
    },
  );
  await tell(() => sendRfqChecked(db, rfqId, { approved: false, reasons, note: input.note?.trim() || null }));
}

/** Reject an RFQ that isn't a real request (632:1138): it closes and goes to no supplier. */
export async function rejectRfq(
  db: Database,
  actor: Actor,
  rfqId: string,
  input: { reason: string },
  context?: RequestContext,
) {
  assertCan(actor, "queues.edit");
  if (!actor.userId) throw new RfqError("Sign in again");
  const moderatorId = actor.userId;
  const reason = input.reason.trim();
  if (!reason) throw new RfqError("Say why it is rejected");
  const [row] = await db.select().from(r).where(eq(r.id, rfqId));
  if (!row) throw new RfqError("No such RFQ");
  await moveRfq(
    db,
    moderatorId,
    row,
    { from: "In moderation", to: "Closed" },
    {
      context,
      reason,
      also: async (tx) => {
        await tx
          .insert(schema.rfqModerationDecisions)
          .values({ rfqId, decision: "Rejected", reasons: [reason], moderatorId });
        await tx.update(r).set({ closedAt: new Date(), closeReason: "rejected" }).where(eq(r.id, rfqId));
        await completeDeadline(tx, { type: "rfqModeration", subjectType: "rfq", subjectId: rfqId });
      },
    },
  );
}

/** Assign to me (629:1148), or reassign. */
export async function assignModerator(
  db: Database,
  actor: Actor,
  rfqId: string,
  moderatorId: string | null,
  context?: RequestContext,
) {
  assertCan(actor, "queues.edit");
  const [row] = await db
    .select()
    .from(r)
    .where(and(eq(r.id, rfqId), eq(r.status, "In moderation")));
  if (!row) throw new RfqError("This RFQ isn't waiting for moderation");
  await db.transaction(async (tx) => {
    await tx.update(r).set({ moderatorId }).where(eq(r.id, rfqId));
    await audit(tx, {
      actorId: actor.userId,
      action: "rfq.moderation.assigned",
      resourceType: "rfq",
      resourceId: rfqId,
      companyId: row.organisationId,
      before: { moderatorId: row.moderatorId },
      after: { moderatorId },
      context,
    });
  });
}

// ------------------------------------------------------------------------------------------------ buyer: after sending

/** Move the offer deadline (564:577). Suppliers are told in step 9.6. */
export async function extendOfferDeadline(
  db: Database,
  actor: Actor,
  organisationId: string,
  rfqId: string,
  to: Date,
  context?: RequestContext,
  now = new Date(),
) {
  assertCan(actor, "rfq.create", { organisationId });
  const row = await ownRfq(db, organisationId, rfqId);
  if (row.status !== "Sent" && row.status !== "Quotes received") throw new RfqError("Only an open RFQ can be extended");
  if (to.getTime() <= Math.max(now.getTime(), row.offerDeadline?.getTime() ?? 0))
    throw new RfqError("Choose a later deadline");
  await db.transaction(async (tx) => {
    await tx.update(r).set({ offerDeadline: to, updatedAt: now }).where(eq(r.id, rfqId));
    await cancelDeadline(tx, { type: OFFER, subjectType: "rfq", subjectId: rfqId });
    await startDeadline(tx, { type: OFFER, subjectType: "rfq", subjectId: rfqId, startedAt: now, dueAt: to });
    // Suppliers whose chance had expired can quote again.
    await tx
      .update(rs)
      .set({ status: "Sent" })
      .where(and(eq(rs.rfqId, rfqId), eq(rs.status, "Expired")));
    await audit(tx, {
      actorId: actor.userId,
      action: "rfq.deadline.extended",
      resourceType: "rfq",
      resourceId: rfqId,
      companyId: organisationId,
      before: { offerDeadline: row.offerDeadline?.toISOString() ?? null },
      after: { offerDeadline: to.toISOString() },
      context,
    });
  });
}

/**
 * Close an RFQ (Close RFQ 566:776, Decline all 566:1011, or by accepting a quote in step 9.8). Quotes still open become
 * Not selected.
 */
export async function closeRfq(
  db: Database,
  actor: Actor,
  organisationId: string,
  rfqId: string,
  input: { reason: "closed" | "declined all" | "accepted"; keepQuoteId?: string },
  context?: RequestContext,
) {
  assertCan(actor, "rfq.create", { organisationId });
  const row = await ownRfq(db, organisationId, rfqId);
  if (row.status !== "Sent" && row.status !== "Quotes received") throw new RfqError("This RFQ isn't open");
  await moveRfq(
    db,
    actor.userId,
    row,
    { from: row.status, to: "Closed" },
    {
      context,
      reason: input.reason,
      also: async (tx) => {
        await tx.update(r).set({ closedAt: new Date(), closeReason: input.reason }).where(eq(r.id, rfqId));
        await cancelDeadline(tx, { type: OFFER, subjectType: "rfq", subjectId: rfqId });
        const open = await tx
          .select({ id: q.id, status: q.status, organisationId: q.organisationId })
          .from(q)
          .where(and(eq(q.rfqId, rfqId), inArray(q.status, ["Sent", "Revised", "Expired"])));
        for (const x of open) {
          if (x.id === input.keepQuoteId) continue;
          await moveQuote(
            tx,
            actor.userId,
            x,
            { from: x.status as "Sent" | "Revised" | "Expired", to: "Not selected" },
            {
              reason: input.reason,
            },
          );
          await cancelDeadline(tx, { type: VALIDITY, subjectType: "quote", subjectId: x.id });
        }
        // Drafts nobody sent are left as they are; the RFQ is closed so they can't be sent.
      },
    },
  );
}

// ------------------------------------------------------------------------------------------------ supplier side

async function recipient(ex: Executor, supplierId: string, rfqId: string) {
  const [row] = await ex
    .select({ rs, rfq: r })
    .from(rs)
    .innerJoin(r, eq(r.id, rs.rfqId))
    .where(and(eq(rs.rfqId, rfqId), eq(rs.organisationId, supplierId), sql`${r.sentAt} is not null`));
  if (!row) throw new RfqError("No such RFQ");
  return row;
}

/** The supplier opened the RFQ: Sent → Viewed (the buyer sees "Viewed", 560:8). */
export async function markViewed(db: Database, actor: Actor, supplierId: string, rfqId: string) {
  assertCan(actor, "rfq.view", { organisationId: supplierId });
  await db
    .update(rs)
    .set({ status: "Viewed", viewedAt: new Date() })
    .where(and(eq(rs.rfqId, rfqId), eq(rs.organisationId, supplierId), eq(rs.status, "Sent")));
}

/** Decline an RFQ (620:146) with a reason the buyer sees. */
export async function declineRfq(
  db: Database,
  actor: Actor,
  supplierId: string,
  rfqId: string,
  input: { reason: string; note?: string },
  context?: RequestContext,
) {
  assertCan(actor, "quote.send", { organisationId: supplierId });
  if (!input.reason.trim()) throw new RfqError("Choose a reason");
  const { rs: row, rfq } = await recipient(db, supplierId, rfqId);
  if (row.status === "Quoted" || row.status === "Declined") throw new RfqError("You've already answered this RFQ");
  if (rfq.status === "Closed") throw new RfqError("This RFQ is closed");
  await db.transaction(async (tx) => {
    await tx
      .update(rs)
      .set({
        status: "Declined",
        declinedAt: new Date(),
        declineReason: input.reason.trim(),
        declineNote: input.note?.trim() || null,
      })
      .where(eq(rs.id, row.id));
    await audit(tx, {
      actorId: actor.userId,
      action: "rfq.declined",
      resourceType: "rfq",
      resourceId: rfqId,
      companyId: supplierId,
      after: { reason: input.reason.trim() },
      context,
    });
  });
}

export interface QuoteLineInput {
  rfqItemId?: string | null;
  description: string;
  hsn?: string | null;
  quantity: number;
  unit?: string;
  unitPricePaise: bigint;
  gstRateBps: number;
}

export interface QuoteInput {
  lines: QuoteLineInput[];
  freightPaise?: bigint;
  freightGstRateBps?: number;
  deliveryTerms?: string | null;
  freightIncluded?: boolean;
  leadTimeWeeks?: number | null;
  validUntil?: Date | null;
  warrantyMonths?: number | null;
  notes?: string | null;
  changeNote?: string | null;
  documents?: string[];
  schedule: PaymentLine[];
}

/** The latest version of a quote, and whether it is a draft. */
async function latestVersion(ex: Executor, quoteId: string) {
  const [v] = await ex.select().from(qv).where(eq(qv.quoteId, quoteId)).orderBy(desc(qv.version)).limit(1);
  return v ?? null;
}

/**
 * Save the supplier's quote as a draft: the first draft (v1), or the next version while revising (v2 draft; v1 stays
 * with the buyer until v2 is sent). Returns the quote and version ids.
 */
export async function saveQuoteDraft(
  db: Database,
  actor: Actor,
  supplierId: string,
  rfqId: string,
  input: QuoteInput,
  context?: RequestContext,
) {
  assertCan(actor, "quote.send", { organisationId: supplierId });
  const { rs: row, rfq } = await recipient(db, supplierId, rfqId);
  if (rfq.status === "Closed") throw new RfqError("This RFQ is closed");
  if (row.status === "Declined") throw new RfqError("You declined this RFQ");
  for (const l of input.lines)
    if (l.unitPricePaise < 0n || l.quantity <= 0 || l.gstRateBps < 0 || l.gstRateBps > 10_000)
      throw new RfqError("Check the quote lines");
  return db.transaction(async (tx) => {
    let [quote] = await tx
      .select()
      .from(q)
      .where(and(eq(q.rfqId, rfqId), eq(q.organisationId, supplierId)));
    if (quote && (quote.status === "Withdrawn" || quote.status === "Not selected" || quote.status === "Accepted"))
      throw new RfqError("This quote can't be changed");
    if (!quote) {
      const reference = await nextReference(tx, "Q");
      [quote] = await tx
        .insert(q)
        .values({
          reference,
          rfqId,
          organisationId: supplierId,
          buyerOrganisationId: rfq.organisationId,
          createdBy: actor.userId,
        })
        .returning();
      if (!quote) throw new Error("quote insert returned nothing");
    }
    const last = await latestVersion(tx, quote.id);
    let version = last;
    if (!last || last.state === "Sent") {
      const [made] = await tx
        .insert(qv)
        .values({ quoteId: quote.id, version: (last?.version ?? 0) + 1 })
        .returning();
      version = made ?? null;
    }
    if (!version) throw new Error("version insert returned nothing");
    const figures = quoteFigures(input.lines, {
      paise: input.freightPaise ?? 0n,
      gstRateBps: input.freightGstRateBps ?? 0,
    });
    await tx
      .update(qv)
      .set({
        freightPaise: input.freightPaise ?? 0n,
        freightGstRateBps: input.freightGstRateBps ?? 0,
        deliveryTerms: input.deliveryTerms?.trim() || null,
        freightIncluded: input.freightIncluded ?? false,
        leadTimeWeeks: input.leadTimeWeeks ?? null,
        validUntil: input.validUntil ?? null,
        warrantyMonths: input.warrantyMonths ?? null,
        notes: input.notes?.trim() || null,
        changeNote: input.changeNote?.trim() || null,
        documents: input.documents ?? [],
        subtotalPaise: figures.subtotalPaise,
        gstPaise: figures.gstPaise,
        totalPaise: figures.totalPaise,
        updatedAt: new Date(),
      })
      .where(eq(qv.id, version.id));
    await tx.delete(ql).where(eq(ql.versionId, version.id));
    if (input.lines.length)
      await tx.insert(ql).values(
        input.lines.map((l, n) => ({
          versionId: version.id,
          rfqItemId: l.rfqItemId ?? null,
          description: l.description.trim(),
          hsn: l.hsn?.trim() || null,
          quantity: l.quantity,
          unit: l.unit?.trim() || "units",
          unitPricePaise: l.unitPricePaise,
          gstRateBps: l.gstRateBps,
          position: n,
        })),
      );
    await tx.delete(qp).where(eq(qp.versionId, version.id));
    if (input.schedule.length)
      await tx.insert(qp).values(
        input.schedule.map((p, n) => ({
          versionId: version.id,
          percentBps: p.percentBps,
          trigger: p.trigger.trim(),
          position: n,
        })),
      );
    await audit(tx, {
      actorId: actor.userId,
      action: "quote.draft.saved",
      resourceType: "quote",
      resourceId: quote.id,
      companyId: supplierId,
      after: { version: version.version },
      context,
    });
    return { quoteId: quote.id, versionId: version.id, version: version.version, reference: quote.reference };
  });
}

/** Problems with a draft version before sending, or {} (617:8 validation). */
export async function quoteProblems(
  ex: Executor,
  versionId: string,
  now = new Date(),
): Promise<Record<string, string>> {
  const [v] = await ex.select().from(qv).where(eq(qv.id, versionId));
  if (!v) return { quote: "No such quote" };
  const lines = await ex.select().from(ql).where(eq(ql.versionId, versionId));
  const schedule = await ex.select().from(qp).where(eq(qp.versionId, versionId)).orderBy(asc(qp.position));
  const e: Record<string, string> = {};
  if (!lines.length) e.lines = "Add at least one priced line";
  if (v.leadTimeWeeks === null || v.leadTimeWeeks <= 0) e.leadTime = "Enter the lead time";
  if (!v.validUntil) e.validUntil = "Say how long the quote is valid";
  else if (v.validUntil.getTime() <= now.getTime()) e.validUntil = "The validity date must be in the future";
  if (!v.deliveryTerms) e.deliveryTerms = "Enter the delivery terms";
  const s = scheduleProblem(schedule);
  if (s) e.schedule = s;
  if (v.version > 1 && !v.changeNote) e.changeNote = "Tell the buyer what changed";
  return e;
}

/**
 * Send the draft version to the buyer: v1 makes the quote Sent; a later version makes it Revised (with the What changed
 * note). The recipient becomes Quoted, the RFQ becomes Quotes received, and the validity deadline starts.
 */
export async function sendQuote(
  db: Database,
  actor: Actor,
  supplierId: string,
  quoteId: string,
  context?: RequestContext,
  now = new Date(),
): Promise<{ status: QuoteStatus; version: number }> {
  assertCan(actor, "quote.send", { organisationId: supplierId });
  const [quote] = await db
    .select()
    .from(q)
    .where(and(eq(q.id, quoteId), eq(q.organisationId, supplierId)));
  if (!quote) throw new RfqError("No such quote");
  const { rs: row, rfq } = await recipient(db, supplierId, quote.rfqId);
  if (rfq.status === "Closed") throw new RfqError("This RFQ is closed");
  if (rfq.offerDeadline && rfq.offerDeadline.getTime() <= now.getTime() && quote.status === "Draft")
    throw new RfqError("The offer deadline has passed");
  const version = await latestVersion(db, quoteId);
  if (!version || version.state !== "Draft") throw new RfqError("There is nothing new to send");
  const problems = await quoteProblems(db, version.id, now);
  if (Object.keys(problems).length) throw new RfqError("Check the highlighted fields", problems);
  const from = quote.status as QuoteStatus;
  const move: QuoteMove | null =
    from === "Draft"
      ? { from: "Draft", to: "Sent" }
      : from === "Sent" || from === "Revised" || from === "Expired"
        ? { from, to: "Revised" }
        : null;
  if (!move) throw new RfqError("This quote can't be sent");
  await moveQuote(db, actor.userId, quote, move, {
    context,
    metadata: { version: version.version },
    also: async (tx) => {
      await tx.update(qv).set({ state: "Sent", sentAt: now, sentBy: actor.userId }).where(eq(qv.id, version.id));
      await tx.update(q).set({ sentVersion: version.version, updatedAt: now }).where(eq(q.id, quoteId));
      await tx.update(rs).set({ status: "Quoted" }).where(eq(rs.id, row.id));
      await cancelDeadline(tx, { type: VALIDITY, subjectType: "quote", subjectId: quoteId });
      if (version.validUntil)
        await startDeadline(tx, {
          type: VALIDITY,
          subjectType: "quote",
          subjectId: quoteId,
          startedAt: now,
          dueAt: version.validUntil,
        });
      if (rfq.status === "Sent")
        await moveRfq(tx, actor.userId, rfq, { from: "Sent", to: "Quotes received" }, { reason: "First quote" });
    },
  });
  return { status: move.to, version: version.version };
}

/** Withdraw a sent quote (620:8): the buyer can't accept it any more. */
export async function withdrawQuote(
  db: Database,
  actor: Actor,
  supplierId: string,
  quoteId: string,
  input: { reason: string; note?: string },
  context?: RequestContext,
) {
  assertCan(actor, "quote.send", { organisationId: supplierId });
  if (!input.reason.trim()) throw new RfqError("Choose a reason");
  const [quote] = await db
    .select()
    .from(q)
    .where(and(eq(q.id, quoteId), eq(q.organisationId, supplierId)));
  if (!quote) throw new RfqError("No such quote");
  if (quote.status !== "Sent" && quote.status !== "Revised" && quote.status !== "Expired")
    throw new RfqError("Only a sent quote can be withdrawn");
  const from = quote.status;
  if (from === "Expired") throw new RfqError("This quote has expired already");
  await moveQuote(
    db,
    actor.userId,
    quote,
    { from, to: "Withdrawn" },
    {
      context,
      reason: input.reason.trim(),
      also: async (tx) => {
        await tx
          .update(q)
          .set({
            withdrawnAt: new Date(),
            withdrawReason: input.reason.trim(),
            withdrawNote: input.note?.trim() || null,
          })
          .where(eq(q.id, quoteId));
        // A draft revision in progress goes with it.
        await tx.delete(qv).where(and(eq(qv.quoteId, quoteId), eq(qv.state, "Draft")));
        await cancelDeadline(tx, { type: VALIDITY, subjectType: "quote", subjectId: quoteId });
      },
    },
  );
}

// ------------------------------------------------------------------------------------------------ reads

/** The buyer company's RFQs (557:8), newest first, with supplier and quote counts. */
export async function buyerRfqs(db: Executor, scope: Scope, organisationId: string) {
  return db
    .select({
      rfq: r,
      suppliers: sql<number>`(select count(*)::int from core.rfq_suppliers x where x.rfq_id = core.rfqs.id)`,
      quoted: sql<number>`(select count(*)::int from core.quotes x where x.rfq_id = core.rfqs.id and x.sent_version is not null and x.status not in ('Withdrawn'))`,
      createdByName: sql<string>`(select u.name from core.users u where u.id = core.rfqs.created_by)`,
    })
    .from(r)
    .where(and(inScope(scope, r.organisationId), eq(r.organisationId, organisationId), isNull(r.deletedAt)))
    .orderBy(desc(r.createdAt));
}

/** One RFQ for its buyer: items, suppliers and each supplier's latest sent quote version. */
export async function buyerRfq(db: Executor, scope: Scope, organisationId: string, rfqId: string) {
  const [row] = await db
    .select()
    .from(r)
    .where(
      and(inScope(scope, r.organisationId), eq(r.organisationId, organisationId), eq(r.id, rfqId), isNull(r.deletedAt)),
    );
  if (!row) return null;
  const [items, suppliers, quotes, decisions] = await Promise.all([
    db.select().from(ri).where(eq(ri.rfqId, rfqId)).orderBy(asc(ri.position)),
    db
      .select({ rs, name: schema.companyProfiles.tradeName, legalName: schema.organisations.legalName })
      .from(rs)
      .innerJoin(schema.organisations, eq(schema.organisations.id, rs.organisationId))
      .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, rs.organisationId))
      .where(eq(rs.rfqId, rfqId))
      .orderBy(asc(rs.createdAt)),
    db
      .select()
      .from(q)
      .where(and(eq(q.rfqId, rfqId), sql`${q.sentVersion} is not null`)),
    db
      .select()
      .from(schema.rfqModerationDecisions)
      .where(eq(schema.rfqModerationDecisions.rfqId, rfqId))
      .orderBy(desc(schema.rfqModerationDecisions.at)),
  ]);
  return { rfq: row, items, suppliers, quotes, decisions };
}

/**
 * A sent version of a quote with its lines and schedule. The buyer reads only sent versions (any of them: See v1);
 * the supplier also reads its draft. Null when the reader may not see it.
 */
export async function quoteVersion(
  db: Executor,
  scope: Scope,
  reader: { organisationId: string; side: "buyer" | "supplier" },
  quoteId: string,
  version?: number,
) {
  const owner = reader.side === "buyer" ? q.buyerOrganisationId : q.organisationId;
  const [quote] = await db
    .select()
    .from(q)
    .where(and(eq(q.id, quoteId), inScope(scope, owner), eq(owner, reader.organisationId)));
  if (!quote) return null;
  const want = version ?? (reader.side === "buyer" ? quote.sentVersion : null);
  const conds = [eq(qv.quoteId, quoteId)];
  if (want !== null) conds.push(eq(qv.version, want));
  if (reader.side === "buyer") conds.push(eq(qv.state, "Sent"));
  const [v] = await db
    .select()
    .from(qv)
    .where(and(...conds))
    .orderBy(desc(qv.version))
    .limit(1);
  if (!v) return null;
  const [lines, schedule] = await Promise.all([
    db.select().from(ql).where(eq(ql.versionId, v.id)).orderBy(asc(ql.position)),
    db.select().from(qp).where(eq(qp.versionId, v.id)).orderBy(asc(qp.position)),
  ]);
  return { quote, version: v, lines, schedule };
}

/** RFQs sent to a supplier (inbox 615:8): only once sent, never drafts or ones in moderation. */
export async function supplierRfqs(db: Executor, scope: Scope, supplierId: string) {
  return db
    .select({
      rfq: r,
      recipient: rs,
      buyer: schema.organisations.legalName,
      quote: { id: q.id, status: q.status, sentVersion: q.sentVersion, reference: q.reference },
    })
    .from(rs)
    .innerJoin(r, eq(r.id, rs.rfqId))
    .innerJoin(schema.organisations, eq(schema.organisations.id, r.organisationId))
    .leftJoin(q, and(eq(q.rfqId, r.id), eq(q.organisationId, supplierId)))
    .where(and(inScope(scope, rs.organisationId), eq(rs.organisationId, supplierId), sql`${r.sentAt} is not null`))
    .orderBy(desc(r.sentAt));
}

/** Whether this person may see this RFQ as its buyer or one of its suppliers. */
export function canSeeRfq(actor: Actor, rfq: { organisationId: string }, supplierIds: string[]) {
  return (
    can(actor, "rfq.view", { organisationId: rfq.organisationId }) ||
    supplierIds.some((id) => can(actor, "rfq.view", { organisationId: id }))
  );
}

// ------------------------------------------------------------------------------------------------ deadlines

/** Quote validity ends: a sent quote becomes Expired and can't be accepted. */
onDeadline(VALIDITY, async (tx, deadline, event) => {
  if (event !== "expire") return;
  const [quote] = await tx.select().from(q).where(eq(q.id, deadline.subjectId));
  if (!quote || (quote.status !== "Sent" && quote.status !== "Revised")) return;
  await moveQuote(tx, null, quote, { from: quote.status, to: "Expired" }, { reason: "Validity ended" });
});

/** The offer deadline passes: suppliers who neither quoted nor declined are marked Expired. */
onDeadline(OFFER, async (tx, deadline, event) => {
  if (event !== "expire") return;
  await tx
    .update(rs)
    .set({ status: "Expired" })
    .where(and(eq(rs.rfqId, deadline.subjectId), inArray(rs.status, ["Sent", "Viewed"])));
});
