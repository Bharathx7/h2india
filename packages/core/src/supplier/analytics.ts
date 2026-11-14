import { schema, type Database, type Executor } from "@h2india/db";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Actor } from "../authz/actor";
import { inScope, type Scope } from "../authz/scope";
import { istDate } from "../time";

// Supplier analytics (step 8.8; 814:12112): first-party events, rolled up nightly by IST day. Recording keeps no
// person: the type, the listing or company, and the viewer company's state. Operators and the supplier's own team
// aren't counted. Reading combines the roll-up for past days with today's raw events, so numbers match the raw counts.

const e = schema.analyticsEvents;
const d = schema.analyticsDaily;

export const EVENT_TYPES = ["listing_viewed", "profile_viewed", "saved", "compared", "quote_requested"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Records one event. Returns false when it isn't counted (operator, own team, unknown listing). */
export async function recordEvent(
  db: Executor,
  input: { type: EventType; productId?: string; organisationId?: string; viewer: Actor | null },
): Promise<boolean> {
  let organisationId = input.organisationId;
  if (input.productId) {
    const [p] = await db
      .select({ org: schema.products.organisationId, status: schema.products.status })
      .from(schema.products)
      .where(eq(schema.products.id, input.productId));
    if (!p || p.status !== "Live") return false;
    organisationId = p.org;
  }
  if (!organisationId) return false;
  const v = input.viewer;
  if (v && (v.operator.size > 0 || v.companies.has(organisationId))) return false;
  let viewerState: string | null = null;
  const company = v ? [...v.companies.keys()][0] : undefined;
  if (company) {
    const [o] = await db
      .select({ state: schema.organisations.state })
      .from(schema.organisations)
      .where(eq(schema.organisations.id, company));
    viewerState = o?.state ?? null;
  }
  await db.insert(e).values({ type: input.type, organisationId, productId: input.productId ?? null, viewerState });
  return true;
}

/** A member saved a listing (by its address). */
export async function recordSaveBySlug(db: Executor, viewer: Actor | null, slug: string) {
  const [p] = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.slug, slug));
  return p ? recordEvent(db, { type: "saved", productId: p.id, viewer }) : false;
}

const istMidnight = (day: string) => new Date(`${day}T00:00:00+05:30`);

/** The nightly roll-up for one IST day (safe to run again: it replaces that day's rows). */
export async function rollUpDay(db: Database, day: string): Promise<number> {
  const from = istMidnight(day);
  const to = new Date(from.getTime() + 86_400_000);
  return db.transaction(async (tx) => {
    await tx.delete(d).where(eq(d.day, day));
    const rows = await tx
      .select({
        organisationId: e.organisationId,
        productId: sql<string>`coalesce(${e.productId}::text, '')`,
        type: e.type,
        viewerState: sql<string>`coalesce(${e.viewerState}, '')`,
        count: sql<number>`count(*)::int`,
      })
      .from(e)
      .where(and(gte(e.at, from), lt(e.at, to)))
      .groupBy(e.organisationId, sql`coalesce(${e.productId}::text, '')`, e.type, sql`coalesce(${e.viewerState}, '')`);
    if (rows.length) await tx.insert(d).values(rows.map((r) => ({ ...r, day })));
    return rows.length;
  });
}

/** Yesterday (IST), for the nightly schedule. */
export async function rollUpYesterday(db: Database, now: Date = new Date()) {
  return rollUpDay(db, istDate(new Date(now.getTime() - 86_400_000)));
}

interface Counted {
  productId: string;
  type: string;
  viewerState: string;
  count: number;
}

