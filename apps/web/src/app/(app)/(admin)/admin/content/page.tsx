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
import { possibleUpdates, RED_DAYS, STALE_DAYS, staleRecords } from "@/cms/records/quality";
import { ArticlesLibrary } from "@/admin/cms/ArticlesLibrary";
import { ContentHeader, ContentTabs, contentCounts } from "@/admin/cms/ContentTabs";
import { CONTENT_GROUPS, CONTENT_SLUGS } from "@/admin/cms/registry";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";

// Content (step 11.3): Articles, Records, Newsletter (647:8), Media, Authors and Data quality (646:9, 646:733).
// Articles (638:8, 642:326), records, media (649:8) and authors (649:730) open the native editors.
export const metadata: Metadata = { title: "Content · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

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
  searchParams: Promise<{
    tab?: string;
    view?: string;
    status?: string;
    q?: string;
    type?: string;
    author?: string;
    sort?: string;
    page?: string;
    perPage?: string;
  }>;
}) {
  const sp = await searchParams;
  const { userId } = await requireOperator("content.view", "/admin/content");
  const tab = (["articles", "records", "newsletter", "quality"] as const).find((t) => t === sp.tab) ?? "quality";
  const payload = await getPayload({ config });
  const db = getDb();
  const [counts, stale, updates] = await Promise.all([
    contentCounts(payload),
    staleRecords(payload),
    possibleUpdates(payload),
  ]);

  let body: React.ReactNode;
  if (tab === "articles") {
    body = <ArticlesLibrary payload={payload} sp={sp} />;
  } else if (tab === "quality") {
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
                  {pageOf(stale, pageRequest(sp)).rows.map((r) => (
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
                          {/* The built-in editor where the collection has one (founder QC: this always opened /cms). */}
                          <Link
                            href={
                              CONTENT_SLUGS.includes(r.collection)
                                ? `/admin/content/${r.collection}/${String(r.id)}`
                                : `/cms/collections/${r.collection}/${String(r.id)}`
                            }
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
            {pageOf(updates, pageRequest(sp)).rows.map((u) => (
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
        <ListPager
          paged={pageOf<unknown>(view === "stale" ? stale : updates, pageRequest(sp))}
          query={pagingQuery(sp)}
        />
        <p className="type-caption text-secondary">
          {view === "stale" ? stale.length : updates.length} in all · red after {RED_DAYS} days
        </p>
      </>
    );
  } else if (tab === "newsletter") {
    const [all, sends, audience] = await Promise.all([
      payload.find({ collection: "newsletter-issues", sort: "-number", limit: 1000, depth: 0, overrideAccess: true }),
      listSends(db),
      confirmedCount(db),
    ]);
    const statusOf = (id: string, sentOn: string | null | undefined) =>
      sends.find((x) => x.issueId === id)?.status ?? (sentOn && new Date(sentOn) < new Date() ? "Sent" : "Draft");
    const filter = sp.status;
    const matching = all.docs.filter((d) => !filter || statusOf(String(d.id), d.sentOn) === filter);
    // Paged (founder QC, 17 Nov 2026: the list stopped at 100 issues).
    const paged = pageOf(matching, pageRequest(sp));
    const rows = paged.rows;
    /** Opens and clicks as a share of delivered (647:8), only once the provider reports them (M6). */
    const share = (x: number | null | undefined, of: number | undefined) =>
      x === null || x === undefined || !of ? "—" : `${(Math.round((x / of) * 1000) / 10).toFixed(1)}%`;
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
                    <td className="px-2 py-3 text-right type-mono">{share(send?.opens, send?.delivered)}</td>
                    <td className="px-2 py-3 text-right type-mono">{share(send?.clicks, send?.delivered)}</td>
                    <td className="px-4 py-3 text-right">
                      {st === "Sent" ? (
                        <Link
                          href={`/admin/content/newsletter/${String(d.id)}/stats`}
                          className={buttonClasses({ variant: "ghost", size: "sm" })}
                        >
                          Stats<span className="sr-only"> {d.title}</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/content/newsletter/${String(d.id)}`}
                          className={buttonClasses({ variant: "outline", size: "sm" })}
                        >
                          {st === "Draft" ? "Continue" : "Open"}
                          <span className="sr-only"> {d.title}</span>
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ListPager paged={paged} query={pagingQuery(sp)} />
        <p className="type-caption text-secondary">Opens and clicks show only as the email provider reports them.</p>
      </>
    );
  } else {
    const groups = await Promise.all(
      CONTENT_GROUPS.map(async (g) => ({
        label: g.label,
        items: await Promise.all(
          g.slugs.map(async (slug) => ({
            slug,
            label: payload.collections[slug].config.labels.plural as string,
            count: (await payload.count({ collection: slug, overrideAccess: true })).totalDocs,
          })),
        ),
      })),
    );
    body = (
      <>
        {groups.map((g) => (
          <section key={g.label} className="flex flex-col gap-3">
            <h2 className="type-h5">{g.label}</h2>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {g.items.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/admin/content/${c.slug}`}
                    className="flex items-center justify-between gap-3 rounded-card border border-default bg-page p-4 hover:border-focus"
                  >
                    <span className="type-label">{c.label}</span>
                    <span className="type-mono text-secondary">{c.count.toLocaleString("en-IN")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section className="flex flex-col gap-3">
          <h2 className="type-h5">Site settings</h2>
          <Link
            href="/admin/content/settings"
            className="flex w-fit items-center gap-2 rounded-card border border-default bg-page p-4 type-label hover:border-focus"
          >
            <Icon name="sliders" size={16} />
            Home figures, company details, pricing, tracker pages and more
          </Link>
        </section>
      </>
    );
  }

  return (
    <AdminShell userId={userId} current="/admin/content" title="Content">
      <ContentHeader
        intro={
          tab === "quality"
            ? `Records nobody has checked for ${String(STALE_DAYS)} days or more, and changes spotted on official sources. Verify against the source, or edit if something changed.`
            : tab === "newsletter"
              ? "H2 Economy Weekly and special editions. Build from auto-filled sections, test, then schedule in IST."
              : "Articles and structured records. Everything is reviewed before it's published, and every published piece keeps a corrections log."
        }
        actions={
          tab === "newsletter" ? (
            <Link href="/admin/content/newsletter-issues/new" className={buttonClasses({})}>
              <Icon name="plus" size={16} />
              New issue
            </Link>
          ) : (
            <>
              {/* Records are added from their own list (each has New); this opens the list of record types. */}
              <Link href="/admin/content?tab=records" className={buttonClasses({ variant: "outline" })}>
                <Icon name="folder" size={16} />
                Records
              </Link>
              <Link href="/admin/content/articles/new" className={buttonClasses({})}>
                <Icon name="plus" size={16} />
                New article
              </Link>
            </>
          )
        }
      />
      <ContentTabs current={tab} counts={counts} />
      {body}
    </AdminShell>
  );
}
