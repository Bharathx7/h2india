import config from "@payload-config";
import { StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getPayload } from "payload";
import { recentChanges } from "@/cms/tracker/changes";
import { TRACKED } from "@/cms/tracker/collections";
import { dayMonthYear, formatValue, monthYear, readPath } from "@/cms/tracker/format";
import {
  estimateNote,
  SOURCE_TIERS,
  STATUS_TONE,
  TRACKER_SLUGS,
  viewOf,
  type TrackerSlug,
} from "@/cms/tracker/options";

// Preview of a tracker record for editors ("Preview" on 643:1330, step 4.5), laid out like the record page (740:20):
// the record's fields, its source and as-of date, the status timeline and the changes to this record. The public
// tracker pages come with Stage 5.
export const metadata: Metadata = { title: "Preview · H2 India CMS", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Doc = Record<string, unknown> & {
  id: number;
  _status?: string;
  stage?: string;
  sample?: boolean;
  estimates?: string[] | null;
  statusHistory?: { id?: string; status: string; date: string; source: string }[] | null;
  source?: { name?: string; url?: string | null; tier?: string; asOf?: string } | null;
};

/** Estimated figures carry a note; the estimate options are the figure names without the unit. */
function isEstimated(label: string, estimates: string[]) {
  const base = label.replace(/\s*\(.*\)$/, "").toLowerCase();
  return estimates.some((e) => e.toLowerCase() === base || base.startsWith(e.toLowerCase()));
}

export default async function TrackerPreview({ params }: { params: Promise<{ collection: string; id: string }> }) {
  const { collection, id } = await params;
  if (!(TRACKER_SLUGS as string[]).includes(collection)) notFound();
  const slug = collection as TrackerSlug;
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) redirect(`/sign-in?next=/cms-preview/tracker/${collection}/${id}`);
  const doc = (await payload
    .findByID({ collection: slug, id, draft: true, depth: 0, user, overrideAccess: false })
    .catch(() => null)) as Doc | null;
  if (!doc) notFound();
  const tracked = (TRACKED[slug] ?? []).filter((f) => !["Source", "Status", "Status date"].includes(f.label));
  const titleField = tracked[0]?.name ?? "name";
  const titleValue = doc[titleField] ?? doc.name;
  const title = typeof titleValue === "string" ? titleValue : "";
  const estimates = doc.estimates ?? [];
  const tier = SOURCE_TIERS.find((t) => t.value === doc.source?.tier);
  const changes = await recentChanges(payload, { record: { slug, id: doc.id }, limit: 20 });
  const history = [...(doc.statusHistory ?? [])].reverse();

  return (
    <main className="mx-auto flex max-w-300 flex-col gap-6 px-4 py-10">
      <p role="status" className="rounded-control bg-warning px-3 py-2 type-label-sm text-primary">
        Preview · {doc._status === "published" ? "published" : "draft"}
        {doc.sample ? " · sample content" : ""}
      </p>
      <header className="flex flex-col gap-2">
        <p className="flex items-center gap-2">
          {doc.stage ? <StatusBadge status={doc.stage} tone={STATUS_TONE[doc.stage]} /> : null}
          <span className="type-eyebrow text-secondary">{viewOf(slug).toUpperCase()}</span>
        </p>
        <h1 className="type-h1">{title}</h1>
      </header>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="fields" className="rounded-card border border-default p-6">
            <h2 id="fields" className="type-h4 pb-3">
              Record fields
            </h2>
            <dl className="flex flex-col">
              {tracked.slice(1).map((f) => {
                const value = readPath(doc, f.name);
                const shown = formatValue(value, f.kind);
                const withUnit = shown !== "—" && f.unit && f.kind !== "list" ? `${shown} ${f.unit}` : shown;
                return (
                  <div key={f.name} className="grid grid-cols-[170px_1fr] gap-3 border-t border-default py-2.5">
                    <dt className="type-body-sm text-secondary">{f.label.replace(/\s*\(.*\)$/, "")}</dt>
                    <dd className="type-body-sm text-primary">
                      {withUnit}
                      {shown !== "—" && isEstimated(f.label, estimates) ? ` (${estimateNote(doc.source?.tier)})` : ""}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="border-t border-default pt-3 type-caption text-secondary" data-testid="record-source">
              Source:{" "}
              {doc.source?.url ? (
                <a className="text-link underline" href={doc.source.url} rel="noopener noreferrer">
                  {doc.source.name}
                </a>
              ) : (
                doc.source?.name
              )}
              {tier ? ` (${tier.short})` : ""}
              {doc.source?.asOf ? ` · as of ${dayMonthYear(doc.source.asOf)}` : ""}
            </p>
          </section>
          {history.length > 0 ? (
            <section aria-labelledby="timeline" className="rounded-card border border-default p-6">
              <h2 id="timeline" className="type-h4">
                Status timeline
              </h2>
              <p className="pb-3 type-caption text-secondary">Every change is dated and sourced.</p>
              <ol className="flex flex-col">
                {history.map((h) => (
                  <li
                    key={h.id ?? `${h.status}-${h.date}`}
                    className="flex items-start justify-between gap-3 border-t border-default py-3"
                  >
                    <span className="flex flex-col">
                      <span className="type-label text-primary">{h.status}</span>
                      <span className="type-caption text-secondary">{monthYear(h.date)}</span>
                    </span>
                    <span className="type-body-sm text-body">{h.source}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
        <aside aria-labelledby="changes" className="h-fit rounded-card border border-default p-5">
          <h2 id="changes" className="type-h4 pb-2">
            Changes to this record
          </h2>
          {changes.length === 0 ? (
            <p className="type-body-sm text-secondary">Published changes show here.</p>
          ) : (
            <ul className="flex flex-col">
              {changes.map((c) => (
                <li key={c.id} className="flex flex-col gap-1 border-t border-default py-3">
                  <span className="type-label text-primary">
                    {dayMonthYear(c.at)} · {c.field}
                  </span>
                  <span className="type-body-sm text-body">
                    {c.before} → {c.after}
                  </span>
                  {c.source ? <span className="type-caption text-secondary">{c.source}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}
