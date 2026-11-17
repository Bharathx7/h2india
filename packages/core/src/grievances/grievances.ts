import { schema, type Database } from "@h2india/db";
import { and, eq, sql } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import { completeDeadline, startClock } from "../clocks/clocks";
import { notify } from "../notify/notify";
import { nextReference } from "../reference";
import { changeStatus } from "../status";
import {
  checkGrievance,
  GRIEVANCE_TEAM,
  GRIEVANCE_TRANSITIONS,
  normaliseTicket,
  type GrievanceInput,
  type GrievanceStatus,
  type GrievanceType,
  type GrievanceView,
} from "./rules";

// Grievances (step 5.8). raiseGrievance() files a complaint with its GRV reference and starts the two clocks
// (acknowledge in 24 hours, resolve in 15 days, A24) in one transaction. findGrievance() answers the status lookup
// only for the right ticket and email together, and returns nothing else. Operators move a complaint with
// moveGrievance(), which goes through changeStatus() and closes the matching deadline.

const g = schema.grievances;
const SUBJECT = "grievance";

export interface RaisedGrievance {
  id: string;
  reference: string;
  type: GrievanceType;
  createdAt: Date;
  resolveBy: Date;
  name: string;
  email: string;
  description: string;
  pageUrl: string | null;
}

export async function raiseGrievance(
  db: Database,
  input: GrievanceInput,
  opts: { userId?: string | null; context?: RequestContext; now?: Date } = {},
): Promise<{ ok: true; grievance: RaisedGrievance } | { ok: false; errors: Record<string, string> }> {
  const checked = checkGrievance(input);
  if (!checked.ok) return checked;
  const v = checked.value;
  const now = opts.now ?? new Date();
  const grievance = await db.transaction(async (tx) => {
    const reference = await nextReference(tx, "GRV", now);
    // The id is a UUID v7 from the column default; the deadlines need it, so the row goes in first and its
    // resolve-by date is set from the clock just after.
    const [row] = await tx
      .insert(g)
      .values({
        reference,
        type: v.type,
        pageUrl: v.pageUrl,
        description: v.description,
        name: v.name,
        email: v.email,
        mobile: v.mobile,
        files: v.files,
        userId: opts.userId ?? null,
        team: GRIEVANCE_TEAM[v.type],
        resolveBy: now,
        createdAt: now,
      })
      .returning({ id: g.id });
    if (!row) throw new Error("grievance was not saved");
    await startClock(tx, { clock: "grievanceAcknowledge", subjectType: SUBJECT, subjectId: row.id, from: now });
    const resolve = await startClock(tx, {
      clock: "grievanceResolve",
      subjectType: SUBJECT,
      subjectId: row.id,
      from: now,
    });
    await tx.update(g).set({ resolveBy: resolve.dueAt }).where(eq(g.id, row.id));
    await audit(tx, {
      actorId: opts.userId ?? null,
      action: "grievance.raised",
      resourceType: SUBJECT,
      resourceId: row.id,
      after: { reference, type: v.type, files: v.files.length },
      context: opts.context,
    });
    return {
      id: row.id,
      reference,
      type: v.type,
      createdAt: now,
      resolveBy: resolve.dueAt,
      name: v.name,
      email: v.email,
      description: v.description,
      pageUrl: v.pageUrl,
    };
  });
  return { ok: true, grievance };
}

const view = (r: typeof g.$inferSelect): GrievanceView => ({
  reference: r.reference,
  type: r.type as GrievanceType,
  status: r.status as GrievanceStatus,
  createdAt: r.createdAt,
  acknowledgedAt: r.acknowledgedAt,
  resolvedAt: r.resolvedAt,
  resolveBy: r.resolveBy,
  team: r.team,
  publicNote: r.publicNote,
  outcome: r.outcome,
});

/** The status lookup (519:588): the ticket and the email it was raised with must both match. */
export async function findGrievance(db: Database, ticket: string, email: string): Promise<GrievanceView | null> {
  const reference = normaliseTicket(ticket);
  const mail = email.trim().toLowerCase();
  if (!reference || !mail) return null;
  const [row] = await db
    .select()
    .from(g)
    .where(and(eq(g.reference, reference), sql`lower(${g.email}) = ${mail}`))
    .limit(1);
  return row ? view(row) : null;
}

export async function grievanceById(db: Database, id: string) {
  const [row] = await db.select().from(g).where(eq(g.id, id)).limit(1);
  return row ?? null;
}

/**
 * An operator moves a complaint on: Acknowledged (closes the 24-hour clock), In review, or Resolved (closes the
 * 15-day clock; the outcome is required). The team and the public note are what the complainant sees.
 */
export async function moveGrievance(
  db: Database,
  input: {
    id: string;
    to: GrievanceStatus;
    actorId: string;
    team?: string;
    publicNote?: string;
    outcome?: string;
    context?: RequestContext;
    now?: Date;
  },
): Promise<void> {
  const row = await grievanceById(db, input.id);
  if (!row) throw new Error(`grievance ${input.id} not found`);
  if (input.to === "Resolved" && !input.outcome?.trim()) throw new Error("Say what the outcome was");
  const now = input.now ?? new Date();
  await changeStatus(db, {
    table: g,
    entityType: SUBJECT,
    id: input.id,
    from: row.status,
    to: input.to,
    actorId: input.actorId,
    transitions: GRIEVANCE_TRANSITIONS,
    context: input.context,
    also: async (tx) => {
      await tx
        .update(g)
        .set({
          ...(input.team ? { team: input.team } : {}),
          ...(input.publicNote !== undefined ? { publicNote: input.publicNote || null } : {}),
          ...(input.to === "Acknowledged" ? { acknowledgedAt: now } : {}),
          ...(input.to === "Resolved" ? { resolvedAt: now, outcome: input.outcome?.trim() ?? null } : {}),
        })
        .where(eq(g.id, input.id));
      if (input.to === "Acknowledged" || (input.to === "Resolved" && !row.acknowledgedAt)) {
        await completeDeadline(tx, { type: "grievanceAcknowledge", subjectType: SUBJECT, subjectId: input.id });
      }
      if (input.to === "Resolved") {
        await completeDeadline(tx, { type: "grievanceResolve", subjectType: SUBJECT, subjectId: input.id });
      }
    },
  });
  // Founder QC (17 Nov 2026): the complainant heard nothing after the receipt. Someone signed in when they raised it
  // is told in the app (no approved email wording yet, M21); everyone can still look it up with the ticket.
  if (row.userId && (input.to === "Acknowledged" || input.to === "Resolved"))
    await notify({
      event: input.to === "Resolved" ? "grievance.resolved" : "grievance.acknowledged",
      topic: "account.security",
      userId: row.userId,
      inApp: {
        category: "account",
        icon: input.to === "Resolved" ? "check-circle" : "clipboard-check",
        title: `${row.reference}: ${input.to === "Resolved" ? "resolved" : "we're looking into it"}`,
        body: input.to === "Resolved" ? input.outcome?.trim() : input.publicNote?.trim() || undefined,
        href: `/legal/grievance-officer?ticket=${encodeURIComponent(row.reference)}`,
      },
    }).catch((error: unknown) => {
      console.error("grievance notice failed", error);
    });
}
