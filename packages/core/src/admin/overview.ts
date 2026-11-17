import { isEnabled } from "@h2india/config";
import { schema, type Executor } from "@h2india/db";
import { and, asc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import type { Actor } from "../authz/actor";
import type { OperatorPermission } from "../authz/catalogue";
import { assertCan, can } from "../authz/can";
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
        // The Suppliers queue lists exactly these reviews; the desk's Needs action also holds documents.
        href: "/admin/queues/suppliers",
      }),
    );
  }

  if (can(actor, "queues.view")) {
    const pr = schema.productRevisions;
    // As the Listings queue: a product the supplier deleted isn't waiting any more.
    const listings = await db
      .select({ at: pr.submittedAt })
      .from(pr)
      .innerJoin(schema.products, eq(schema.products.id, pr.productId))
      .where(and(eq(pr.status, "In review"), isNull(schema.products.deletedAt)))
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
    const unanswered = await unansweredRfqs(db, actor, now);
    const refs = unanswered.map((u) => u.reference);
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
      // Founder QC (17 Nov 2026): this opened the moderation queue, which never lists these RFQs.
      href: "/admin/queues/rfqs/unanswered",
    });
  }
  return tiles;
}

export interface UnansweredRfq {
  id: string;
  reference: string;
  title: string;
  buyer: string;
  sentAt: Date | null;
  /** Chosen suppliers that have neither quoted nor declined. */
  waitingOn: string[];
}

/**
 * Open RFQs where a chosen supplier has neither quoted nor declined once the queueAmber clock has passed since it went
 * out (and the offer deadline hasn't), oldest first: the Overview tile and its list.
 */
export async function unansweredRfqs(db: Executor, actor: Actor, now: Date = new Date()): Promise<UnansweredRfq[]> {
  assertCan(actor, "queues.view");
  const amber = hoursOf(await clockDuration(db, "queueAmber"));
  const cutoff = new Date(now.getTime() - amber * 3_600_000);
  const r = schema.rfqs;
  const rs = schema.rfqSuppliers;
  const rows = await db
    .select({
      id: r.id,
      reference: r.reference,
      title: r.title,
      sentAt: r.sentAt,
      buyer: sql<string>`(select coalesce(cp.trade_name, o.legal_name) from core.organisations o
        left join core.company_profiles cp on cp.organisation_id = o.id where o.id = ${r.organisationId})`,
      supplier: sql<string>`(select coalesce(cp.trade_name, o.legal_name) from core.organisations o
        left join core.company_profiles cp on cp.organisation_id = o.id where o.id = ${rs.organisationId})`,
    })
    .from(r)
    .innerJoin(rs, eq(rs.rfqId, r.id))
    .where(
      and(
        inArray(r.status, ["Sent", "Quotes received"]),
        isNull(r.deletedAt),
        lt(r.sentAt, cutoff),
        inArray(rs.status, ["Sent", "Viewed"]),
        sql`(${r.offerDeadline} is null or ${r.offerDeadline} > ${now})`,
      ),
    )
    .orderBy(asc(r.sentAt));
  const out = new Map<string, UnansweredRfq>();
  for (const x of rows) {
    const one = out.get(x.id) ?? {
      id: x.id,
      reference: x.reference,
      title: x.title,
      buyer: x.buyer,
      sentAt: x.sentAt,
      waitingOn: [],
    };
    one.waitingOn.push(x.supplier);
    out.set(x.id, one);
  }
  return [...out.values()];
}

/**
 * Counts on the admin sidebar (626:8). Founder QC (17 Nov 2026): each matches its page. Queues = every queue tab held
 * in core tables (suppliers, listings with storefront changes, RFQs, category requests); the web app adds the tabs that
 * live in the CMS (content, events, jobs, inbox). Verification = the desk's Needs action companies plus profile claims.
 */
export async function adminCounts(db: Executor): Promise<Partial<Record<string, number>>> {
  const n = sql<number>`count(*)::int`;
  const pr = schema.productRevisions;
  const [listings, storefronts, rfqs, reviews, categories, desk, claims] = await Promise.all([
    db
      .select({ n })
      .from(pr)
      .innerJoin(schema.products, eq(schema.products.id, pr.productId))
      .where(and(eq(pr.status, "In review"), isNull(schema.products.deletedAt))),
    db.select({ n }).from(schema.storefrontRevisions).where(eq(schema.storefrontRevisions.status, "In review")),
    db
      .select({ n })
      .from(schema.rfqs)
      .where(and(eq(schema.rfqs.status, "In moderation"), isNull(schema.rfqs.deletedAt))),
    db.select({ n }).from(schema.supplierReviews).where(eq(schema.supplierReviews.status, "Submitted")),
    db.select({ n }).from(schema.categoryRequests).where(eq(schema.categoryRequests.status, "Pending")),
    db.execute<{ n: number }>(sql`
      select count(*)::int as n from (
        select organisation_id from core.supplier_reviews where status = 'Submitted'
        union select organisation_id from core.verification_documents where status = 'Submitted' and deleted_at is null
        union select organisation_id from core.payout_bank_accounts where status = 'Held'
      ) x`),
    db.select({ n }).from(schema.companyClaims).where(eq(schema.companyClaims.status, "Pending")),
  ]);
  const one = (r: { n: number }[]) => r[0]?.n ?? 0;
  return {
    queues: one(listings) + one(storefronts) + one(rfqs) + one(reviews) + one(categories),
    verification: (desk.rows[0]?.n ?? 0) + one(claims),
  };
}
