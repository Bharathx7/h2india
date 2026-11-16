import { ADMIN_FLAGS, parseServerEnv, setFlagOverrides, TWO_PERSON_FLAGS } from "@h2india/config";
import { CLOCKS, type ClockName, type Duration } from "@h2india/config/clocks";
import { schema, type Database, type Executor } from "@h2india/db";
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { CLOCK_SETTINGS } from "../clocks/clocks";
import { getDb } from "../db";
import { listDeadLetters } from "../queue/dead-letters";
import { defineSetting, getSetting, setSetting } from "../settings";
import { looksLikeEmail } from "../text-checks";

// System settings (707:793) and Reports (716:348), step 11.8. Switches and clocks are settings: every change is audited
// with its reason, clock changes apply to new deadlines only (each deadline keeps its own due time), and switches that
// open or close money flows need a second operator. Reports read nightly roll-ups, never the live tables.

export class SystemError extends Error {}

type AdminFlag = (typeof ADMIN_FLAGS)[number];

export const FLAG_OVERRIDES = defineSetting<Partial<Record<AdminFlag, boolean>>>({
  key: "flags.overrides",
  description: "Switches changed in System settings (maintenance, coming soon, search indexing, transactions…)",
  schema: z.partialRecord(z.enum(ADMIN_FLAGS), z.boolean()),
  fallback: {},
});

/** Reads the switches from the database into this process. The server calls it at most every 30 seconds. */
export async function refreshFlagOverrides(ex?: Executor) {
  try {
    setFlagOverrides(await getSetting(ex ?? getDb(), FLAG_OVERRIDES));
  } catch {
    // The database isn't reachable: keep the last known switches.
  }
}

let lastRefresh = 0;
/** Refresh in the background when the last read is older than 30 seconds (for the proxy, which runs on every request). */
export function refreshFlagsSoon(now = Date.now()) {
  if (now - lastRefresh < 30_000) return;
  lastRefresh = now;
  void refreshFlagOverrides();
}

/** Turn a switch on or off. Money switches become a proposal another operator must approve. */
export async function switchFlag(
  db: Database,
  actor: Actor,
  input: { flag: AdminFlag; on: boolean; reason: string },
  context?: RequestContext,
): Promise<"applied" | "proposed"> {
  assertCan(actor, "settings.edit");
  // Only a switch from the list: the name becomes a key in the stored setting (CodeQL js/remote-property-injection).
  const flag = ADMIN_FLAGS.find((f) => f === input.flag);
  if (!flag) throw new SystemError("Unknown switch");
  if (!input.reason.trim()) throw new SystemError("Give a reason");
  if (!actor.userId) throw new SystemError("Sign in again");
  if (TWO_PERSON_FLAGS.includes(flag)) {
    const [row] = await db
      .insert(schema.settingProposals)
      .values({ key: `flag.${input.flag}`, value: input.on, reason: input.reason.trim(), proposedBy: actor.userId })
      .returning({ id: schema.settingProposals.id });
    await audit(db, {
      actorId: actor.userId,
      action: "setting.proposed",
      resourceType: "setting",
      resourceId: row?.id ?? "",
      after: { flag: input.flag, on: input.on },
      reason: input.reason.trim(),
      context,
    });
    return "proposed";
  }
  const current = await getSetting(db, FLAG_OVERRIDES);
  await setSetting(
    db,
    actor,
    FLAG_OVERRIDES,
    { ...current, [flag]: input.on },
    { reason: input.reason.trim(), context },
  );
  await refreshFlagOverrides(db);
  return "applied";
}

export async function openProposals(db: Executor, actor: Actor) {
  assertCan(actor, "settings.view");
  return db
    .select({ p: schema.settingProposals, by: schema.users.name })
    .from(schema.settingProposals)
    .innerJoin(schema.users, eq(schema.users.id, schema.settingProposals.proposedBy))
    .where(isNull(schema.settingProposals.decidedAt))
    .orderBy(desc(schema.settingProposals.proposedAt));
}

