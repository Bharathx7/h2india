import { buttonClasses, cx, EmptyState, Icon, StatusBadge } from "@h2india/ui";
import Link from "next/link";
import type { Payload, Where } from "payload";
import { ARTICLE_TYPES, WORKFLOW } from "@/cms/types";

// Content library · Articles (638:8) with its states (642:326): status chips with counts, search by title, author or
// tag, type, author and sort, and the table Title, Type, Author, Status, When with Open.

const PAGE = 20;
const SORTS = [
  { value: "updated", label: "Sort: last updated", sort: "-updatedAt" },
  { value: "title", label: "Sort: title", sort: "title" },
  { value: "created", label: "Sort: newest", sort: "-createdAt" },
] as const;
const TONE: Record<string, "neutral" | "progress" | "warning" | "success"> = {
  Draft: "neutral",
  "In review": "progress",
  "Legal check": "warning",
  Scheduled: "success",
  Published: "success",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
const dayMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });

export interface LibraryParams {
  status?: string;
  q?: string;
  type?: string;
  author?: string;
  sort?: string;
  page?: string;
}

export async function ArticlesLibrary({ payload, sp }: { payload: Payload; sp: LibraryParams }) {
  const q = sp.q?.trim() ?? "";
  const corrections = sp.status === "corrections";
  const status = WORKFLOW.find((w) => w === sp.status);
  const type = ARTICLE_TYPES.find((t) => t.value === sp.type)?.value;
  const author = Number(sp.author) || null;
  const sort = SORTS.find((s) => s.value === sp.sort) ?? SORTS[0];
  const page = Math.max(1, Number(sp.page) || 1);

  // Search covers title, author and tag (638:8).
  const [authorsAll, tagsHit, openCorrections] = await Promise.all([
    payload.find({ collection: "authors", limit: 500, depth: 0, sort: "name", overrideAccess: true }),
    q
      ? payload.find({ collection: "tags", where: { name: { like: q } }, limit: 50, depth: 0, overrideAccess: true })
      : Promise.resolve(null),
    payload.find({
      collection: "corrections",
      where: { status: { equals: "Open" } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
  ]);
  const authorHits = q ? authorsAll.docs.filter((a) => a.name.toLowerCase().includes(q.toLowerCase())) : [];
  const correctionOf = new Map<number, string[]>();
  for (const c of openCorrections.docs) {
    const id = typeof c.article === "object" ? c.article.id : c.article;
    correctionOf.set(id, [...(correctionOf.get(id) ?? []), c.description]);
  }

  const base: Where[] = [];
  if (type) base.push({ type: { equals: type } });
  if (author) base.push({ authors: { contains: author } });
  if (q)
    base.push({
      or: [
        { title: { like: q } },
        ...(authorHits.length ? [{ authors: { in: authorHits.map((a) => a.id) } }] : []),
        ...(tagsHit?.docs.length ? [{ tags: { in: tagsHit.docs.map((t) => t.id) } }] : []),
      ],
    });
  const where = (extra: Where[]): Where => ({ and: [...base, ...extra] });
  const statusWhere = (s: string): Where[] =>
    s === "Draft"
      ? [{ or: [{ workflow: { equals: "Draft" } }, { workflow: { exists: false } }] }]
      : [{ workflow: { equals: s } }];

  const countFor = async (extra: Where[]) =>
    (await payload.count({ collection: "articles", where: where(extra), overrideAccess: true })).totalDocs;
  const correctionIds = [...correctionOf.keys()];
  const [all, ...byStatus] = await Promise.all([
    countFor([]),
    ...WORKFLOW.map((s) => countFor(statusWhere(s))),
    countFor([{ id: { in: correctionIds.length ? correctionIds : [0] } }]),
  ]);
  const correctionCount = byStatus.pop() ?? 0;
  const filterWhere = corrections
    ? [{ id: { in: correctionIds.length ? correctionIds : [0] } }]
    : status
      ? statusWhere(status)
      : [];
  const res = await payload.find({
    collection: "articles",
    draft: true,
    where: where(filterWhere),
    sort: sort.sort,
    limit: PAGE,
    page,
    depth: 1,
    overrideAccess: true,
  });

  const href = (p: Partial<LibraryParams>) => {
    const next = { status: sp.status, q, type, author: author ? String(author) : undefined, sort: sp.sort, ...p };
    const qs = new URLSearchParams({ tab: "articles" });
    for (const [k, v] of Object.entries(next)) if (v) qs.set(k, v);
    return `/admin/content?${qs.toString()}`;
  };
  const chips = [
    { key: undefined, label: "All", n: null as number | null },
    ...WORKFLOW.map((s, i) => ({ key: s, label: s, n: byStatus[i] ?? 0 })),
    { key: "corrections", label: "Corrections open", n: correctionCount },
  ];
  const from = res.totalDocs ? (page - 1) * PAGE + 1 : 0;
  const to = Math.min(page * PAGE, res.totalDocs);

  let empty: React.ReactNode = null;
  if (!res.docs.length) {
    if (q)
      empty = (
        <EmptyState
          kind="no-results"
          icon="search"
          title={`No articles match "${q}"`}
          action={
            <Link href={href({ q: undefined, page: undefined })} className={buttonClasses({})}>
              Clear search
            </Link>
          }
        >
          Try another spelling, or search by author or tag.
        </EmptyState>
      );
    else if (status === "Legal check")
      empty = (
        <EmptyState
          icon="check-circle"
          title="Nothing waiting for a legal check"
          action={
            <Link href="/admin/content?tab=articles" className={buttonClasses({})}>
              See all articles
            </Link>
          }
        >
          Articles flagged for legal review show here until the Editor-in-chief clears them.
        </EmptyState>
      );
    else
      empty = (
        <EmptyState
          icon="newspaper"
          title={all ? "No articles here" : "No articles yet"}
          action={
            all ? (
              <Link href="/admin/content?tab=articles" className={buttonClasses({})}>
                See all articles
              </Link>
            ) : (
              <Link href="/admin/content/articles/new" className={buttonClasses({})}>
                New article
              </Link>
            )
          }
        >
          {all ? "Try another status or filter." : "Write the first story for the newsroom."}
        </EmptyState>
      );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => {
          const here = (sp.status ?? undefined) === c.key || (!c.key && !status && !corrections);
          return (
            <Link
              key={c.key ?? "all"}
              href={href({ status: c.key, page: undefined })}
              aria-current={here ? "page" : undefined}
              className={cx(
                "inline-flex h-9 items-center rounded-pill border-[1.5px] px-3 type-label",
                here ? "border-transparent bg-inverse text-inverse" : "border-control bg-page",
              )}
            >
              {c.n === null ? c.label : `${c.label} · ${c.n.toLocaleString("en-IN")}`}
            </Link>
          );
        })}
      </div>
      <form action="/admin/content" role="search" className="flex flex-wrap gap-3">
        <input type="hidden" name="tab" value="articles" />
        {sp.status ? <input type="hidden" name="status" value={sp.status} /> : null}
        <label className="flex h-11 min-w-64 flex-1 items-center gap-2 rounded-control border-[1.5px] border-control bg-page px-3 md:max-w-sm">
          <Icon name="search" size={18} />
          <span className="sr-only">Search title, author or tag</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search title, author or tag"
            className="h-full flex-1 bg-transparent type-body outline-none"
          />
        </label>
        <select
          name="type"
          defaultValue={type ?? ""}
          aria-label="Type"
          className="h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
        >
          <option value="">Type: all</option>
          {ARTICLE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              Type: {t.label}
            </option>
          ))}
        </select>
        <select
          name="author"
          defaultValue={author ? String(author) : ""}
          aria-label="Author"
          className="h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
        >
          <option value="">Author: anyone</option>
          {authorsAll.docs.map((a) => (
            <option key={a.id} value={a.id}>
              Author: {a.name}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort.value}
          aria-label="Sort"
          className="h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className={buttonClasses({ variant: "outline" })}>
          Apply
        </button>
      </form>
      {empty ? (
        <div className="rounded-card border border-default bg-page">{empty}</div>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label="Articles"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  Title
                </th>
                <th scope="col" className="px-2 py-3">
                  Type
                </th>
                <th scope="col" className="px-2 py-3">
                  Author
                </th>
                <th scope="col" className="px-2 py-3">
                  Status
                </th>
                <th scope="col" className="px-2 py-3">
                  When
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {res.docs.map((d) => {
                const st = d.workflow ?? "Draft";
                const first = d.authors.find((a) => typeof a === "object");
                const open = correctionOf.get(d.id) ?? [];
                const at =
                  st === "Published" ? d.publishedAt : st === "Draft" || st === "In review" ? null : d.publishAt;
                const note =
                  st === "Legal check" && d.legal?.note
                    ? `Flagged: ${d.legal.note}`
                    : open.length
                      ? `${String(open.length)} correction${open.length === 1 ? "" : "s"} open: ${open[0] ?? ""}`
                      : null;
                return (
                  <tr key={String(d.id)} className="border-t border-default">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/content/articles/${String(d.id)}`}
                        className="block type-label hover:underline"
                      >
                        {d.title || "Untitled article"}
                      </Link>
                      {note ? <span className="block type-caption text-warning">{note}</span> : null}
                    </td>
                    <td className="px-2 py-3 type-body-sm">
                      {ARTICLE_TYPES.find((t) => t.value === d.type)?.label ?? d.type}
                    </td>
                    <td className="px-2 py-3">
                      <span className="block type-body-sm">
                        {first && typeof first === "object" ? first.name : "—"}
                      </span>
                      {first && typeof first === "object" && first.title ? (
                        <span className="block type-caption text-secondary">{first.title}</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge status={st} tone={TONE[st] ?? "neutral"} />
                    </td>
                    <td className="px-2 py-3 type-body-sm">{at ? when(at) : `Updated ${dayMonth(d.updatedAt)}`}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/content/articles/${String(d.id)}`}
                        className={buttonClasses({ variant: "outline", size: "sm" })}
                      >
                        Open<span className="sr-only"> {d.title}</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-caption text-secondary">
          Showing {from}–{to} of {res.totalDocs.toLocaleString("en-IN")}
          {" · "}
          <Link href="/admin/content/calendar" className="underline">
            Publishing calendar
          </Link>
        </p>
        <nav aria-label="Pages" className="flex gap-2">
          {page > 1 ? (
            <Link href={href({ page: String(page - 1) })} className={buttonClasses({ variant: "outline", size: "sm" })}>
              Previous
            </Link>
          ) : (
            <span aria-disabled="true" className={cx(buttonClasses({ variant: "outline", size: "sm" }), "opacity-50")}>
              Previous
            </span>
          )}
          {page < res.totalPages ? (
            <Link href={href({ page: String(page + 1) })} className={buttonClasses({ variant: "outline", size: "sm" })}>
              Next
            </Link>
          ) : (
            <span aria-disabled="true" className={cx(buttonClasses({ variant: "outline", size: "sm" }), "opacity-50")}>
              Next
            </span>
          )}
        </nav>
      </div>
    </>
  );
}
