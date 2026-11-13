import config from "@payload-config";
import { getDb } from "@h2india/core";
import { confirmedCount, listSends } from "@h2india/core/newsletter/sends";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { buttonClasses, cx, EmptyState, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import { MarkVerified } from "@/admin/content/Controls";
import { AdminShell, requireOperator } from "@/admin/shell";
import { RECORD_COLLECTIONS } from "@/cms/records/collections";
import { possibleUpdates, RED_DAYS, STALE_DAYS, staleRecords } from "@/cms/records/quality";
import { TRACKER_SLUGS } from "@/cms/tracker/options";

// Content (step 11.3): Articles, Records, Newsletter (647:8), Media, Authors and Data quality (646:9, 646:733).
// Articles, records, media and authors are edited in the CMS; this shows their counts and opens them there.
export const metadata: Metadata = { title: "Content · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "articles", label: "Articles" },
  { key: "records", label: "Records" },
  { key: "newsletter", label: "Newsletter" },
  { key: "media", label: "Media" },
  { key: "authors", label: "Authors" },
  { key: "quality", label: "Data quality" },
] as const;

const LABEL: Record<string, string> = {
  schemes: "Scheme",
  tenders: "Tender",
  grants: "Grant",
  jobs: "Job",
  events: "Event",
};

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; view?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const { userId } = await requireOperator("content.view", "/admin/content");
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "quality";
  const payload = await getPayload({ config });
  const db = getDb();
  const count = async (collection: "articles" | "media" | "authors" | "newsletter-issues") =>
    (await payload.count({ collection, overrideAccess: true })).totalDocs;
  const records = async () => {
    const n = await Promise.all(
      [...RECORD_COLLECTIONS, ...TRACKER_SLUGS].map((c) => payload.count({ collection: c, overrideAccess: true })),
    );
    return n.reduce((a, x) => a + x.totalDocs, 0);
  };
  const [articles, media, authors, issues, recordCount, stale, updates] = await Promise.all([
    count("articles"),
    count("media"),
    count("authors"),
    count("newsletter-issues"),
    records(),
    staleRecords(payload),
    possibleUpdates(payload),
  ]);
  const counts: Record<string, number> = {
    articles,
    records: recordCount,
    newsletter: issues,
    media,
    authors,
    quality: stale.length + updates.length,
  };
  const CMS: Record<string, string> = {
    articles: "/cms/collections/articles",
    records: "/cms",
    media: "/cms/collections/media",
    authors: "/cms/collections/authors",
  };

  let body: React.ReactNode;
  if (tab === "quality") {
    const view = sp.view === "updates" ? "updates" : "stale";
    body = (
      <>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "stale", label: `Stale records · ${String(stale.length)}` },
            { key: "updates", label: `Possible updates · ${String(updates.length)}` },
          ].map((v) => (
            <Link
              key={v.key}
              href={`/admin/content?tab=quality&view=${v.key}`}
              aria-current={view === v.key ? "page" : undefined}
              className={cx(
                "inline-flex h-9 items-center rounded-pill border-[1.5px] px-3 type-label",
                view === v.key ? "border-transparent bg-inverse text-inverse" : "border-control bg-page",
              )}
            >
              {v.label}
            </Link>
          ))}
        </div>
        {view === "stale" ? (
          stale.length ? (
            <div
              tabIndex={0}
              role="region"
              aria-label="Stale records"
              className="relative overflow-x-auto rounded-card border border-default bg-page"
            >
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="bg-subtle text-left type-caption text-secondary">
                    <th scope="col" className="px-4 py-3">
                      Record
                    </th>
                    <th scope="col" className="px-2 py-3">
                      Owner
                    </th>
                    <th scope="col" className="px-2 py-3">
                      Last verified
                    </th>
                    <th scope="col" className="px-2 py-3">
                      Official source
                    </th>
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stale.map((r) => (
                    <tr key={`${r.collection}-${String(r.id)}`} className="border-t border-default">
                      <td className="px-4 py-3">
                        <span className="block type-label">{r.title}</span>
                        <span className="block type-caption text-secondary">
                          {LABEL[r.collection] ?? `Tracker · ${r.collection.replace("tracker-", "")}`}
                        </span>
                      </td>
                      <td className="px-2 py-3 type-body-sm">{r.owner ?? "—"}</td>
                      <td className="px-2 py-3">
                        <span className="flex items-center gap-2 type-body-sm">
                          {r.lastVerified ? formatIstDate(r.lastVerified) : "Never"}
                          <StatusBadge
                            status={r.days === null ? "Never verified" : `${String(r.days)} days`}
                            tone={r.tone}
                          />
                        </span>
                      </td>
                      <td className="px-2 py-3 type-body-sm">{r.source ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center justify-end gap-2">
                          <MarkVerified collection={r.collection} id={r.id} title={r.title} />
                          <Link
                            href={`/cms/collections/${r.collection}/${String(r.id)}`}
                            className={buttonClasses({ variant: "ghost", size: "sm" })}
                          >
                            <Icon name="pencil" size={14} />
                            Edit<span className="sr-only"> {r.title}</span>
                          </Link>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-card border border-default bg-page">
              <EmptyState title="Every record is fresh">
                Records nobody has checked for {STALE_DAYS} days show here.
              </EmptyState>
            </div>
          )
        ) : updates.length ? (
          <ul className="flex flex-col divide-y divide-default rounded-card border border-default bg-page">
            {updates.map((u) => (
              <li key={String(u.id)} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span>
                  <span className="block type-label">{u.title}</span>
                  <span className="block type-caption text-secondary">
                    {u.source} · spotted {formatIstDateTime(new Date(u.detectedAt))}
                    {u.before || u.now ? ` · ${u.before ?? ""} → ${u.now ?? ""}` : ""}
                  </span>
                </span>
                <Link
                  href={`/cms/collections/source-changes/${String(u.id)}`}
                  className={buttonClasses({ variant: "outline", size: "sm" })}
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-card border border-default bg-page">
            <EmptyState title="No changes spotted">
              Changes found on official sources show here for an editor to check.
            </EmptyState>
          </div>
        )}
        <p className="type-caption text-secondary">
          Showing {view === "stale" ? stale.length : updates.length} · red after {RED_DAYS} days
        </p>
      </>
    );
  } else if (tab === "newsletter") {
    const [all, sends, audience] = await Promise.all([
      payload.find({ collection: "newsletter-issues", sort: "-number", limit: 100, depth: 0, overrideAccess: true }),
      listSends(db),
      confirmedCount(db),
    ]);
    const statusOf = (id: string, sentOn: string | null | undefined) =>
      sends.find((x) => x.issueId === id)?.status ?? (sentOn && new Date(sentOn) < new Date() ? "Sent" : "Draft");
    const filter = sp.status;
    const rows = all.docs.filter((d) => !filter || statusOf(String(d.id), d.sentOn) === filter);
    body = (
      <>
        <div className="flex flex-wrap gap-2">
          {[undefined, "Draft", "Scheduled", "Sent"].map((st) => (
            <Link
              key={st ?? "all"}
              href={`/admin/content?tab=newsletter${st ? `&status=${st}` : ""}`}
              aria-current={filter === st ? "page" : undefined}
              className={cx(
                "inline-flex h-9 items-center rounded-pill border-[1.5px] px-3 type-label",
                filter === st ? "border-transparent bg-inverse text-inverse" : "border-control bg-page",
              )}
            >
              {st ?? "All"} · {all.docs.filter((d) => !st || statusOf(String(d.id), d.sentOn) === st).length}
            </Link>
          ))}
        </div>
        <div
          tabIndex={0}
          role="region"
          aria-label="Newsletter issues"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  Issue
                </th>
                <th scope="col" className="px-2 py-3">
                  Segment
                </th>
                <th scope="col" className="px-2 py-3">
                  Status
                </th>
                <th scope="col" className="px-2 py-3">
                  Send time (IST)
                </th>
                <th scope="col" className="px-2 py-3 text-right">
                  Delivered
                </th>
                <th scope="col" className="px-2 py-3 text-right">
                  Opens
                </th>
                <th scope="col" className="px-2 py-3 text-right">
                  Clicks
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const send = sends.find((x) => x.issueId === String(d.id));
                const st = statusOf(String(d.id), d.sentOn);
                return (
                  <tr key={String(d.id)} className="border-t border-default align-top">
                    <td className="px-4 py-3">
                      <span className="block type-label">{d.title}</span>
                      <span className="block type-caption text-secondary">
                        {send?.subject || "Subject not set yet"}
                      </span>
                    </td>
                    <td className="px-2 py-3 type-body-sm">All subscribers · {audience.toLocaleString("en-IN")}</td>
                    <td className="px-2 py-3">
                      <StatusBadge
                        status={st}
                        tone={st === "Sent" ? "success" : st === "Scheduled" ? "progress" : "neutral"}
                      />
                    </td>
                    <td className="px-2 py-3 type-body-sm">{send?.sendAt ? formatIstDateTime(send.sendAt) : "—"}</td>
                    <td className="px-2 py-3 text-right type-mono">
                      {send?.delivered ? send.delivered.toLocaleString("en-IN") : "—"}
                    </td>
                    <td className="px-2 py-3 text-right type-mono">{send?.opens ?? "—"}</td>
                    <td className="px-2 py-3 text-right type-mono">{send?.clicks ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/content/newsletter/${String(d.id)}`}
                        className={buttonClasses({ variant: "outline", size: "sm" })}
                      >
                        {st === "Draft" ? "Continue" : "Open"}
                        <span className="sr-only"> {d.title}</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="type-caption text-secondary">Opens and clicks show only as the email provider reports them.</p>
      </>
    );
  } else {
    body = (
      <div className="rounded-card border border-default bg-page">
        <EmptyState
          icon="newspaper"
          title={`${counts[tab]?.toLocaleString("en-IN") ?? "0"} ${TABS.find((t) => t.key === tab)?.label.toLowerCase() ?? ""}`}
          action={
            <Link href={CMS[tab] ?? "/cms"} className={buttonClasses({})}>
              Open in the CMS
            </Link>
          }
        >
          These are written and edited in the CMS, with the editorial workflow and its checks.
        </EmptyState>
      </div>
    );
  }

  return (
    <AdminShell userId={userId} current="/admin/content" title="Content">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">Content</h1>
          <p className="type-body-sm text-secondary">
            {tab === "quality"
              ? `Records nobody has checked for ${String(STALE_DAYS)} days or more, and changes spotted on official sources. Verify against the source, or edit if something changed.`
              : tab === "newsletter"
                ? "India H₂ Weekly and special editions. Build from auto-filled sections, test, then schedule in IST."
                : "Articles, records, media and authors."}
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "newsletter" ? (
            <Link href="/cms/collections/newsletter-issues/create" className={buttonClasses({})}>
              <Icon name="plus" size={16} />
              New issue
            </Link>
          ) : (
            <>
              <Link href="/cms" className={buttonClasses({ variant: "outline" })}>
                <Icon name="plus" size={16} />
                New record
              </Link>
              <Link href="/cms/collections/articles/create" className={buttonClasses({})}>
                <Icon name="plus" size={16} />
                New article
              </Link>
            </>
          )}
        </div>
      </div>
      <nav aria-label="Content" className="flex gap-6 overflow-x-auto border-b border-default">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/content?tab=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 py-3 whitespace-nowrap type-label",
              t.key === tab ? "border-inverse" : "border-transparent text-secondary",
            )}
          >
            {t.label} <span className="text-secondary">{counts[t.key]?.toLocaleString("en-IN")}</span>
          </Link>
        ))}
      </nav>
      {body}
    </AdminShell>
  );
}