/** A second operator approves or declines a proposed change; nobody approves their own. */
export async function decideProposal(
  db: Database,
  actor: Actor,
  id: string,
  approve: boolean,
  context?: RequestContext,
) {
  assertCan(actor, "settings.edit");
  const [p] = await db.select().from(schema.settingProposals).where(eq(schema.settingProposals.id, id));
  if (!p || p.decidedAt) throw new SystemError("This change has been decided already");
  if (p.proposedBy === actor.userId) throw new SystemError("Another operator must approve your change");
  await db
    .update(schema.settingProposals)
    .set({ decision: approve ? "Approved" : "Declined", decidedBy: actor.userId, decidedAt: new Date() })
    .where(and(eq(schema.settingProposals.id, id), isNull(schema.settingProposals.decidedAt)));
  if (approve && p.key.startsWith("flag.")) {
    const flag = p.key.slice(5) as AdminFlag;
    const current = await getSetting(db, FLAG_OVERRIDES);
    await setSetting(
      db,
      actor,
      FLAG_OVERRIDES,
      { ...current, [flag]: p.value === true },
      { reason: `${p.reason ?? ""} (proposed by another operator)`, context },
    );
    await refreshFlagOverrides(db);
  }
  await audit(db, {
    actorId: actor.userId,
    action: approve ? "setting.approved" : "setting.declined",
    resourceType: "setting",
    resourceId: id,
    context,
  });
}

/** Change a clock (707:793). New deadlines use it; deadlines already running keep their due time. */
export async function setClock(
  db: Database,
  actor: Actor,
  name: ClockName,
  duration: Duration,
  reason: string,
  context?: RequestContext,
) {
  if (!reason.trim()) throw new SystemError("Give a reason");
  await setSetting(db, actor, CLOCK_SETTINGS[name], duration, { reason: reason.trim(), context });
}

export async function clockValues(db: Executor) {
  return Promise.all(
    (Object.keys(CLOCKS) as ClockName[]).map(async (name) => ({
      name,
      label: CLOCKS[name].label,
      value: await getSetting(db, CLOCK_SETTINGS[name]),
      fallback: CLOCKS[name].duration,
    })),
  );
}

/** Integrations and their health (707:793): which are connected and which still run on the built-in fake. */
export function integrations() {
  const env = parseServerEnv();
  return [
    { name: "Payment partner", status: "Not connected (Launch 2, M3)" },
    { name: "Company and GSTIN checks", status: "Built-in fake (M4)" },
    { name: "Email", status: env.SMTP_HOST ? `SMTP ${env.SMTP_HOST}` : "Not set" },
    // Only the built-in fakes exist until M5 names the providers.
    { name: "SMS", status: `Built-in ${env.SMS_PROVIDER} (M5)` },
    { name: "WhatsApp", status: `Built-in ${env.WHATSAPP_PROVIDER} (M5)` },
    { name: "Maps", status: "Not chosen (M7): list view shown" },
    { name: "Datasheet reader", status: "Built-in fake (M8)" },
    { name: "Search", status: env.MEILI_HOST },
    { name: "File storage", status: env.S3_ENDPOINT },
    { name: "E-invoicing", status: "Not connected (Launch 2, M11)" },
  ];
}

export async function systemHealth(db: Executor, actor: Actor) {
  assertCan(actor, "settings.view");
  const failed = await listDeadLetters(db, actor);
  return { integrations: integrations(), failed };
}

// ------------------------------------------------------------------------------------------------ reports

export const REPORT_METRICS = [
  { key: "new_users", label: "New accounts" },
  { key: "new_companies", label: "New companies" },
  { key: "rfqs_sent", label: "RFQs sent to suppliers" },
  { key: "quotes_sent", label: "Quotes sent" },
  { key: "messages", label: "Messages" },
  { key: "live_listings", label: "Live listings", snapshot: true },
  { key: "verified_suppliers", label: "Verified suppliers", snapshot: true },
  { key: "subscribers", label: "Newsletter subscribers", snapshot: true },
  { key: "no_result_searches", label: "Searches with no results" },
] as const;

const istDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

