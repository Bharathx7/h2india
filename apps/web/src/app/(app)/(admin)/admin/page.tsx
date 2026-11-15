import config from "@payload-config";
import { getDb } from "@h2india/core";
import { ageText, overviewTiles, slaBadge, type OverviewTile } from "@h2india/core/admin";
import { can } from "@h2india/core/authz";
import { clockDuration } from "@h2india/core/clocks";
import { buttonClasses, cx, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import { AdminShell, requireOperator } from "@/admin/shell";
import { ARTICLE_TYPES } from "@/cms/types";
import { publishingCalendar } from "@/cms/workflow";

// Overview (626:8), step 11.1: what needs a decision today across the queues this operator may see, with the age of
// the oldest item against the SLA clocks, and the week's publishing calendar. ?week=-1|1 moves the calendar.
export const metadata: Metadata = { title: "Overview · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const IST = "Asia/Kolkata";
const hoursOf = (d: { hours?: number; days?: number; workingDays?: number }) =>
  d.hours ?? (d.days ?? d.workingDays ?? 0) * 24;
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(d);
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: IST, ...o }).format(d);

/** Monday 00:00 IST of the week containing `now`, moved by `offset` weeks. */
function weekStart(now: Date, offset: number) {
  const today = new Date(`${dayKey(now)}T00:00:00+05:30`);
  // 12:00 IST is the same calendar day in UTC, so getUTCDay() gives the IST weekday (Monday = 0 here).
  const weekday = (new Date(`${dayKey(now)}T12:00:00+05:30`).getUTCDay() + 6) % 7;
  return new Date(today.getTime() - weekday * 86_400_000 + offset * 7 * 86_400_000);
}

