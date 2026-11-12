import { buttonClasses, cx, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TRACKED } from "@/cms/tracker/collections";
import { dayMonthYear, formatValue, monthYear, readPath } from "@/cms/tracker/format";
import { estimateNote, SOURCE_TIERS } from "@/cms/tracker/options";
import { initialsOf } from "@/opportunities/views";
import { recentChanges, trackerRecord } from "@/tracker/data";
import { StageBadge, wrap } from "@/tracker/parts";
import { Crumbs } from "@/opportunities/parts";
import { stateName, subView } from "@/tracker/views";
import type { Article } from "@/payload-types";

// A tracker record (740:20; phones 745:8063, step 5.6): its fields with units and estimates, the status timeline with
// the evidence for each step, linked companies, related news and "Changes to this record". Every figure carries the
// record's source and as-of date (A34).

type Params = Promise<{ view: string; slug: string }>;

const recordTitle = (r: { name?: unknown; policy?: unknown; slug: string }) =>
  typeof r.name === "string" ? r.name : typeof r.policy === "string" ? r.policy : r.slug;

async function load(params: Params) {
  const { view: path, slug } = await params;
  const view = subView(path);
  if (!view) return null;
  const record = await trackerRecord(view.slug, slug);
  return record ? { view, record } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await load(params);
  if (!found) return { title: "Not found · H2 India" };
  const title = recordTitle(found.record);
  return {
    title: `${title} · India Hydrogen Tracker · H2 India`,
    description: `${found.view.tab} record with its source and status history.`,
    alternates: { canonical: `/tracker/${found.view.path}/${found.record.slug}` },
  };
}
export const dynamic = "force-dynamic";