/** Roll up one IST day (the nightly job runs it for yesterday). Running it again replaces the day. */
export async function rollUpReports(db: Database, day: string) {
  const from = new Date(`${day}T00:00:00+05:30`);
  const to = new Date(from.getTime() + 86_400_000);
  const between = (col: Parameters<typeof gte>[0]) => and(gte(col, from), lt(col, to));
  const n = sql<number>`count(*)::int`;
  const one = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const values: Record<string, number> = {
    new_users: await one(db.select({ n }).from(schema.users).where(between(schema.users.createdAt))),
    new_companies: await one(
      db.select({ n }).from(schema.organisations).where(between(schema.organisations.createdAt)),
    ),
    rfqs_sent: await one(db.select({ n }).from(schema.rfqs).where(between(schema.rfqs.sentAt))),
    quotes_sent: await one(db.select({ n }).from(schema.quoteVersions).where(between(schema.quoteVersions.sentAt))),
    messages: await one(db.select({ n }).from(schema.messages).where(between(schema.messages.createdAt))),
    live_listings: await one(
      db
        .select({ n })
        .from(schema.products)
        .where(and(eq(schema.products.status, "Live"), isNull(schema.products.deletedAt))),
    ),
    verified_suppliers: await one(
      db.select({ n }).from(schema.organisations).where(eq(schema.organisations.verification, "Verified")),
    ),
    subscribers: await one(
      db.select({ n }).from(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.status, "confirmed")),
    ),
    no_result_searches: await one(
      db.select({ n }).from(schema.searchMisses).where(between(schema.searchMisses.createdAt)),
    ),
  };
  for (const [metric, value] of Object.entries(values))
    await db
      .insert(schema.reportDaily)
      .values({ day, metric, value })
      .onConflictDoUpdate({ target: [schema.reportDaily.day, schema.reportDaily.metric], set: { value } });
  return values;
}

export async function rollUpYesterdayReports(db: Database, now = new Date()) {
  return rollUpReports(db, istDay(new Date(now.getTime() - 86_400_000)));
}

/** Reports overview (716:348): totals for the last `days` days against the days before, from the roll-ups. */
export async function reportsOverview(db: Executor, actor: Actor, days = 30, now = new Date()) {
  assertCan(actor, "reports.view");
  const end = istDay(now);
  const start = istDay(new Date(now.getTime() - days * 86_400_000));
  const before = istDay(new Date(now.getTime() - 2 * days * 86_400_000));
  const rows = await db
    .select()
    .from(schema.reportDaily)
    .where(and(gte(schema.reportDaily.day, before), lt(schema.reportDaily.day, end)));
  return REPORT_METRICS.map((m) => {
    const mine = rows.filter((r) => r.metric === m.key);
    const cur = mine.filter((r) => r.day >= start);
    const prev = mine.filter((r) => r.day < start);
    const total = (list: typeof rows) =>
      "snapshot" in m
        ? ([...list].sort((a, b) => a.day.localeCompare(b.day)).pop()?.value ?? 0)
        : list.reduce((a, r) => a + r.value, 0);
    return {
      key: m.key,
      label: m.label,
      value: total(cur),
      previous: total(prev),
      series: cur.map((r) => ({ day: r.day, value: r.value })),
    };
  });
}

export async function scheduleReport(
  db: Database,
  actor: Actor,
  input: { email: string; frequency: "weekly" | "monthly" },
  context?: RequestContext,
) {
  assertCan(actor, "reports.view");
  if (!actor.userId) throw new SystemError("Sign in again");
  if (!looksLikeEmail(input.email)) throw new SystemError("Enter an email address");
  const [row] = await db
    .insert(schema.reportSchedules)
    .values({ email: input.email.trim().toLowerCase(), frequency: input.frequency, createdBy: actor.userId })
    .returning();
  await audit(db, {
    actorId: actor.userId,
    action: "report.scheduled",
    resourceType: "report_schedule",
    resourceId: row?.id ?? "",
    after: input,
    context,
  });
  return row;
}

export async function reportSchedules(db: Executor, actor: Actor) {
  assertCan(actor, "reports.view");
  return db.select().from(schema.reportSchedules).orderBy(desc(schema.reportSchedules.createdAt));
}
