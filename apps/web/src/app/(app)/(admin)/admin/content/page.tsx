import config from "@payload-config";
import { getDb } from "@h2india/core";
import { confirmedCount, listSends } from "@h2india/core/newsletter/sends";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { buttonClasses, cx, EmptyState, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import { MarkVerified } from "@/admin/content/Controls";
import { requireOperator } from "@/admin/shell";
import { possibleUpdates, RED_DAYS, STALE_DAYS, staleRecords } from "@/cms/records/quality";
import { ArticlesLibrary } from "@/admin/cms/ArticlesLibrary";
import { ContentFrame, ContentPageHead, type ContentPlace } from "@/admin/cms/ContentFrame";
import { AllContent, ContentHome, SearchResults, SectionView } from "@/admin/cms/ContentViews";
import { sectionById } from "@/admin/cms/sections";
import { cmsSession } from "@/admin/cms/session";
import { notFound } from "next/navigation";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";

// Content (step 11.3): Articles, Records, Newsletter (647:8), Media, Authors and Data quality (646:9, 646:733).
// Articles (638:8, 642:326), records, media (649:8) and authors (649:730) open the native editors.
// Founder (20 Nov 2026: "too confusing"): /admin/content opens on a content home (needs attention, create, recently
// changed, search), with a side menu of plain-language sections; ?section= opens one section and ?tab=records shows
// every section. The Articles, Newsletter and Data quality views are unchanged inside the new frame.
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
    section?: string;
  }>;
}) {
  const sp = await searchParams;
  const { userId } = await requireOperator("content.view", "/admin/content");
  const tab = (["articles", "records", "newsletter", "quality"] as const).find((t) => t === sp.tab);
  const section = sectionById(sp.section);
  if (!tab) {
    const cms = await cmsSession();
    if (!cms) notFound();
    const q = sp.q?.trim() ?? "";
    // A section that is really a tab (Articles, Newsletter) opens that tab's address.
    const place: ContentPlace = section ? section.id : "home";
    return (
      <ContentFrame userId={userId} current={place}>
        {section && section.types.length ? (
          <SectionView cms={cms} section={section} />
        ) : q ? (
          <SearchResults cms={cms} q={q} />
        ) : (
          <ContentHome cms={cms} />
        )}
      </ContentFrame>
    );
  }
  if (tab === "records") {
    const cms = await cmsSession();
    if (!cms) notFound();
    return (
      <ContentFrame userId={userId} current={undefined}>
        <AllContent cms={cms} />
      </ContentFrame>
    );
  }
  const payload = await getPayload({ config });
  const db = getDb();
  const [stale, updates] =
    tab === "quality" ? await Promise.all([staleRecords(payload), possibleUpdates(payload)]) : [[], []];

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
                          <Link
                            href={`/admin/content/${r.collection}/${String(r.id)}`}
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
                  href={`/admin/content/source-changes/${String(u.id)}`}
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
  } else {
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
  }

  const head =
    tab === "quality" ? (
      <ContentPageHead
        back={{ href: "/admin/content", label: "Content home" }}
        title="Data quality"
        intro={`Records nobody has checked for ${String(STALE_DAYS)} days or more, and changes spotted on official sources. Verify against the source, or edit if something changed.`}
      />
    ) : tab === "newsletter" ? (
      <ContentPageHead
        back={{ href: "/admin/content", label: "Content home" }}
        title="Newsletter"
        intro="H2 Economy Weekly and special editions. Build from auto-filled sections, test, then schedule in IST."
        actions={
          <Link href="/admin/content/newsletter-issues/new" className={buttonClasses({})}>
            <Icon name="plus" size={16} />
            New issue
          </Link>
        }
      />
    ) : (
      <ContentPageHead
        back={{ href: "/admin/content", label: "Content home" }}
        title="Articles"
        intro="News, insights, press releases and sponsored posts. Every article is reviewed before it's published, and a published one keeps a corrections log."
        actions={
          <Link href="/admin/content/articles/new" className={buttonClasses({})}>
            <Icon name="plus" size={16} />
            New article
          </Link>
        }
      />
    );

  return (
    <ContentFrame userId={userId} current={tab}>
      {head}
      {body}
    </ContentFrame>
  );
}
