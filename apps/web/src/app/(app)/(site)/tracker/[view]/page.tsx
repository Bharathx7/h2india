import { cx, EmptyState } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { forcedState } from "@/lib/dev-state";
import { QuerySelect } from "@/opportunities/filters";
import { CardsLoading, LoadError } from "@/opportunities/parts";
import { recentChanges, trackerRecords } from "@/tracker/data";
import { BarChart, ChangesPanel, StageBadge, TrackerHead, wrap } from "@/tracker/parts";
import { applyFilters, dataAsOf, stateName, subView, type Row, type SubView } from "@/tracker/views";
import { viewOf } from "@/cms/tracker/options";

// A tracker sub-view (Projects 738:5437 and 745:7824, Manufacturing 738:5994, Pilots 738:6499, Stations 739:8, Prices
// 739:685, State policies 739:1280; step 5.6). Filters, the summary tiles, a chart, the table with each row's source,
// and Recent changes for this view. The map comes with the map component (step 6.6, M7).

type Params = Promise<{ view: string }>;
type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const view = subView((await params).view);
  if (!view) return { title: "Not found · H2 India" };
  return {
    title: `${view.title} · India Hydrogen Tracker · H2 India`,
    description: `${view.title}: every record with its source and as-of date, updated every Monday.`,
    alternates: { canonical: `/tracker/${view.path}` },
  };
}
export const dynamic = "force-dynamic";