/** Counts for a window of IST days [from, to): rolled-up days plus today's raw events. */
async function counts(
  db: Executor,
  scope: Scope,
  organisationId: string,
  fromDay: string,
  toDay: string,
  today: string,
): Promise<Counted[]> {
  const past = await db
    .select({ productId: d.productId, type: d.type, viewerState: d.viewerState, count: d.count })
    .from(d)
    .where(
      and(
        inScope(scope, d.organisationId),
        eq(d.organisationId, organisationId),
        gte(d.day, fromDay),
        lt(d.day, toDay < today ? toDay : today),
      ),
    );
  if (toDay <= today) return past;
  const raw = await db
    .select({
      productId: sql<string>`coalesce(${e.productId}::text, '')`,
      type: e.type,
      viewerState: sql<string>`coalesce(${e.viewerState}, '')`,
      count: sql<number>`count(*)::int`,
    })
    .from(e)
    .where(and(inScope(scope, e.organisationId), eq(e.organisationId, organisationId), gte(e.at, istMidnight(today))))
    .groupBy(sql`coalesce(${e.productId}::text, '')`, e.type, sql`coalesce(${e.viewerState}, '')`);
  return [...past, ...raw];
}

const sum = (rows: Counted[], test: (r: Counted) => boolean) => rows.filter(test).reduce((n, r) => n + r.count, 0);
const isView = (r: Counted) => r.type === "listing_viewed" || r.type === "profile_viewed";

/** Analytics · last 30 days (814:12112), compared with the 30 days before. Company-scoped. */
export async function supplierAnalytics(db: Executor, scope: Scope, organisationId: string, now: Date = new Date()) {
  const today = istDate(now);
  const day = (n: number) => istDate(new Date(istMidnight(today).getTime() + n * 86_400_000));
  const current = await counts(db, scope, organisationId, day(-29), day(1), today);
  const previous = await counts(db, scope, organisationId, day(-59), day(-29), today);
  const q = schema.productQuestions;
  const enquiries = async (from: string, to: string) =>
    db
      .select({ productId: q.productId, n: sql<number>`count(*)::int` })
      .from(q)
      .where(
        and(
          inScope(scope, q.organisationId),
          eq(q.organisationId, organisationId),
          gte(q.createdAt, istMidnight(from)),
          lt(q.createdAt, istMidnight(to)),
        ),
      )
      .groupBy(q.productId);
  const [enqNow, enqBefore] = await Promise.all([enquiries(day(-29), day(1)), enquiries(day(-59), day(-29))]);
  const views = sum(current, isView);
  const viewsBefore = sum(previous, isView);
  const products = await db
    .select({ id: schema.products.id, name: schema.products.name, model: schema.products.model })
    .from(schema.products)
    .where(and(inScope(scope, schema.products.organisationId), eq(schema.products.organisationId, organisationId)));
  const top = products
    .map((p) => ({
      id: p.id,
      name: [p.model, p.name].filter(Boolean).join(" "),
      views: sum(current, (r) => r.productId === p.id && r.type === "listing_viewed"),
      saves: sum(current, (r) => r.productId === p.id && r.type === "saved"),
      enquiries: enqNow.find((x) => x.productId === p.id)?.n ?? 0,
      rfqs: sum(current, (r) => r.productId === p.id && r.type === "quote_requested"),
    }))
    .filter((p) => p.views || p.enquiries || p.saves)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  const byState = new Map<string, number>();
  for (const r of current.filter(isView))
    byState.set(r.viewerState || "Other states", (byState.get(r.viewerState || "Other states") ?? 0) + r.count);
  const states = [...byState.entries()]
    .map(([state, n]) => ({ state, share: views ? Math.round((n / views) * 100) : 0 }))
    .sort((a, b) => (a.state === "Other states" ? 1 : b.state === "Other states" ? -1 : b.share - a.share));
  return {
    from: day(-29),
    to: today,
    views,
    viewsChange: viewsBefore ? Math.round(((views - viewsBefore) / viewsBefore) * 100) : null,
    enquiries: enqNow.reduce((n, x) => n + x.n, 0),
    enquiriesChange: enqNow.reduce((n, x) => n + x.n, 0) - enqBefore.reduce((n, x) => n + x.n, 0),
    rfqs: sum(current, (r) => r.type === "quote_requested"),
    saves: sum(current, (r) => r.type === "saved"),
    compared: sum(current, (r) => r.type === "compared"),
    storefrontViews: sum(current, (r) => r.type === "profile_viewed"),
    top,
    states,
  };
}
