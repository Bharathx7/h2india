import { Alert, buttonClasses, cx, EmptyState, Pagination, SchemeCard, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GRANT_APPLICANTS, GRANT_THEMES } from "@/cms/records/opportunities";
import { forcedState } from "@/lib/dev-state";
import { LIST_PER_PAGE, pageSlice, pagingQuery } from "@/lib/paging";
import { allGrants } from "@/opportunities/data";
import { ListFilters, SortBy, type FilterGroupSpec } from "@/opportunities/filters";
import { CardsLoading, Crumbs, LoadError, memberHref, ViewToggle, wrap } from "@/opportunities/parts";
import {
  DEFAULT_GRANT_STATUSES,
  filterGrants,
  GRANT_STATUS_FILTERS,
  grantView,
  type GrantView,
} from "@/opportunities/views";
import { siteViewer } from "@/server/site";

// Grants and calls for proposals (462:4609, step 5.5). Each call links to the funder's notice; nobody applies on H2
// India. Alerts arrive with member accounts (step 7.3, A71).

export const metadata: Metadata = {
  title: "Grants and calls for proposals · H2 Economy",
  description: "Research and start-up funding for hydrogen in India, with deadlines and the funder's official call.",
  alternates: { canonical: "/opportunities/grants" },
};
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const one = (v: string | string[] | undefined) => all(v)[0] ?? "";

function queryOf(params: Params, change: Record<string, string | null> = {}): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (k !== "view" && !(k in change)) for (const x of all(v)) q.append(k, x);
  for (const [k, v] of Object.entries(change)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export default async function GrantsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const forced = forcedState(one(params.view));
  // The site layout has already loaded the viewer (cached), so the loading state links like the loaded one: a
  // signed-in reader who clicks Create alert before the list arrives isn't sent to sign in.
  const signedIn = Boolean(await siteViewer());
  const loading = (
    <Shell counts={null} params={params} signedIn={signedIn}>
      <CardsLoading label="Loading grants" />
    </Shell>
  );
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      {forced === "loading" ? (
        loading
      ) : (
        <Suspense fallback={loading}>
          <List params={params} forced={forced} />
        </Suspense>
      )}
    </main>
  );
}

function Shell({
  counts,
  params,
  signedIn,
  children,
}: {
  counts: { open: number; week: number } | null;
  params: Params;
  signedIn: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className={cx(wrap, "flex flex-col gap-3 pt-6 md:pt-8")}>
        <Crumbs items={[{ label: "Opportunities", href: "/opportunities" }, { label: "Grants & calls" }]} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="type-h1 text-primary">Grants and calls for proposals</h1>
            <p className="type-body text-body">
              Research and start-up funding for hydrogen in India.
              {counts ? ` ${String(counts.open)} open · ${String(counts.week)} closing this week` : ""}
            </p>
          </div>
          <Link
            href={memberHref(signedIn, "/member/alerts?type=grants")}
            className={buttonClasses({ variant: "primary", size: "lg" })}
          >
            Create alert
          </Link>
        </div>
        <div className="hidden justify-end md:flex">
          <ViewToggle
            current={one(params.as) === "table" ? "table" : "cards"}
            hrefFor={(v) =>
              `/opportunities/grants${queryOf(params, { as: v === "table" ? "table" : null, page: null })}#list`
            }
          />
        </div>
      </div>
      <div id="list" className={cx(wrap, "scroll-mt-24 pb-16 pt-4")}>
        {children}
      </div>
    </>
  );
}

