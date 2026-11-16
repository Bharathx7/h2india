import { isEnabled } from "@h2india/config";
import { schema, type Executor } from "@h2india/db";
import { and, asc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import type { Actor } from "../authz/actor";
import type { OperatorPermission } from "../authz/catalogue";
import { can } from "../authz/can";
import { clockDuration } from "../clocks/clocks";

// Overview (626:8), step 11.1: what needs a decision today, across the queues the operator may see. Each tile counts
// the same records its queue lists, and its badge compares the oldest item's age with the queueAmber and queueRed
// clocks (24 and 48 hours, System settings 707:793). Orders stay out while transactions are off.

export type SlaTone = "success" | "warning" | "error";

export interface OverviewTile {
  key: string;
  label: string;
  count: number;
  /** Age of the oldest waiting item, in hours. */
  oldestHours: number | null;
  tone: SlaTone;
  badge: string;
  line: string;
  href: string;
}

const hoursOf = (d: { hours?: number; days?: number; workingDays?: number }) =>
  d.hours ?? (d.days ?? d.workingDays ?? 0) * 24;

export function ageText(hours: number): string {
  if (hours < 1) return `${String(Math.max(1, Math.round(hours * 60)))} min`;
  if (hours < 24) return `${String(Math.floor(hours))} h`;
  const days = Math.floor(hours / 24);
  const rest = Math.floor(hours % 24);
  return `${String(days)} ${days === 1 ? "day" : "days"}${rest ? ` ${String(rest)} h` : ""}`;
}

/** The badge for a tile: within the SLA, close to it (amber) or past it (red). Pure: unit-tested. */
export function slaBadge(
  oldestHours: number | null,
  amberHours: number,
  redHours: number,
): { tone: SlaTone; badge: string } {
  if (oldestHours === null) return { tone: "success", badge: "Nothing waiting" };
  if (oldestHours >= redHours) return { tone: "error", badge: "Past SLA" };
  if (oldestHours >= amberHours) return { tone: "warning", badge: `Over ${String(amberHours)} h` };
  return { tone: "success", badge: "Within SLA" };
}

/** Which admin sidebar items this operator may open (626:8 groups). Commerce stays hidden while transactions are off. */
export function adminAreas(actor: Actor, flags?: Record<string, string | undefined>) {
  // The operator set directly: some names ("money.view") are also company permissions, which can() checks per company.
  const v = (p: OperatorPermission) => actor.userId !== null && actor.operator.has(p);
  const commerce = isEnabled("transactions", flags);
  return {
    overview: v("overview.view"),
    queues: v("queues.view"),
    content: v("content.view"),
    catalogue: v("catalogue.view"),
    verification: v("verification.view"),
    orders: commerce && v("orders.view"),
    money: commerce && v("money.view"),
    users: v("users.view"),
    compliance: v("compliance.view"),
    reports: v("reports.view"),
    settings: v("settings.view"),
  };
}

/** The tiles drawn from the core tables. Content submissions and corrections live in the CMS and are added by the page. */
export async function overviewTiles(db: Executor, actor: Actor, now: Date = new Date()): Promise<OverviewTile[]> {
  const [amberD, redD] = await Promise.all([clockDuration(db, "queueAmber"), clockDuration(db, "queueRed")]);
  const amber = hoursOf(amberD);
  const red = hoursOf(redD);
  const age = (d: Date | null) => (d ? (now.getTime() - d.getTime()) / 3_600_000 : null);
  const tile = (t: Omit<OverviewTile, "tone" | "badge">): OverviewTile => ({
    ...t,
    ...slaBadge(t.oldestHours, amber, red),
  });
  const tiles: OverviewTile[] = [];

  if (can(actor, "verification.view")) {
    const rows = await db
      .select({ at: schema.supplierReviews.submittedAt })
      .from(schema.supplierReviews)
      .where(eq(schema.supplierReviews.status, "Submitted"))
      .orderBy(asc(schema.supplierReviews.submittedAt));
    const oldest = age(rows[0]?.at ?? null);
    tiles.push(
      tile({
        key: "suppliers",
        label: "Suppliers pending review",
        count: rows.length,
        oldestHours: oldest,
        line:
          oldest === null
            ? "No supplier is waiting"
            : `Oldest waiting ${ageText(oldest)} · review within 2 working days`,
        href: "/admin/verification",
      }),
    );
  }

  if (can(actor, "queues.view")) {
    const pr = schema.productRevisions;
    const listings = await db
      .select({ at: pr.submittedAt })
      .from(pr)
      .where(eq(pr.status, "In review"))
      .orderBy(asc(pr.submittedAt));
    const lo = age(listings[0]?.at ?? null);
    tiles.push(
      tile({
        key: "listings",
        label: "Products pending review",
        count: listings.length,
        oldestHours: lo,
        line: lo === null ? "No listing is waiting" : `Oldest waiting ${ageText(lo)} · red after ${String(red)} h`,
        href: "/admin/queues/listings",
      }),
    );

    const r = schema.rfqs;
    const moderation = await db
      .select({ at: r.submittedAt })
      .from(r)
      .where(and(eq(r.status, "In moderation"), isNull(r.deletedAt)))
      .orderBy(asc(r.submittedAt));
    const mo = age(moderation[0]?.at ?? null);
    tiles.push(
      tile({
        key: "rfqs",
        label: "RFQs in moderation",
        count: moderation.length,
        oldestHours: mo,
        line: mo === null ? "No RFQ is waiting" : `Oldest waiting ${ageText(mo)} · moderate within 1 working day`,
        href: "/admin/queues/rfqs",
      }),
    );

    // Supplier QC, 16 Nov 2026: categories suppliers asked for.
    const cr = schema.categoryRequests;
    const asked = await db
      .select({ at: cr.createdAt })
      .from(cr)
      .where(eq(cr.status, "Pending"))
      .orderBy(asc(cr.createdAt));
    const co = age(asked[0]?.at ?? null);
    tiles.push(
      tile({
        key: "categories",
        label: "Category requests",
        count: asked.length,
        oldestHours: co,
        line: co === null ? "No request is waiting" : `Oldest waiting ${ageText(co)} · review within 2 working days`,
        href: "/admin/queues/categories",
      }),
    );

    // Open RFQs where a chosen supplier has neither quoted nor declined a day after it went out.
    const cutoff = new Date(now.getTime() - amber * 3_600_000);
    const rs = schema.rfqSuppliers;
    const unanswered = await db
      .select({ reference: r.reference, sentAt: r.sentAt })
      .from(r)
      .innerJoin(rs, eq(rs.rfqId, r.id))
      .where(
        and(
          inArray(r.status, ["Sent", "Quotes received"]),
          lt(r.sentAt, cutoff),
          inArray(rs.status, ["Sent", "Viewed"]),
          sql`(${r.offerDeadline} is null or ${r.offerDeadline} > ${now})`,
        ),
      )
      .orderBy(asc(r.sentAt));
    const refs = [...new Set(unanswered.map((u) => u.reference))];
    const uo = age(unanswered[0]?.sentAt ?? null);
    tiles.push({
      key: "unanswered",
      label: `RFQs unanswered over ${String(amber)} h`,
      count: refs.length,
      oldestHours: uo,
      ...(refs.length
        ? { tone: "error" as const, badge: "Past SLA" }
        : { tone: "success" as const, badge: "Nothing waiting" }),
      line:
        refs.length && uo !== null
          ? `${refs[0] ?? ""} has no quote after ${ageText(uo)}`
          : "Every open RFQ has an answer",
      href: "/admin/queues/rfqs",
    });
  }
  return tiles;
}

/** Counts on the admin sidebar (626:8): items waiting in Queues (listings, RFQs and category requests) and Verification. */
export async function adminCounts(db: Executor): Promise<Partial<Record<string, number>>> {
  const n = sql<number>`count(*)::int`;
  const [listings, rfqs, reviews, categories] = await Promise.all([
    db.select({ n }).from(schema.productRevisions).where(eq(schema.productRevisions.status, "In review")),
    db
      .select({ n })
      .from(schema.rfqs)
      .where(and(eq(schema.rfqs.status, "In moderation"), isNull(schema.rfqs.deletedAt))),
    db.select({ n }).from(schema.supplierReviews).where(eq(schema.supplierReviews.status, "Submitted")),
    db.select({ n }).from(schema.categoryRequests).where(eq(schema.categoryRequests.status, "Pending")),
  ]);
  return {
    queues: (listings[0]?.n ?? 0) + (rfqs[0]?.n ?? 0) + (categories[0]?.n ?? 0),
    verification: reviews[0]?.n ?? 0,
  };
}