function Table({ view, rows }: { view: SubView; rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-200 text-left">
        <thead className="bg-subtle type-label-sm text-secondary">
          <tr>
            {view.columns.map((c) => (
              <th key={c.header} scope="col" className="px-3 py-2.5 font-semibold">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="type-body-sm text-primary">
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-default">
              {view.columns.map((c) => {
                const cell = c.cell(r);
                return (
                  <td key={c.header} className="px-3 py-3 align-middle">
                    {cell.kind === "status" ? (
                      <StageBadge stage={cell.text === "—" ? "" : cell.text} />
                    ) : cell.kind === "record" ? (
                      <Link href={`/tracker/${view.path}/${r.slug}`} className="hover:underline">
                        {cell.text}
                      </Link>
                    ) : cell.kind === "link" ? (
                      cell.href ? (
                        <a
                          href={cell.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-link hover:underline"
                        >
                          {cell.text}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        <span className="text-secondary">{cell.text}</span>
                      )
                    ) : (
                      <span className={cx(cell.kind === "spec" && "type-spec", cell.kind === "strong" && "type-label")}>
                        {cell.text}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Until the map component (6.6, M7): the places in this view by state, so nothing is hidden. */
function MapStandIn({ view, rows }: { view: SubView; rows: Row[] }) {
  const byState = new Map<string, number>();
  for (const r of rows) {
    const s = typeof r.state === "string" && r.state ? stateName(r.state) : "Pan-India";
    byState.set(s, (byState.get(s) ?? 0) + 1);
  }
  return (
    <div
      role="img"
      aria-label={`India map of ${String(rows.length)} ${view.noun}. The interactive map comes later; every place is in the table.`}
      className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-card bg-subtle p-6"
    >
      <p className="type-caption text-secondary">
        India map · {rows.length} {view.noun}
      </p>
      <ul className="flex flex-wrap justify-center gap-2">
        {[...byState].map(([s, n]) => (
          <li
            key={s}
            className="inline-flex items-center gap-1.5 rounded-pill bg-page px-2.5 py-1 type-label-sm text-primary"
          >
            <span className="flex size-5 items-center justify-center rounded-pill bg-inverse type-label-sm text-inverse">
              {n}
            </span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function TrackerView({ params, searchParams }: { params: Params; searchParams: Promise<Search> }) {
  const view = subView((await params).view);
  if (!view) notFound();
  const search = await searchParams;
  const forced = forcedState(one(search.view));
  const as = one(search.as) === "map" ? "map" : one(search.as) === "chart" ? "chart" : "table";
  const chosen = Object.fromEntries(view.filters([]).map((f) => [f.name, one(search[f.name])]));
  const query = new URLSearchParams(
    Object.entries({ ...chosen, as: as === "table" ? "" : as }).filter((e): e is [string, string] => Boolean(e[1])),
  );
  const head = (asOf: string | null) => (
    <TrackerHead
      title={view.title}
      crumb={view.tab}
      asOf={asOf}
      active={view.path}
      csvHref={`/tracker/${view.path}/csv${query.toString() ? `?${query.toString()}` : ""}`}
    />
  );
  if (forced === "loading") {
    return (
      <main id="main">
        {head(null)}
        <div className={cx(wrap, "py-6")}>
          <CardsLoading label={`Loading ${view.noun}`} count={3} />
        </div>
      </main>
    );
  }
  let rows: Row[];
  let changes;
  try {
    if (forced === "error") throw new Error("Forced error (?view=error)");
    [rows, changes] = await Promise.all([
      trackerRecords(view.slug) as Promise<Row[]>,
      recentChanges({ view: viewOf(view.slug), limit: 5 }),
    ]);
  } catch (error) {
    console.error("[tracker] view failed", error);
    return (
      <main id="main">
        {head(null)}
        <div className={cx(wrap, "py-6")}>
          <LoadError what="tracker data" retry={`/tracker/${view.path}`} />
        </div>
      </main>
    );
  }
  if (forced === "empty") rows = [];
  const filters = view.filters(rows);
  const list = applyFilters(view, rows, chosen);
  const chart = view.chart?.(list) ?? null;
  const hrefFor = (v: string) => {
    const q = new URLSearchParams(query);
    q.delete("as");
    if (v !== "table") q.set("as", v);
    return `/tracker/${view.path}${q.toString() ? `?${q.toString()}` : ""}`;
  };

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      {head(dataAsOf(rows))}
      <div className={cx(wrap, "flex flex-col gap-6 pb-16 pt-6 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {filters.map((f) => (
              <QuerySelect
                key={f.name}
                name={f.name}
                label={f.label}
                placeholder={`${f.label}: ${f.name === "size" ? "Any" : "All"}`}
                options={f.options.map((o) => ({ value: o.value, label: `${f.label}: ${o.label}` }))}
                anchor="main"
              />
            ))}
            <ViewToggleWithMap current={as} hrefFor={hrefFor} />
          </div>
          <ul className="grid gap-3 sm:grid-cols-3">
            {view.tiles(list, new Date()).map((t) => (
              <li key={t.label} className="flex flex-col gap-0.5 rounded-card bg-subtle px-4 py-3">
                <span className="type-h4 text-primary">{t.value}</span>
                <span className="type-caption text-secondary">{t.label}</span>
              </li>
            ))}
          </ul>
          {list.length === 0 ? (
            <div className="rounded-card border border-default bg-page py-8">
              <EmptyState
                kind={rows.length ? "no-results" : "first-use"}
                title={rows.length ? `No ${view.noun} match these filters` : `No ${view.noun} published yet`}
                action={
                  rows.length ? (
                    <Link href={`/tracker/${view.path}`} className="type-label text-link hover:underline">
                      Clear filters
                    </Link>
                  ) : undefined
                }
              >
                {rows.length ? "Try another filter." : "Our editors add records with their sources every Monday."}
              </EmptyState>
            </div>
          ) : as === "map" ? (
            <MapStandIn view={view} rows={list} />
          ) : (
            <>
              {chart ? <BarChart {...chart} /> : null}
              {as === "table" ? (
                <section
                  aria-label={view.tab}
                  className="flex flex-col gap-2 rounded-card border border-default bg-page p-3"
                >
                  <Table view={view} rows={list} />
                  <p className="px-1 type-caption text-secondary">
                    Showing {list.length} of {rows.length}. {view.footnote}
                  </p>
                </section>
              ) : null}
            </>
          )}
        </div>
        <aside className="lg:w-80 lg:shrink-0">
          <ChangesPanel changes={changes} href={`/tracker/changes?view=${encodeURIComponent(viewOf(view.slug))}`} />
        </aside>
      </div>
    </main>
  );
}

function ViewToggleWithMap({ current, hrefFor }: { current: string; hrefFor: (v: string) => string }) {
  return (
    <nav aria-label="Show as" className="flex items-center gap-2">
      {(["table", "map", "chart"] as const).map((v) => (
        <Link
          key={v}
          href={hrefFor(v)}
          scroll={false}
          aria-current={current === v ? "page" : undefined}
          className={cx(
            "inline-flex h-8 items-center rounded-pill border-[1.5px] px-2.75 type-label",
            current === v
              ? "border-transparent bg-inverse text-inverse"
              : "border-control bg-page text-primary hover:border-focus",
          )}
        >
          {v === "table" ? "Table" : v === "map" ? "Map" : "Chart"}
        </Link>
      ))}
    </nav>
  );
}