async function List({ params, forced }: { params: Params; forced: ReturnType<typeof forcedState> }) {
  const viewer = await siteViewer();
  const signedIn = Boolean(viewer);
  let grants;
  try {
    if (forced === "error") throw new Error("Forced error (?view=error)");
    grants = await allGrants();
  } catch (error) {
    console.error("[grants] list failed", error);
    return (
      <Shell counts={null} params={params} signedIn={signedIn}>
        <LoadError what="grants" retry={`/opportunities/grants${queryOf(params)}`} />
      </Shell>
    );
  }
  const now = new Date();
  const views = grants.map((g) => grantView(g, now));
  const open = views.filter((v) => v.statusKey === "Open" || v.statusKey === "Closing soon");
  const week = views.filter((v) => v.statusKey === "Closing soon").length;
  const statuses = all(params.status).filter((s) => GRANT_STATUS_FILTERS.some((f) => f.value === s));
  let list = filterGrants(views, {
    funders: all(params.funder),
    themes: all(params.theme),
    who: all(params.who),
    statuses,
  });
  const sort = one(params.sort);
  list = [...list].sort((a, b) =>
    sort === "name" ? a.title.localeCompare(b.title) : a.deadlineAt.localeCompare(b.deadlineAt),
  );
  if (forced === "empty") list = [];
  const shown = pageSlice(list, params.page);
  const groups: FilterGroupSpec[] = [
    {
      kind: "checks",
      name: "funder",
      title: "Funder",
      options: [...new Set(views.map((v) => v.funder))].sort().map((v) => ({ value: v, label: v })),
    },
    { kind: "checks", name: "theme", title: "Theme", options: GRANT_THEMES.map((v) => ({ value: v, label: v })) },
    {
      kind: "checks",
      name: "who",
      title: "Who can apply",
      options: GRANT_APPLICANTS.map((v) => ({ value: v, label: v })),
    },
    {
      kind: "checks",
      name: "status",
      title: "Status",
      options: GRANT_STATUS_FILTERS,
      defaults: DEFAULT_GRANT_STATUSES,
    },
  ];
  const table = one(params.as) === "table";

  return (
    <Shell counts={{ open: open.length, week }} params={params} signedIn={signedIn}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="lg:w-60 lg:shrink-0">
          <ListFilters groups={groups} count={list.length} noun="grants and calls" />
        </div>
        <section aria-label="Grants and calls" className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="type-label text-primary" role="status">
              {list.length} grants and calls
            </p>
            <SortBy
              options={[
                { value: "", label: "Deadline, soonest" },
                { value: "name", label: "Name" },
              ]}
            />
          </div>
          {list.length ? (
            <>
              <div className={cx(table && "md:hidden")}>
                <Cards items={shown.items} signedIn={signedIn} />
              </div>
              {table ? (
                <div className="hidden md:block">
                  <Table items={shown.items} />
                </div>
              ) : null}
              {shown.total > LIST_PER_PAGE ? (
                <Pagination
                  page={shown.page}
                  perPage={LIST_PER_PAGE}
                  total={shown.total}
                  perPageOptions={[LIST_PER_PAGE]}
                  query={pagingQuery(params)}
                />
              ) : null}
            </>
          ) : (
            <div className="rounded-card border border-default bg-page py-8">
              <EmptyState
                kind="no-results"
                title="No grants or calls match these filters"
                action={
                  <Link href="/opportunities/grants#list" className={buttonClasses({ variant: "outline" })}>
                    Clear all filters
                  </Link>
                }
              >
                Try removing a filter, or create an alert for the next call.
              </EmptyState>
            </div>
          )}
          <Alert tone="success" title="Check the official call before you apply">
            Amounts, eligibility and dates come from the funder’s notice. Each call links to it.
          </Alert>
        </section>
      </div>
    </Shell>
  );
}

function Cards({ items, signedIn }: { items: GrantView[]; signedIn: boolean }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((g) => (
        <li key={g.id}>
          <SchemeCard
            level={g.level}
            status={g.status}
            title={g.title}
            benefit={g.benefit}
            who={g.who}
            deadline={g.deadline}
            verified={g.verified}
            href={g.href}
            saveHref={memberHref(signedIn, `/member/saved?grant=${g.slug}`)}
            alertHref={memberHref(signedIn, `/member/alerts?grant=${g.slug}`)}
          />
        </li>
      ))}
    </ul>
  );
}

function Table({ items }: { items: GrantView[] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-default">
      <table className="w-full min-w-180 text-left">
        <thead className="bg-subtle type-label-sm text-secondary">
          <tr>
            {["Funder", "Call", "Who can apply", "Deadline", "Status"].map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="type-body-sm text-primary">
          {items.map((g) => (
            <tr key={g.id} className="border-t border-default">
              <td className="px-4 py-3 type-label-sm">{g.funder}</td>
              <td className="max-w-80 px-4 py-3">
                <Link href={g.href} className="type-label text-primary hover:underline">
                  {g.title}
                </Link>
                <p className="type-caption text-secondary">{g.benefit}</p>
              </td>
              <td className="px-4 py-3">{g.who.join(", ")}</td>
              <td className="px-4 py-3">{g.deadline}</td>
              <td className="px-4 py-3">
                <StatusBadge status={g.status.label} tone={g.status.tone} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
