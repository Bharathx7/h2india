import { getDb } from "@h2india/core";
import { reportSchedules, reportsOverview } from "@h2india/core/admin/system";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { buttonClasses, cx, EmptyState, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { CancelReport, ScheduleReport } from "@/admin/system/Controls";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";
import { PERIODS, REPORT_DOWNLOADS } from "./report-groups";

// Reports overview (716:348), step 11.8: Audience, Marketplace, Content output and Download a report, for the chosen
// period against the one before, from the nightly roll-ups only (report_daily). A figure that isn't rolled up yet
// (site analytics, alert subscribers, orders, content counts) shows "—" with the reason, never a made-up number.
export const metadata: Metadata = { title: "Reports · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

type Metric = Awaited<ReturnType<typeof reportsOverview>>[number];

interface Tile {
  label: string;
  value: string;
  note: string;
  tone?: "up" | "down";
}

const n = (x: number) => x.toLocaleString("en-IN");

function tileOf(m: Metric | undefined, label: string, days: number, snapshot: boolean): Tile {
  if (!m?.series.length) return { label, value: "—", note: "Appears after the nightly roll-up" };
  const diff = m.value - m.previous;
  const note = snapshot
    ? `${diff >= 0 ? "+" : "−"}${n(Math.abs(diff))} in the last ${String(days)} days`
    : m.previous
      ? `${diff >= 0 ? "+" : "−"}${String(Math.abs(Math.round((diff / m.previous) * 100)))}% vs the ${String(days)} days before`
      : "Nothing to compare yet";
  return { label, value: n(m.value), note, tone: diff > 0 ? "up" : diff < 0 ? "down" : undefined };
}

function Tiles({ tiles, cols }: { tiles: Tile[]; cols: string }) {
  return (
    <ul className={cx("grid gap-3", cols)}>
      {tiles.map((t) => (
        <li key={t.label} className="flex flex-col gap-1 rounded-card bg-subtle p-4">
          <span className="type-caption text-secondary">{t.label}</span>
          <span className="type-h3">{t.value}</span>
          <span
            className={cx(
              "type-caption",
              t.tone === "up" ? "text-success" : t.tone === "down" ? "text-error" : "text-secondary",
            )}
          >
            {t.note}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
      <div>
        <h2 className="type-h4">{title}</h2>
        <p className="type-caption text-secondary">{intro}</p>
      </div>
      {children}
    </section>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("reports.view", "/admin/reports");
  const days = PERIODS.find((p) => String(p.days) === sp.days)?.days ?? 30;
  const db = getDb();
  const [metrics, allSchedules] = await Promise.all([reportsOverview(db, actor, days), reportSchedules(db, actor)]);
  const schedulesPage = pageOf(allSchedules, pageRequest(sp, "schedules"));
  const schedules = schedulesPage.rows;
  const m = (key: string) => metrics.find((x) => x.key === key);
  const anyData = metrics.some((x) => x.series.length);
  const today = new Date();
  const asOf = formatIstDate(new Date(today.getTime() - 86_400_000));
  const none = (label: string, note: string): Tile => ({ label, value: "—", note });

  return (
    <AdminShell userId={userId} current="/admin/reports" title="Reports">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="type-h2">Reports</h1>
          <p className="type-body-sm text-secondary">
            How H2 Economy is doing across audience, marketplace and content. Pick the dates once and every section
            follows.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Dates" className="flex gap-1 rounded-pill border-[1.5px] border-control bg-page p-1">
            {PERIODS.map((p) => (
              <Link
                key={p.days}
                href={`/admin/reports?days=${String(p.days)}`}
                aria-current={p.days === days ? "page" : undefined}
                className={cx(
                  "inline-flex h-8 items-center rounded-pill px-3 type-label",
                  p.days === days ? "bg-inverse text-inverse" : "text-body",
                )}
              >
                {p.label}
              </Link>
            ))}
          </nav>
          <span className="type-caption text-secondary">vs the {days} days before</span>
          <ScheduleReport />
          <a
            href={`/admin/reports/export?days=${String(days)}`}
            className={buttonClasses({ variant: "outline" })}
            download
          >
            <Icon name="download" size={16} />
            Export all
          </a>
        </div>
      </div>

      {!anyData ? (
        <div className="rounded-card border border-default bg-page">
          <EmptyState title="No figures yet">
            The first figures appear after tonight&apos;s roll-up, at 00:40 IST.
          </EmptyState>
        </div>
      ) : null}

      <Card title="Audience" intro={`Visitors from site analytics. Subscriber and member counts are at ${asOf}.`}>
        <Tiles
          cols="md:grid-cols-2 xl:grid-cols-4"
          tiles={[
            none("Website visitors", "When site analytics is connected (M10)"),
            tileOf(m("subscribers"), "Newsletter subscribers", days, true),
            none("Alert subscribers", "Not in the nightly figures yet"),
            tileOf(m("new_users"), "New accounts", days, false),
          ]}
        />
      </Card>

      <Card title="Marketplace" intro="Order value is before GST. RFQ figures count requests that passed moderation.">
        <Tiles
          cols="md:grid-cols-3"
          tiles={[
            tileOf(m("verified_suppliers"), "Verified suppliers", days, true),
            tileOf(m("live_listings"), "Live listings", days, true),
            tileOf(m("rfqs_sent"), "RFQs sent", days, false),
            tileOf(m("quotes_sent"), "Quotes sent", days, false),
            none("Orders", "Ordering opens in Launch 2"),
            none("Order value (GMV)", "Ordering opens in Launch 2"),
          ]}
        />
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <Card title="Content output" intro={`Published in the last ${String(days)} days, with the change from before.`}>
          <div className="rounded-card bg-subtle">
            <EmptyState title="Not in the nightly figures yet">
              Counts by type (news, analysis, newsletters, tenders and scheme updates) appear here once the roll-up
              includes them.
            </EmptyState>
          </div>
        </Card>
        <Card
          title="Download a report"
          intro="Each CSV uses the dates above. Sales and supplier reports are in the report library."
        >
          <ul className="flex flex-col divide-y divide-default">
            {REPORT_DOWNLOADS.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-3 py-3">
                <span>
                  <span className="block type-label">{r.title}</span>
                  <span className="block type-caption text-secondary">{r.detail}</span>
                </span>
                {r.metrics.length ? (
                  <a
                    href={`/admin/reports/export?days=${String(days)}&report=${r.key}`}
                    download
                    className={buttonClasses({ variant: "ghost", size: "sm" })}
                  >
                    <Icon name="download" size={14} />
                    CSV<span className="sr-only"> {r.title}</span>
                  </a>
                ) : (
                  <span className="type-caption text-secondary">Not yet</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
        <h2 className="type-h4">Scheduled report emails</h2>
        {schedules.length ? (
          <ul className="flex flex-col divide-y divide-default">
            {schedules.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 py-2 type-body-sm">
                <span>
                  {s.email} · {s.frequency === "weekly" ? "Weekly" : "Monthly"}
                </span>
                <span className="flex items-center gap-3 text-secondary">
                  {s.lastSentAt ? `Last sent ${formatIstDateTime(s.lastSentAt)}` : "Not sent yet"}
                  <CancelReport id={s.id} email={s.email} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-body-sm text-secondary">None yet.</p>
        )}
        <ListPager paged={schedulesPage} query={pagingQuery(sp, "schedules")} name="schedules" />
        <p className="type-caption text-secondary">The report email goes out once its wording is approved (M21).</p>
      </section>
    </AdminShell>
  );
}
