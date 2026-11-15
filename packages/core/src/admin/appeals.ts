import { schema, type Database } from "@h2india/db";
import { and, desc, eq } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { notify } from "../notify/notify";
import { must } from "../must";
import { suspendCompany, UserAdminError } from "./users";

// Appeals against a company's suspension (G10). A person at the suspended company (company.manage) sends one from the
// supplier workspace; an operator with users.edit lifts the suspension or keeps it, with a note the company sees.

const a = schema.suspensionAppeals;

export async function sendAppeal(
  db: Database,
  actor: Actor,
  organisationId: string,
  reason: string,
  context?: RequestContext,
) {
  assertCan(actor, "company.manage", { organisationId });
  const text = reason.trim();
  if (text.length < 20) throw new UserAdminError("Explain your appeal in a few sentences");
  if (text.length > 2000) throw new UserAdminError("Keep it to 2,000 characters");
  const [org] = await db.select().from(schema.organisations).where(eq(schema.organisations.id, organisationId));
  if (!org?.suspendedAt) throw new UserAdminError("Your company isn't suspended");
  const [open] = await db
    .select({ id: a.id })
    .from(a)
    .where(and(eq(a.organisationId, organisationId), eq(a.status, "Open")));
  if (open) throw new UserAdminError("Your appeal is already with H2 India");
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(a)
      .values({ organisationId, sentBy: must(actor.userId), reason: text })
      .returning();
    await audit(tx, {
      actorId: actor.userId,
      action: "company.appeal_sent",
      resourceType: "suspension_appeal",
      resourceId: row?.id ?? null,
      companyId: organisationId,
      context,
    });
  });
}

/** The company's latest appeal, for the banner. */
export async function latestAppeal(db: Database, organisationId: string) {
  const [row] = await db
    .select()
    .from(a)
    .where(eq(a.organisationId, organisationId))
    .orderBy(desc(a.createdAt))
    .limit(1);
  return row ?? null;
}

export async function listAppeals(db: Database, actor: Actor) {
  assertCan(actor, "users.view");
  return db
    .select({
      appeal: a,
      company: schema.organisations.legalName,
      suspendReason: schema.organisations.suspendReason,
      suspendedAt: schema.organisations.suspendedAt,
      sender: schema.users.name,
    })
    .from(a)
    .innerJoin(schema.organisations, eq(schema.organisations.id, a.organisationId))
    .innerJoin(schema.users, eq(schema.users.id, a.sentBy))
    .orderBy(desc(a.createdAt))
    .limit(200);
}

/** Lift the suspension (the listings come back) or keep it; the person who appealed is told with the note. */
export async function decideAppeal(
  db: Database,
  actor: Actor,
  appealId: string,
  input: { lift: boolean; note: string },
  context?: RequestContext,
) {
  assertCan(actor, "users.edit");
  if (!input.note.trim()) throw new UserAdminError("Write a note for the company");
  const [row] = await db.select().from(a).where(eq(a.id, appealId));
  if (!row || row.status !== "Open") throw new UserAdminError("This appeal was already decided");
  if (input.lift) await suspendCompany(db, actor, row.organisationId, null, context);
  await db
    .update(a)
    .set({
      status: input.lift ? "Lifted" : "Upheld",
      decidedBy: actor.userId,
      decidedAt: new Date(),
      note: input.note.trim(),
    })
    .where(eq(a.id, appealId));
  await audit(db, {
    actorId: actor.userId,
    action: input.lift ? "company.appeal_lifted" : "company.appeal_upheld",
    resourceType: "suspension_appeal",
    resourceId: appealId,
    companyId: row.organisationId,
    reason: input.note.trim(),
    context,
  });
  await notify({
    event: "company.appeal_decided",
    topic: "company.verification",
    userId: row.sentBy,
    scope: row.organisationId,
    inApp: {
      category: "account",
      icon: input.lift ? "check-circle" : "x-circle",
      title: input.lift ? "Your appeal was accepted: your listings are back" : "Your appeal was not accepted",
      body: input.note.trim(),
      href: "/supplier",
    },
  }).catch((e: unknown) => {
    console.error("appeal notice failed", e);
  });
}

/** Whether the company is suspended, why, and its latest appeal (for the supplier workspace banner). */
export async function suspensionOf(db: Database, organisationId: string) {
  const [org] = await db
    .select({ at: schema.organisations.suspendedAt, reason: schema.organisations.suspendReason })
    .from(schema.organisations)
    .where(eq(schema.organisations.id, organisationId));
  if (!org?.at) return null;
  return { since: org.at, reason: org.reason, appeal: await latestAppeal(db, organisationId) };
}
