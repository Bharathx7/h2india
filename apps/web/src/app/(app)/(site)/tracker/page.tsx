import { buttonClasses, cx, EmptyState } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { dayMonthYear, indianNumber } from "@/cms/tracker/format";
import { forcedState } from "@/lib/dev-state";
import { recentChanges, trackerOverview, trackerRecords } from "@/tracker/data";
import { MapLayers } from "@/tracker/MapLayers";
import { BarChart, ChangesPanel, TrackerHead, wrap } from "@/tracker/parts";
import { dataAsOf, stateName, type Row } from "@/tracker/views";

// India Hydrogen Tracker overview (796:7867; phones 797:8159; states 800:8303, step 5.6): headline figures with their
// source and date, the map with its layers (a placeholder until the map component, step 6.6 and M7), capacity by
// status, awarded capacity by state and Recent changes.

export const metadata: Metadata = {
  title: "India Hydrogen Tracker · H2 Economy",
  description: "Projects, factories, pilots, stations, prices and state policies, each with its source and date.",
  alternates: { canonical: "/tracker" },
};
export const dynamic = "force-dynamic";

const CONTRACTED = ["Contracted", "Under construction", "Commissioned"];

export default async function TrackerOverviewPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const forced = forcedState((await searchParams).view);
  if (forced === "loading") {
    return (
      <main id="main">
        <TrackerHead title="India Hydrogen Tracker" asOf={null} active="" />
        <div
          role="status"
          aria-busy="true"
          aria-label="Loading the tracker"
          className={cx(wrap, "flex flex-col gap-4 py-6")}
        >
          <span className="block h-24 rounded-card shimmer" />
          <span className="block h-24 rounded-card shimmer" />
          <span className="block h-80 rounded-card shimmer" />
          <p className="type-caption text-secondary">
            Tiles, map and charts load separately; each shows its own placeholder.
          </p>
        </div>
      </main>
    );
  }
  let data;
  try {
    if (forced === "error") throw new Error("Forced error (?view=error)");
    data = await Promise.all([
      trackerOverview(),
      trackerRecords("tracker-projects"),
      trackerRecords("tracker-factories"),
      trackerRecords("tracker-stations"),
      trackerRecords("tracker-pilots"),
      trackerRecords("tracker-hubs"),
      recentChanges({ limit: 5 }),
    ]);
  } catch (error) {
    console.error("[tracker] overview failed", error);
    return (
      <main id="main">
        <TrackerHead title="India Hydrogen Tracker" asOf={null} active="" />
        <div className={cx(wrap, "py-6")}>
          <div className="rounded-card border border-default bg-page py-8">
            <EmptyState
              kind="error"
              title="Tracker data didn’t load"
              action={
                <Link href="/tracker" className={buttonClasses({ variant: "outline" })}>
                  Try again
                </Link>
              }
            >
              We couldn’t reach the data service. Try again in a minute.
            </EmptyState>
          </div>
        </div>
      </main>
    );
  }
  const [overview, projects, factories, stations, pilots, hubs, changes] = data as [
    Awaited<ReturnType<typeof trackerOverview>>,
    Row[],
    Row[],
    Row[],
    Row[],
    Row[],
    Awaited<ReturnType<typeof recentChanges>>,
  ];
  const all = [...projects, ...factories, ...stations, ...pilots, ...hubs];
  const asOf = overview?.dataAsOf ?? dataAsOf(all);
  const cap = (rows: Row[]) => rows.reduce((n, r) => n + (typeof r.capacityTpa === "number" ? r.capacityTpa : 0), 0);
  const statuses = ["Announced", "Awarded", "Contracted", "Under construction", "Commissioned"];
  const byStatus = statuses.map((s) => ({ label: s, value: cap(projects.filter((p) => p.stage === s)) }));
  const awarded = projects.filter(
    (p) => typeof p.stage === "string" && p.stage !== "Announced" && p.stage !== "Cancelled",
  );
  const states = [...new Set(awarded.map((p) => (typeof p.state === "string" ? p.state : "")).filter(Boolean))]
    .map((s) => {
      const rows = awarded.filter((p) => p.state === s);
      return {
        state: stateName(s),
        total: cap(rows),
        contracted: cap(rows.filter((p) => CONTRACTED.includes(String(p.stage)))),
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const maxState = Math.max(1, ...states.map((s) => s.total));
  const layers = [
    { key: "projects", label: "Projects", rows: projects },
    { key: "factories", label: "Electrolyser factories", rows: factories },
    { key: "stations", label: "Refuelling stations", rows: stations },
    { key: "pilots", label: "Pilot routes", rows: pilots },
    { key: "hubs", label: "Hubs and valleys", rows: hubs },
  ].map((l) => ({
    key: l.key,
    label: l.label,
    count: l.rows.length,
    states: l.rows.map((r) => (typeof r.state === "string" && r.state ? stateName(r.state) : "")).filter(Boolean),
  }));

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <TrackerHead title="India Hydrogen Tracker" asOf={asOf} active="" csvHref="/tracker/projects/csv" />
      <div className={cx(wrap, "flex flex-col gap-6 pb-16 pt-6")}>
        {overview?.figures?.length ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {overview.figures.map((f) => (
              <li key={f.id ?? f.label} className="flex flex-col gap-1 rounded-card border border-default bg-page p-4">
                <span className="type-h2 text-primary">{f.value}</span>
                <span className="type-label text-primary">{f.label}</span>
                <span className="mt-auto type-caption text-link">
                  {f.sourceUrl ? (
                    <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      {f.source} · {dayMonthYear(f.asOf)}
                    </a>
                  ) : (
                    `${f.source} · ${dayMonthYear(f.asOf)}`
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <MapLayers layers={layers} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <BarChart title="Capacity by status, t/yr" unit="" bars={byStatus} />
            <p className="type-caption text-secondary">
              All tracked green hydrogen projects. Sources on each record{asOf ? ` · ${dayMonthYear(asOf)}` : ""}.
            </p>
          </div>
          <figure className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <figcaption className="type-label text-primary">Awarded capacity by state, t/yr</figcaption>
            <p className="flex flex-wrap gap-4 type-caption text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-[2px] bg-accent" /> Contracted
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-[2px] bg-ink-500" /> Awarded, not yet contracted
              </span>
            </p>
            {states.length ? (
              <dl className="flex flex-col gap-2.5">
                {states.map((s) => (
                  <div key={s.state} className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1">
                    <dt className="type-body-sm text-primary">{s.state}</dt>
                    <dd className="type-spec text-primary">{indianNumber(s.total)}</dd>
                    {/* The bar sits in its own dd: a dl's groups may hold only dt and dd (axe dlitem). */}
                    <dd aria-hidden="true" className="col-span-2">
                      <span
                        className="flex h-2 overflow-hidden rounded-pill bg-subtle"
                        style={{ width: `${String((s.total / maxState) * 100)}%` }}
                      >
                        <span
                          className="bg-accent"
                          style={{ width: `${String(s.total ? (s.contracted / s.total) * 100 : 0)}%` }}
                        />
                        <span className="flex-1 bg-ink-500" />
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="type-body-sm text-secondary">No awarded projects yet.</p>
            )}
            <p className="type-caption text-secondary">
              Total awarded {indianNumber(cap(awarded))} t/yr · contracted{" "}
              {indianNumber(cap(awarded.filter((p) => CONTRACTED.includes(String(p.stage)))))}
            </p>
          </figure>
          <ChangesPanel changes={changes} />
        </div>
      </div>
    </main>
  );
}
