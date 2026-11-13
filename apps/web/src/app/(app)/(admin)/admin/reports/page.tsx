import { getDb } from "@h2india/core";
import { reportSchedules, reportsOverview } from "@h2india/core/admin/system";
import { formatIstDateTime } from "@h2india/core/time";
import { cx, EmptyState, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { ScheduleReport } from "@/admin/system/Controls";

// Reports overview (716:348), step 11.8: the numbers that matter for the last 7, 30 or 90 days against the period
// before, from the nightly roll-ups, and Schedule report email (267:7338).
export const metadata: Metadata = { title: "Reports · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90] as const;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("reports.view", "/admin/reports");
  const days = RANGES.find((d) => String(d) === sp.days) ?? 30;
  const db = getDb();
  const [metrics, schedules] = await Promise.all([reportsOverview(db, actor, days), reportSchedules(db, actor)]);
  const anyData = metrics.some((m) => m.series.length);
  return (
    <AdminShell userId={userId} current="/admin/reports" title="Reports">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">Reports</h1>
          <p className="type-body-sm text-secondary">
            Figures added up each night for the day before (IST), against the period before.
          </p>
        </div>
        <ScheduleReport />
      </div>
      <nav aria-label="Period" className="flex gap-2">
        {RANGES.map((d) => (
          <Link
            key={d}
            href={`/admin/reports?days=${String(d)}`}
            aria-current={d === days ? "page" : undefined}
            className={cx(
              "inline-flex h-9 items-center rounded-pill border-[1.5px] px-3 type-label",
              d === days ? "border-transparent bg-inverse text-inverse" : "border-control bg-page",
            )}
          >
            Last {d} days
          </Link>
        ))}
      </nav>
      {anyData ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map((m) => {
            const change = m.previous ? Math.round(((m.value - m.previous) / m.previous) * 100) : null;
            const max = Math.max(1, ...m.series.map((s) => s.value));
            return (
              <li key={m.key} className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
                <h2 className="type-body-sm">{m.label}</h2>
                <p className="flex items-center gap-2">
                  <span className="type-h2">{m.value.toLocaleString("en-IN")}</span>
                  {change !== null ? (
                    <StatusBadge
                      status={`${change >= 0 ? "+" : ""}${String(change)}%`}
                      tone={change >= 0 ? "success" : "warning"}
                    />
                  ) : null}
                </p>
                <div aria-hidden className="flex h-10 items-end gap-px">
                  {m.series.map((s) => (
                    <span
                      key={s.day}
                      className="flex-1 rounded-t bg-accent"
                      style={{ height: `${String(Math.max(4, (s.value / max) * 100))}%` }}
                    />
                  ))}
                </div>
                <p className="type-caption text-secondary">
                  {m.previous
                    ? `${m.previous.toLocaleString("en-IN")} the ${String(days)} days before`
                    : "Nothing to compare yet"}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-card border border-default bg-page">
          <EmptyState title="No figures yet">
            The first figures appear after tonight&apos;s roll-up, at 00:40 IST.
          </EmptyState>
        </div>
      )}
      <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
        <h2 className="type-h4">Scheduled report emails</h2>
        {schedules.length ? (
          <ul className="flex flex-col divide-y divide-default">
            {schedules.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 py-2 type-body-sm">
                <span>
                  {s.email} · {s.frequency}
                </span>
                <span className="text-secondary">
                  {s.lastSentAt ? `Last sent ${formatIstDateTime(s.lastSentAt)}` : "Not sent yet"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-body-sm text-secondary">None yet.</p>
        )}
        <p className="type-caption text-secondary">The report email goes out once its wording is approved (M21).</p>
      </section>
    </AdminShell>
  );
}
