import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { buttonClasses, EmptyState, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { contentType, listRecords } from "@/admin/cms/records";
import { VERIFIED_SLUGS } from "@/admin/cms/registry";
import { cmsSession } from "@/admin/cms/session";
import { ContentUpload } from "@/admin/cms/Upload";
import { ContentHeader, ContentTabs, contentCounts } from "@/admin/cms/ContentTabs";
import { AdminShell, requireOperator } from "@/admin/shell";
import { ListPager } from "@/components/ListPager";
import { pageRequest, pagingQuery } from "@/lib/paging";

// A content library (step 4.6): every record of one type, newest change first, with search, its status and when it
// was last verified. Media and report files also take uploads here.
export const metadata: Metadata = { title: "Content · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>;
  searchParams: Promise<{ q?: string; page?: string; perPage?: string }>;
}) {
  const { collection } = await params;
  const sp = await searchParams;
  const { userId } = await requireOperator("content.view", `/admin/content/${collection}`);
  const cms = await cmsSession();
  if (!cms) notFound();
  const type = contentType(cms.payload, collection);
  if (!type) notFound();
  const q = sp.q?.trim() ?? "";
  const req = pageRequest(sp);
  const list = await listRecords(cms, type, { q, page: req.page, perPage: req.perPage });
  const query = pagingQuery(sp);
  // A page past the end (the list shrank, or an old link) goes to the last page, like the other workspace lists.
  if (!list.rows.length && list.total > 0 && req.page > 1) {
    redirect(
      `/admin/content/${collection}?${new URLSearchParams({ ...query, page: String(Math.max(1, list.pages)), perPage: String(req.perPage) }).toString()}`,
    );
  }
  const verified = VERIFIED_SLUGS.includes(collection);
  const gallery = type.upload && collection === "media";
  const tabbed = collection === "media" || collection === "authors";
  // Authors (649:730): how many articles each has written.
  const articleCounts = new Map<number, number>();
  const people = new Map<number, { title: string | null; organisation: string | null; kind: string }>();
  if (collection === "authors") {
    const found = await cms.payload.find({
      collection: "authors",
      where: { id: { in: list.rows.map((r) => r.id) } },
      limit: list.rows.length || 1,
      depth: 0,
      overrideAccess: true,
    });
    for (const a of found.docs)
      people.set(a.id, { title: a.title ?? null, organisation: a.organisation ?? null, kind: a.kind });
    const res = await cms.payload.find({
      collection: "articles",
      draft: true,
      limit: 5000,
      depth: 0,
      pagination: false,
      select: { authors: true },
      overrideAccess: true,
    });
    for (const a of res.docs)
      for (const x of a.authors) {
        const id = typeof x === "object" ? x.id : x;
        articleCounts.set(id, (articleCounts.get(id) ?? 0) + 1);
      }
  }

  return (
    <AdminShell userId={userId} current="/admin/content" title="Content">
      {tabbed ? (
        <>
          <ContentHeader
            intro={
              collection === "media"
                ? "Images used across H2 Economy. Every image needs alt text before it can be used."
                : "Everyone who writes for H2 Economy. Readers see the author under the article."
            }
            actions={
              collection === "authors" && cms.can("content.edit") ? (
                <Link href="/admin/content/authors/new" className={buttonClasses({})}>
                  <Icon name="plus" size={16} />
                  Add author
                </Link>
              ) : null
            }
          />
          <ContentTabs
            current={collection === "media" ? "media" : "authors"}
            counts={await contentCounts(cms.payload)}
          />
        </>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Link
              href="/admin/content?tab=records"
              className="inline-flex items-center gap-1 type-label text-secondary"
            >
              <Icon name="arrow-left" size={16} />
              Content · Records
            </Link>
            <h1 className="type-h2">{type.plural}</h1>
            <p className="type-body-sm text-secondary">{list.total.toLocaleString("en-IN")} in all</p>
          </div>
          {cms.can("content.edit") && !type.upload ? (
            <Link href={`/admin/content/${collection}/new`} className={buttonClasses({})}>
              <Icon name="plus" size={16} />
              New {type.singular.toLowerCase()}
            </Link>
          ) : null}
        </div>
      )}

      {type.upload && cms.can("content.edit") ? (
        <ContentUpload
          slug={collection}
          accept={collection === "media" ? "image/jpeg,image/png,image/webp" : "application/pdf"}
          needsAlt={collection === "media"}
          maxLabel={collection === "media" ? "JPEG, PNG or WebP. No SVG." : "PDF only. Kept private."}
        />
      ) : null}

      <form action={`/admin/content/${collection}`} role="search" className="flex gap-2">
        <label htmlFor="library-search" className="sr-only">
          Search {type.plural.toLowerCase()}
        </label>
        <input
          id="library-search"
          name="q"
          defaultValue={q}
          placeholder={`Search ${type.plural.toLowerCase()}`}
          className="h-10 w-80 max-w-full rounded-input border-[1.5px] border-control bg-page px-3 type-body-sm"
        />
        <button type="submit" className={buttonClasses({ variant: "outline" })}>
          Search
        </button>
        {q ? (
          <Link href={`/admin/content/${collection}`} className={buttonClasses({ variant: "ghost" })}>
            Clear
          </Link>
        ) : null}
      </form>

      {!list.rows.length ? (
        <div className="rounded-card border border-default bg-page">
          <EmptyState
            kind={q ? "no-results" : "first-use"}
            icon="folder"
            title={q ? `No ${type.plural.toLowerCase()} match` : `No ${type.plural.toLowerCase()} yet`}
          >
            {q ? "Try other words." : type.upload ? "Upload the first file above." : "Add the first one."}
          </EmptyState>
        </div>
      ) : gallery ? (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          {list.rows.map((r) => (
            <li key={r.id} className="flex flex-col overflow-hidden rounded-card border border-default bg-page">
              <Link href={`/admin/content/media/${String(r.id)}`} className="flex flex-col">
                {r.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element -- CMS images come from the storage domain.
                  <img src={r.thumbnail} alt="" className="aspect-[4/3] w-full bg-subtle object-cover" />
                ) : (
                  <span className="flex aspect-[4/3] items-center justify-center bg-subtle">
                    <Icon name="image" size={24} />
                  </span>
                )}
                <span className="flex flex-col gap-1 p-3">
                  <span className="line-clamp-2 type-label">{r.title}</span>
                  {r.detail ? <span className="type-caption text-secondary">{r.detail}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : collection === "authors" ? (
        <div
          tabIndex={0}
          role="region"
          aria-label="Authors"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  Author
                </th>
                <th scope="col" className="px-2 py-3">
                  Role
                </th>
                <th scope="col" className="px-2 py-3">
                  Organisation
                </th>
                <th scope="col" className="px-2 py-3 text-right">
                  Articles
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((r) => {
                const p = people.get(r.id);
                const initials = r.title
                  .split(/\s+/)
                  .map((w) => w.charAt(0))
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <tr key={r.id} className="border-t border-default">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-mint type-caption">
                          {initials}
                        </span>
                        <span className="flex flex-col">
                          <Link href={`/admin/content/authors/${String(r.id)}`} className="type-label hover:underline">
                            {r.title}
                          </Link>
                          {p?.kind === "contributor" ? <StatusBadge status="External" tone="neutral" /> : null}
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-3 type-body-sm">
                      {p?.title ??
                        (p?.kind === "contributor" ? "Contributor" : p?.kind === "organisation" ? "Organisation" : "—")}
                    </td>
                    <td className="px-2 py-3 type-body-sm">{p?.organisation ?? "—"}</td>
                    <td className="px-2 py-3 text-right type-body-sm tabular-nums">{articleCounts.get(r.id) ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/content/authors/${String(r.id)}`}
                        className={buttonClasses({ variant: "outline", size: "sm" })}
                      >
                        Open<span className="sr-only"> {r.title}</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label={type.plural}
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  {type.singular}
                </th>
                {type.drafts ? (
                  <th scope="col" className="px-2 py-3">
                    State
                  </th>
                ) : null}
                <th scope="col" className="px-2 py-3">
                  Status
                </th>
                {verified ? (
                  <th scope="col" className="px-2 py-3">
                    Last verified
                  </th>
                ) : null}
                <th scope="col" className="px-2 py-3">
                  Updated (IST)
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((r) => (
                <tr key={r.id} className="border-t border-default">
                  <td className="px-4 py-3">
                    <Link href={`/admin/content/${collection}/${String(r.id)}`} className="type-label hover:underline">
                      {r.title}
                    </Link>
                    {r.sample ? <span className="ml-2 type-caption text-secondary">Sample</span> : null}
                  </td>
                  {type.drafts ? (
                    <td className="px-2 py-3">
                      <StatusBadge
                        status={r.published ? "Published" : "Draft"}
                        tone={r.published ? "success" : "neutral"}
                      />
                    </td>
                  ) : null}
                  <td className="px-2 py-3 type-body-sm">{r.status ?? "—"}</td>
                  {verified ? (
                    <td className="px-2 py-3 type-body-sm">
                      {r.verifiedAt ? formatIstDate(new Date(r.verifiedAt)) : "Never"}
                    </td>
                  ) : null}
                  <td className="px-2 py-3 type-body-sm">{formatIstDateTime(new Date(r.updatedAt))}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/content/${collection}/${String(r.id)}`}
                      className={buttonClasses({ variant: "outline", size: "sm" })}
                    >
                      <Icon name="pencil" size={14} />
                      Edit<span className="sr-only"> {r.title}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.rows.length ? (
        <ListPager paged={{ page: list.page, perPage: req.perPage, total: list.total }} query={query} />
      ) : null}
    </AdminShell>
  );
}
