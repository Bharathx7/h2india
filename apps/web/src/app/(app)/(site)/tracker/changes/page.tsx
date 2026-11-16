import { buttonClasses, cx, EmptyState, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { dayMonthYear } from "@/cms/tracker/format";
import { TRACKER_VIEWS } from "@/cms/tracker/options";
import { QuerySelect } from "@/opportunities/filters";
import { Crumbs } from "@/opportunities/parts";
import { CHANGE_KINDS, filterChanges, PERIODS } from "@/tracker/changes";
import { recentChanges } from "@/tracker/data";
import { wrap } from "@/tracker/parts";
import { SUB_VIEWS } from "@/tracker/views";

// Recent changes (740:841, step 5.6): every record we added or edited, with the value before and after and its
// source. Written automatically when a record is published (step 4.5).

export const metadata: Metadata = {
  title: "Recent changes · India Hydrogen Tracker · H2 Economy",
  description: "Every tracker record we added or edited, with the value before and after.",
  alternates: { canonical: "/tracker/changes" },
};
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));
/** The start of the chosen period (a request-time read, outside render). */
const sinceDays = (days: number) => new Date(new Date().getTime() - days * 86_400_000);

const short = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

export default async function ChangesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const s = await searchParams;
  const viewName = TRACKER_VIEWS.some((v) => v.view === one(s.view)) ? one(s.view) : "";
  const kind = CHANGE_KINDS.some((k) => k.value === one(s.kind)) ? one(s.kind) : "";
  const days = PERIODS.some((p) => p.value === one(s.period)) ? Number(one(s.period)) : 30;
  const since = sinceDays(days);
  const list = filterChanges(await recentChanges({ view: viewName || undefined, since, limit: 500 }), kind);
  const pathOf = (view: string) => SUB_VIEWS.find((v) => v.tab === view)?.path;
  const csv = new URLSearchParams(
    Object.entries({ view: viewName, kind, period: one(s.period) }).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs
          items={[
            { label: "Knowledge", href: "/knowledge" },
            { label: "India Hydrogen Tracker", href: "/tracker" },
            { label: "Recent changes" },
          ]}
        />
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="type-h1 text-primary">Recent changes</h1>
            <p className="type-body text-body">
              Every record we added or edited, with the value before and after. Data as of {dayMonthYear(new Date())}.
            </p>
          </div>
          <a href={`/tracker/changes/csv${csv ? `?${csv}` : ""}`} className={buttonClasses({ variant: "outline" })}>
            <Icon name="download" size={18} />
            Download CSV
          </a>
        </div>
      </div>
      <div id="list" className={cx(wrap, "flex flex-col gap-4 pb-16 pt-6")}>
        <div className="flex flex-wrap gap-3">
          <QuerySelect
            name="view"
            label="View"
            placeholder="View: All"
            options={TRACKER_VIEWS.map((v) => ({ value: v.view, label: `View: ${v.view}` }))}
          />
          <QuerySelect
            name="kind"
            label="Change"
            placeholder="Change: All"
            options={CHANGE_KINDS.map((k) => ({ value: k.value, label: `Change: ${k.label}` }))}
          />
          <QuerySelect
            name="period"
            label="Period"
            placeholder="Last 30 days"
            options={PERIODS.filter((p) => p.value !== "30")}
          />
        </div>
        {list.length ? (
          <div className="overflow-x-auto rounded-card border border-default p-3">
            <table className="w-full min-w-220 text-left">
              <thead className="bg-subtle type-label-sm text-secondary">
                <tr>
                  {["Date", "Record", "View", "Field", "Before", "After", "Source"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2.5 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="type-body-sm text-primary">
                {list.map((c) => {
                  const path = pathOf(c.view);
                  return (
                    <tr key={c.id} className="border-t border-default">
                      <td className="px-3 py-3 type-spec whitespace-nowrap">{short(c.at)}</td>
                      <td className="px-3 py-3">
                        {path && c.recordSlug ? (
                          <Link
                            href={`/tracker/${path}/${c.recordSlug}`}
                            className="type-label text-link hover:underline"
                          >
                            {c.recordTitle}
                          </Link>
                        ) : (
                          <span className="type-label">{c.recordTitle}</span>
                        )}
                      </td>
                      <td className="px-3 py-3">{c.view}</td>
                      <td className="px-3 py-3">{c.field}</td>
                      <td className="px-3 py-3 text-secondary">{c.before ?? "—"}</td>
                      <td className="px-3 py-3">{c.after ?? "—"}</td>
                      <td className="px-3 py-3">
                        {c.sourceUrl ? (
                          <a
                            href={c.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-link hover:underline"
                          >
                            {c.source}
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        ) : (
                          <span className="text-link">{c.source}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-card border border-default bg-page py-8">
            <EmptyState kind="no-results" title="No changes in this period">
              Try a longer period or another view.
            </EmptyState>
          </div>
        )}
      </div>
    </main>
  );
}
