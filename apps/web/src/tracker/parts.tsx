import { buttonClasses, cx, Icon, StatusBadge } from "@h2india/ui";
import Link from "next/link";
import { dayMonthYear, indianNumber } from "@/cms/tracker/format";
import { Crumbs, wrap } from "@/opportunities/parts";
import type { TrackerChange } from "@/payload-types";
import { SUB_VIEWS, toneOfStage } from "./views";

// Pieces every tracker page shares (796:7867, 738:5437…): the header with "Data as of" and Download CSV, the tabs,
// the Recent changes panel and the horizontal bar chart.

export { wrap };

const short = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

export function TrackerHead({
  title,
  crumb,
  asOf,
  csvHref,
  active,
}: {
  title: string;
  crumb?: string;
  asOf: string | null;
  csvHref?: string;
  active: string;
}) {
  return (
    <div className={cx(wrap, "flex flex-col gap-3 pt-6 md:pt-8")}>
      <Crumbs
        items={[
          { label: "Knowledge", href: "/knowledge" },
          ...(crumb
            ? [{ label: "India Hydrogen Tracker", href: "/tracker" }, { label: crumb }]
            : [{ label: "India Hydrogen Tracker" }]),
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="type-h1 text-primary">{title}</h1>
          <p className="type-body text-body">
            {asOf ? `Data as of ${dayMonthYear(asOf)} · ` : ""}updated every Monday ·{" "}
            <Link href="/tracker/methodology" className="text-link underline">
              Methodology
            </Link>
          </p>
        </div>
        {csvHref ? (
          <a href={csvHref} className={buttonClasses({ variant: "outline" })}>
            <Icon name="download" size={18} />
            Download CSV
          </a>
        ) : null}
      </div>
      <nav aria-label="Tracker views" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex min-w-max gap-6 border-b border-default">
          {[{ path: "", tab: "Overview" }, ...SUB_VIEWS].map((v) => {
            const on = v.path === active;
            return (
              <li key={v.tab}>
                <Link
                  href={v.path ? `/tracker/${v.path}` : "/tracker"}
                  aria-current={on ? "page" : undefined}
                  className={cx(
                    "tab-underline inline-flex h-11 items-center type-label transition-colors duration-(--motion-duration-fast)",
                    on ? "text-primary" : "text-body hover:text-primary",
                  )}
                >
                  {v.tab}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function ChangesPanel({ changes, href = "/tracker/changes" }: { changes: TrackerChange[]; href?: string }) {
  return (
    <section aria-labelledby="changes" className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
      <h2 id="changes" className="type-h4 text-primary">
        Recent changes
      </h2>
      {changes.length ? (
        <ul className="flex flex-col">
          {changes.map((c) => (
            <li key={c.id} className="flex flex-col gap-0.5 border-b border-default py-2.5 last:border-b-0">
              <span className="type-spec text-secondary">{short(c.at)}</span>
              <span className="type-body-sm text-primary">
                {c.field === "Record"
                  ? `${c.recordTitle} added`
                  : `${c.recordTitle} · ${c.field.toLowerCase()} changed to ${c.after ?? "—"}`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="type-body-sm text-secondary">No changes yet.</p>
      )}
      <Link href={href} className={cx(buttonClasses({ variant: "ghost", size: "sm" }), "self-start")}>
        All changes
      </Link>
    </section>
  );
}

export function BarChart({
  title,
  unit,
  bars,
}: {
  title: string;
  unit: string;
  bars: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <figure className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
      <figcaption className="type-label text-primary">{title}</figcaption>
      <dl className="flex flex-col gap-2">
        {bars.map((b) => (
          <div key={b.label} className="grid grid-cols-[9rem_1fr] items-center gap-3 sm:grid-cols-[12rem_1fr]">
            <dt className="truncate type-caption text-secondary">{b.label}</dt>
            <dd className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2 rounded-pill bg-accent"
                style={{ width: `${String(Math.max(1, (b.value / max) * 70))}%` }}
              />
              <span className="type-spec whitespace-nowrap text-primary">
                {indianNumber(b.value)} {unit}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}

export function StageBadge({ stage }: { stage: string }) {
  return stage ? <StatusBadge status={stage} tone={toneOfStage(stage)} /> : <span>—</span>;
}