export default async function TrackerRecordPage({ params }: { params: Params }) {
  const found = await load(params);
  if (!found) notFound();
  const { view, record: r } = found;
  const changes = await recentChanges({ recordId: r.id, slug: view.slug, limit: 10 });
  const tracked = (TRACKED[view.slug] ?? []).filter(
    (f) => !["name", "source.name", "stage", "statusDate"].includes(f.name),
  );
  const estimates = Array.isArray(r.estimates) ? (r.estimates as string[]) : [];
  const fields = tracked
    .map((f) => {
      let value = readPath(r, f.name);
      if (f.name === "state" && typeof value === "string") value = stateName(value);
      let text = formatValue(value, f.kind);
      if (text !== "—" && f.unit && !text.endsWith(f.unit)) text = `${text} ${f.unit}`;
      const estimated = estimates.some((e) => f.label.toLowerCase().startsWith(e.toLowerCase()));
      if (estimated && text !== "—") text = `${text} (${estimateNote(r.source?.tier)})`;
      return { label: f.label.replace(/ \(.*\)$/, ""), text, spec: f.kind === "number" || f.kind === "paise" };
    })
    .filter((f) => f.text !== "—");
  const title = recordTitle(r);
  const stage = typeof r.stage === "string" ? r.stage : "";
  const history = (
    Array.isArray(r.statusHistory)
      ? (r.statusHistory as { id?: string; status: string; date: string; source: string }[])
      : []
  )
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
  const companies = Array.isArray(r.linkedCompanies)
    ? (r.linkedCompanies as { id?: string; name: string; role?: string | null }[])
    : [];
  const news = (Array.isArray(r.relatedArticles) ? r.relatedArticles : []).filter(
    (a): a is Article => typeof a === "object" && a !== null && (a as Article)._status === "published",
  );
  const tier = SOURCE_TIERS.find((t) => t.value === r.source?.tier);
  const stateLabel = typeof r.state === "string" ? stateName(r.state) : null;
  const location = typeof r.location === "string" ? r.location : "";
  const place =
    stateLabel && !location.includes(stateLabel)
      ? [location, stateLabel].filter(Boolean).join(", ")
      : location || (stateLabel ?? "");
  const subtitle = [
    `${view.tab.replace(/s$/, "")} record`,
    r.company ?? r.operator ?? r.leadPartner,
    place || null,
    `last changed ${dayMonthYear(r.updatedAt)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs
          items={[
            { label: "Knowledge", href: "/knowledge" },
            { label: "India Hydrogen Tracker", href: "/tracker" },
            { label: view.tab, href: `/tracker/${view.path}` },
            { label: title },
          ]}
        />
        <p className="mt-2 flex items-center gap-2">
          {stage ? <StageBadge stage={stage} /> : null}
          <span className="type-eyebrow text-secondary">
            {view.tab.replace(/s$/, "").toUpperCase()}
            {typeof r.product === "string" ? ` · ${r.product.toUpperCase()}` : ""}
          </span>
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="type-h1 text-primary">{title}</h1>
            <p className="type-body text-body">{subtitle}</p>
          </div>
          <Link
            href={`/legal/corrections/suggest?page=${encodeURIComponent(`/tracker/${view.path}/${r.slug}`)}`}
            className={buttonClasses({ variant: "outline" })}
          >
            Report a correction
          </Link>
        </div>
      </div>

      <div className={cx(wrap, "flex flex-col gap-6 pb-16 pt-6 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 max-w-180 flex-1 flex-col gap-6">
          <section aria-labelledby="fields" className="flex flex-col gap-3 rounded-card border border-default p-5">
            <h2 id="fields" className="type-h4 text-primary">
              Record fields
            </h2>
            <dl className="flex flex-col">
              {fields.map((f) => (
                <div key={f.label} className="grid grid-cols-[10rem_1fr] gap-4 border-t border-default py-2.5">
                  <dt className="type-caption text-secondary">{f.label}</dt>
                  <dd className={cx("type-body-sm text-primary", f.spec && "type-spec")}>{f.text}</dd>
                </div>
              ))}
              <div className="grid grid-cols-[10rem_1fr] gap-4 border-t border-default py-2.5">
                <dt className="type-caption text-secondary">Source</dt>
                <dd className="type-body-sm text-primary">
                  {r.source?.url ? (
                    <a
                      href={r.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link hover:underline"
                    >
                      {r.source.name}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    r.source?.name
                  )}
                  {tier ? ` · ${tier.short}` : ""}
                  {r.source?.asOf ? ` · as of ${dayMonthYear(r.source.asOf)}` : ""}
                </dd>
              </div>
            </dl>
          </section>

          {history.length ? (
            <section aria-labelledby="timeline" className="flex flex-col gap-3 rounded-card border border-default p-5">
              <div>
                <h2 id="timeline" className="type-h4 text-primary">
                  Status timeline
                </h2>
                <p className="type-caption text-secondary">Every change is dated and sourced.</p>
              </div>
              <ol className="flex flex-col">
                {history.map((h, i) => (
                  <li
                    key={h.id ?? `${h.status}-${h.date}`}
                    className="flex items-center gap-3 border-t border-default py-2.5"
                  >
                    <Icon name={i === 0 ? "clock" : "check-circle"} size={18} className="shrink-0 text-icon-primary" />
                    <span className="flex flex-1 flex-col">
                      <span className="type-label text-primary">{h.status}</span>
                      <span className="type-caption text-secondary">{monthYear(h.date)}</span>
                    </span>
                    <span className="text-right type-caption text-link">{h.source}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {companies.length ? (
            <section aria-labelledby="companies" className="flex flex-col gap-3 rounded-card border border-default p-5">
              <h2 id="companies" className="type-h4 text-primary">
                Linked companies
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {companies.map((c) => (
                  <li key={c.id ?? c.name} className="flex items-center gap-3 rounded-card border border-default p-3">
                    <span className="flex size-10 items-center justify-center rounded-pill bg-mint type-label-sm text-primary">
                      {initialsOf(c.name)}
                    </span>
                    <span className="flex flex-col">
                      <span className="type-label text-link">{c.name}</span>
                      {c.role ? <span className="type-caption text-secondary">{c.role}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {news.length ? (
            <section aria-labelledby="news" className="flex flex-col gap-3 rounded-card border border-default p-5">
              <h2 id="news" className="type-h4 text-primary">
                Related news
              </h2>
              <ul className="flex flex-col">
                {news.map((a) => (
                  <li key={a.id} className="border-t border-default py-2.5">
                    <Link href={`/news/${a.slug}`} className="type-label text-link hover:underline">
                      {a.title}
                    </Link>
                    {a.publishedAt ? <p className="type-caption text-secondary">{monthYear(a.publishedAt)}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          <div
            role="img"
            aria-label={`India map with a pin at ${place || title}. The interactive map comes later.`}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-card bg-subtle"
          >
            <Icon name="building" size={20} className="text-icon-secondary" />
            <p className="type-caption text-secondary">India map · pin at {place || title}</p>
          </div>
          <section
            aria-labelledby="record-changes"
            className="flex flex-col gap-3 rounded-card border border-default p-5"
          >
            <h2 id="record-changes" className="type-h4 text-primary">
              Changes to this record
            </h2>
            {changes.length ? (
              <ul className="flex flex-col">
                {changes.map((c) => (
                  <li key={c.id} className="flex flex-col gap-0.5 border-t border-default py-2.5">
                    <span className="type-spec text-secondary">
                      {dayMonthYear(c.at)} · {c.field}
                    </span>
                    <span className="type-body-sm text-primary">
                      {c.before && c.before !== "—" ? `${c.before} → ` : ""}
                      <strong className="type-label">{c.after}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="type-body-sm text-secondary">No changes since it was added.</p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