const TONE: Record<string, "success" | "progress" | "warning" | "neutral"> = {
  Sent: "success",
  Published: "success",
  Scheduled: "progress",
  "In review": "neutral",
  "Legal check": "warning",
};

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("overview.view", "/admin");
  const db = getDb();
  const now = new Date();
  const tiles: OverviewTile[] = await overviewTiles(db, actor, now);

  // Content submissions and corrections live in the CMS.
  const showContent = can(actor, "content.view");
  const payload = showContent || can(actor, "compliance.view") ? await getPayload({ config }) : null;
  const [amberD, redD] = await Promise.all([clockDuration(db, "queueAmber"), clockDuration(db, "queueRed")]);
  const amber = hoursOf(amberD);
  const red = hoursOf(redD);
  const age = (iso: string | null | undefined) => (iso ? (now.getTime() - new Date(iso).getTime()) / 3_600_000 : null);
  if (payload && showContent) {
    const subs = await payload.find({
      collection: "submissions",
      where: { status: { equals: "Under review" } },
      sort: "createdAt",
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const oldest = age(subs.docs[0]?.createdAt);
    tiles.push({
      key: "submissions",
      label: "Content submissions",
      count: subs.totalDocs,
      oldestHours: oldest,
      ...slaBadge(oldest, amber, red),
      line: oldest === null ? "Nothing waiting" : `Oldest waiting ${ageText(oldest)} · review within 1 working day`,
      href: "/cms/collections/submissions",
    });
  }
  if (payload && (can(actor, "compliance.view") || showContent)) {
    const corr = await payload.find({
      collection: "corrections",
      where: { status: { equals: "Open" } },
      sort: "createdAt",
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const oldest = age(corr.docs[0]?.createdAt);
    const left = oldest === null ? null : amber - oldest;
    tiles.push({
      key: "corrections",
      label: "Corrections requests",
      count: corr.totalDocs,
      oldestHours: oldest,
      ...(oldest === null
        ? { tone: "success" as const, badge: "Nothing waiting" }
        : left !== null && left > 0
          ? { tone: "warning" as const, badge: "Due today" }
          : { tone: "error" as const, badge: "Past SLA" }),
      line:
        oldest === null
          ? "Nothing waiting"
          : `Acknowledge within ${String(amber)} h · ${left !== null && left > 0 ? `${ageText(left)} left` : "overdue"}`,
      href: "/cms/collections/corrections",
    });
  }

  // The publishing calendar: articles (scheduled, published, in review, legal check) and newsletter issues sent.
  const offset = Math.max(-52, Math.min(52, Number(sp.week ?? 0) || 0));
  const from = weekStart(now, offset);
  const to = new Date(from.getTime() + 7 * 86_400_000);
  const items: { day: string; at: Date | null; kind: string; title: string; status: string }[] = [];
  if (payload && showContent) {
    const articles = await publishingCalendar(payload, from, to);
    for (const a of articles) {
      const at = a.at ? new Date(a.at) : null;
      const inWeek = at && at >= from && at < to;
      // Items in review or legal check without a date show today (this week only).
      const day = inWeek ? dayKey(at) : offset === 0 ? dayKey(now) : "";
      if (!day) continue;
      items.push({
        day,
        at: inWeek ? at : null,
        kind: ARTICLE_TYPES.find((t) => t.value === a.type)?.label ?? "Article",
        title: a.title,
        status: a.status,
      });
    }
    const issues = await payload.find({
      collection: "newsletter-issues",
      where: {
        and: [{ sentOn: { greater_than_equal: from.toISOString() } }, { sentOn: { less_than: to.toISOString() } }],
      },
      depth: 0,
      limit: 50,
      overrideAccess: true,
    });
    for (const i of issues.docs) {
      const at = new Date(i.sentOn);
      items.push({ day: dayKey(at), at, kind: "Newsletter", title: i.title, status: at <= now ? "Sent" : "Scheduled" });
    }
  }
  const days = Array.from({ length: 7 }, (_, n) => new Date(from.getTime() + n * 86_400_000));
  const today = dayKey(now);

  return (
    <AdminShell userId={userId} current="/admin" title="Overview">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">Overview</h1>
          <p className="type-body-sm text-secondary">
            What needs a decision today. Tiles turn amber close to the SLA and red once it&apos;s passed.
          </p>
        </div>
        <p className="type-caption text-secondary">
          {fmt(now, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} ·{" "}
          {fmt(now, { hour: "numeric", minute: "2-digit" })} IST
        </p>
      </div>
      {tiles.length ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tiles.map((t) => (
            <li key={t.key} className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
              <h2 className="type-body-sm">{t.label}</h2>
              <p className="flex items-center gap-2">
                <span className="type-h2">{t.count}</span>
                <StatusBadge status={t.badge} tone={t.tone} />
              </p>
              <p className="type-caption text-secondary">{t.line}</p>
              <Link href={t.href} className="mt-auto inline-flex items-center gap-1 type-label text-link">
                Open queue
                <span className="sr-only"> for {t.label.toLowerCase()}</span>
                <Icon name="arrow-right" size={16} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="type-body-sm text-secondary">Your role has no queues. Use the sidebar to open your areas.</p>
      )}
      {showContent ? (
        <section
          className="flex flex-col gap-4 rounded-card border border-default bg-page p-5"
          aria-labelledby="calendar"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="calendar" className="type-h4">
                Publishing calendar
              </h2>
              <p className="type-caption text-secondary">
                {offset === 0 ? "This week" : offset < 0 ? "Earlier" : "Later"} · {fmt(from, { day: "numeric" })}–
                {fmt(new Date(to.getTime() - 1), { day: "numeric", month: "short" })} · times in IST
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin?week=${String(offset - 1)}`}
                className={buttonClasses({ variant: "outline", size: "sm" })}
                aria-label="Previous week"
              >
                <Icon name="chevron-left" size={16} />
              </Link>
              <Link
                href={`/admin?week=${String(offset + 1)}`}
                className={buttonClasses({ variant: "outline", size: "sm" })}
                aria-label="Next week"
              >
                <Icon name="chevron-right" size={16} />
              </Link>
              <Link href="/cms" className={buttonClasses({ variant: "outline", size: "sm" })}>
                Open CMS
              </Link>
            </div>
          </div>
          <ol className="grid grid-cols-7 gap-2">
            {days.map((d) => {
              const key = dayKey(d);
              const mine = items
                .filter((i) => i.day === key)
                .sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0));
              return (
                <li
                  key={key}
                  className={cx(
                    "flex min-h-60 flex-col gap-2 rounded-card p-2",
                    key === today ? "bg-mint" : "bg-subtle",
                  )}
                >
                  <p className="type-eyebrow">
                    {fmt(d, { weekday: "short" })} <span className="type-label">{fmt(d, { day: "numeric" })}</span>
                    {key === today ? " · today" : ""}
                  </p>
                  {mine.length ? (
                    mine.map((i) => (
                      <div key={`${i.title}${i.kind}`} className="flex flex-col gap-1 rounded-input bg-page p-2">
                        <p className="type-caption text-secondary">
                          {i.at ? `${fmt(i.at, { hour: "numeric", minute: "2-digit" })} · ` : ""}
                          {i.kind}
                        </p>
                        <p className="type-label-sm">{i.title}</p>
                        <StatusBadge status={i.status} tone={TONE[i.status] ?? "neutral"} />
                      </div>
                    ))
                  ) : (
                    <p className="type-caption text-secondary">Nothing scheduled</p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </AdminShell>
  );
}
