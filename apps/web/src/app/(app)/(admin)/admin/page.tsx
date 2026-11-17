import config from "@payload-config";
import { getDb } from "@h2india/core";
import { ageText, overviewTiles, slaBadge, type OverviewTile } from "@h2india/core/admin";
import { can } from "@h2india/core/authz";
import { clockDuration } from "@h2india/core/clocks";
import { buttonClasses, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import { INBOX_KINDS } from "@/admin/queues/data";
import { AdminShell, requireOperator } from "@/admin/shell";
import { publishingCalendar } from "@/cms/workflow";

// Overview (626:8), step 11.1: what needs a decision today across the queues this operator may see, with the age of
// the oldest item against the SLA clocks. Founder QC (17 Nov 2026): the week's publishing is a short card that opens
// Content → Calendar (the full calendar), and "Open CMS" moved to Content.
export const metadata: Metadata = { title: "Overview · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const IST = "Asia/Kolkata";
const hoursOf = (d: { hours?: number; days?: number; workingDays?: number }) =>
  d.hours ?? (d.days ?? d.workingDays ?? 0) * 24;
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(d);
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: IST, ...o }).format(d);

/** Monday 00:00 IST of the week containing `now`. */
function weekStart(now: Date) {
  const today = new Date(`${dayKey(now)}T00:00:00+05:30`);
  // 12:00 IST is the same calendar day in UTC, so getUTCDay() gives the IST weekday (Monday = 0 here).
  const weekday = (new Date(`${dayKey(now)}T12:00:00+05:30`).getUTCDay() + 6) % 7;
  return new Date(today.getTime() - weekday * 86_400_000);
}

export default async function OverviewPage() {
  const { userId, actor } = await requireOperator("overview.view", "/admin");
  const db = getDb();
  const now = new Date();
  const tiles: OverviewTile[] = await overviewTiles(db, actor, now);

  // Content submissions and inbox messages live in the CMS; each tile opens its native queue (founder QC, 17 Nov
  // 2026: they opened the raw CMS, and the corrections tile read a collection only editors fill).
  const showContent = can(actor, "content.view");
  const showQueues = can(actor, "queues.view");
  const payload = showContent || showQueues ? await getPayload({ config }) : null;
  const [amberD, redD] = await Promise.all([clockDuration(db, "queueAmber"), clockDuration(db, "queueRed")]);
  const amber = hoursOf(amberD);
  const red = hoursOf(redD);
  const age = (iso: string | null | undefined) => (iso ? (now.getTime() - new Date(iso).getTime()) / 3_600_000 : null);
  if (payload && showQueues) {
    const waiting = async (kinds: string[]) =>
      payload.find({
        collection: "submissions",
        where: { and: [{ status: { equals: "Under review" } }, { kind: { in: kinds } }] },
        sort: "createdAt",
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
    const [subs, inbox] = await Promise.all([waiting(["press_release", "pitch", "event"]), waiting([...INBOX_KINDS])]);
    const oldest = age(subs.docs[0]?.createdAt);
    tiles.push({
      key: "submissions",
      label: "Content submissions",
      count: subs.totalDocs,
      oldestHours: oldest,
      ...slaBadge(oldest, amber, red),
      line: oldest === null ? "Nothing waiting" : `Oldest waiting ${ageText(oldest)} · review within 1 working day`,
      href: "/admin/queues/content",
    });
    const io = age(inbox.docs[0]?.createdAt);
    tiles.push({
      key: "inbox",
      label: "Inbox: corrections and messages",
      count: inbox.totalDocs,
      oldestHours: io,
      ...slaBadge(io, amber, red),
      line: io === null ? "Nothing waiting" : `Oldest waiting ${ageText(io)}`,
      href: "/admin/queues/inbox",
    });
  }

  // This week's publishing, as two numbers; the full calendar is Content → Calendar (founder QC, 17 Nov 2026).
  const from = weekStart(now);
  const to = new Date(from.getTime() + 7 * 86_400_000);
  let scheduled = 0;
  let waitingArticles = 0;
  if (payload && showContent) {
    for (const a of await publishingCalendar(payload, from, to)) {
      const at = a.at ? new Date(a.at) : null;
      if (at && at >= from && at < to) scheduled += 1;
      else waitingArticles += 1;
    }
  }

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
          aria-labelledby="this-week"
          className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-default bg-page p-5"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-pill bg-mint">
              <Icon name="calendar" size={20} />
            </span>
            <div>
              <h2 id="this-week" className="type-h4">
                Publishing this week
              </h2>
              <p className="type-body-sm text-secondary">
                {scheduled} scheduled · {waitingArticles} waiting for review or a legal check
              </p>
            </div>
          </div>
          <Link href="/admin/content/calendar" className={buttonClasses({ variant: "outline", size: "sm" })}>
            Open calendar
            <Icon name="arrow-right" size={16} />
          </Link>
        </section>
      ) : null}
    </AdminShell>
  );
}
