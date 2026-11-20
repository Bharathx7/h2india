import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { catalogueTree, categoryRequestQueue } from "@h2india/core/catalogue/taxonomy";
import { buttonClasses, cx, EmptyState, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";
import { AddCategoryButton } from "../AddCategoryButton";
import { CatalogueTabs } from "../CatalogueTabs";
import { categoryRows } from "../summary";

// Catalogue · Categories (founder, 20 Nov 2026): every category and sub-category of a class in one table, with how
// many product fields it has, its live products and whether it's shown. A row opens the category's own page.
export const metadata: Metadata = { title: "Categories · Catalogue · H2 Economy admin", robots: { index: false } };

const SHOW = [
  { key: "all", label: "All" },
  { key: "hidden", label: "Hidden" },
  { key: "no-fields", label: "No product fields" },
  { key: "sample", label: "Sample" },
] as const;

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; show?: string; q?: string; page?: string; perPage?: string }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("catalogue.view", "/admin/catalogue/categories");
  const db = getDb();
  const [tree, requests] = await Promise.all([
    catalogueTree(db, actor),
    can(actor, "queues.view") ? categoryRequestQueue(db, actor) : Promise.resolve([]),
  ]);
  const cls = tree.find((c) => c.id === sp.class)?.id ?? null;
  const show = SHOW.find((x) => x.key === sp.show)?.key ?? "all";
  const q = sp.q?.trim().toLowerCase() ?? "";
  const rows = categoryRows(tree).filter(
    (r) =>
      (!cls || r.classId === cls) &&
      (show === "all" ||
        (show === "hidden" ? r.hidden : show === "sample" ? r.sample : r.depth === 0 && r.fields === 0)) &&
      (!q || r.label.toLowerCase().includes(q) || (r.parentLabel ?? "").toLowerCase().includes(q)),
  );
  const paged = pageOf(rows, pageRequest(sp));
  const link = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const next = { class: cls, show: show === "all" ? null : show, q: sp.q ?? null, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/catalogue/categories${s ? `?${s}` : ""}`;
  };
  const chip = (here: boolean) =>
    cx(
      "inline-flex h-9 items-center rounded-pill border-[1.5px] px-3 type-label",
      here ? "border-transparent bg-inverse text-inverse" : "border-control bg-page",
    );

  return (
    <AdminShell userId={userId} current="/admin/catalogue">
      <CatalogueTabs current="categories" requests={requests.length} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Class" className="flex flex-wrap gap-2">
          <Link href={link({ class: null, page: null })} aria-current={cls ? undefined : "page"} className={chip(!cls)}>
            All classes
          </Link>
          {tree.map((c) => (
            <Link
              key={c.id}
              href={link({ class: c.id })}
              aria-current={cls === c.id ? "page" : undefined}
              className={chip(cls === c.id)}
            >
              {c.label}
            </Link>
          ))}
        </nav>
        {can(actor, "catalogue.edit") ? (
          <AddCategoryButton tree={tree} classId={cls ?? tree[0]?.id ?? "systems"} />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form action="/admin/catalogue/categories" method="get" role="search" className="flex gap-2">
          {cls ? <input type="hidden" name="class" value={cls} /> : null}
          {show !== "all" ? <input type="hidden" name="show" value={show} /> : null}
          <label className="flex h-10 items-center gap-2 rounded-input border border-input bg-page px-3 focus-within:border-focus">
            <Icon name="search" size={16} className="text-icon-secondary" />
            <span className="sr-only">Search categories</span>
            <input
              type="search"
              name="q"
              defaultValue={sp.q}
              placeholder="Search categories"
              className="h-full w-56 bg-transparent type-body-sm focus-visible:outline-none"
            />
          </label>
        </form>
        <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
          {SHOW.map((x) => (
            <Link
              key={x.key}
              href={link({ show: x.key === "all" ? null : x.key })}
              aria-current={show === x.key ? "page" : undefined}
              className={chip(show === x.key)}
            >
              {x.label}
            </Link>
          ))}
        </div>
      </div>

      {paged.rows.length ? (
        <div
          tabIndex={0}
          role="region"
          aria-label="Categories"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  Category
                </th>
                <th scope="col" className="px-2 py-3">
                  Class
                </th>
                <th scope="col" className="px-2 py-3 text-right">
                  Sub-categories
                </th>
                <th scope="col" className="px-2 py-3 text-right">
                  Product fields
                </th>
                <th scope="col" className="px-2 py-3 text-right">
                  Live products
                </th>
                <th scope="col" className="px-2 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((r) => (
                <tr key={r.id} className="border-t border-default">
                  <th scope="row" className="px-4 py-3 text-left">
                    <span className={cx("flex flex-col", r.depth === 1 && "pl-6")}>
                      <Link
                        href={`/admin/catalogue/categories/${r.id}`}
                        className="type-label text-primary hover:underline"
                      >
                        {r.label}
                      </Link>
                      {r.parentLabel ? <span className="type-caption text-secondary">in {r.parentLabel}</span> : null}
                    </span>
                  </th>
                  <td className="px-2 py-3 type-body-sm">{r.classLabel}</td>
                  <td className="px-2 py-3 text-right type-mono">{r.depth === 0 ? r.subCategories : "—"}</td>
                  <td className="px-2 py-3 text-right type-mono">{r.fields}</td>
                  <td className="px-2 py-3 text-right type-mono">{r.liveProducts.toLocaleString("en-IN")}</td>
                  <td className="px-2 py-3">
                    <span className="flex flex-wrap gap-1">
                      <StatusBadge status={r.hidden ? "Hidden" : "Shown"} tone={r.hidden ? "neutral" : "success"} />
                      {r.sample ? <StatusBadge status="Sample" tone="warning" /> : null}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/catalogue/categories/${r.id}`}
                      className={buttonClasses({ variant: "outline", size: "sm" })}
                    >
                      Open<span className="sr-only"> {r.label}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-card border border-default bg-page">
          <EmptyState title="No categories match">Try another class, filter or word.</EmptyState>
        </div>
      )}
      <ListPager paged={paged} query={pagingQuery(sp)} />
    </AdminShell>
  );
}
