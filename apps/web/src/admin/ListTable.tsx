import { buttonClasses, EmptyState, Icon } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { AutoSelect } from "@/admin/users/Controls";
import { ListPager } from "@/components/ListPager";
import type { Paged } from "@/lib/paging";

// The back office's plain lists (founder QC, 17 Nov 2026: Companies, All products, All RFQs): a search box and
// filters that submit on change, a scrolling table with its region label, the pager, and a no-results state.

export function ListFilters({
  placeholder,
  q,
  selects = [],
}: {
  placeholder: string;
  q: string | undefined;
  selects?: { name: string; label: string; value: string; options: { value: string; label: string }[] }[];
}) {
  return (
    <form method="get" className="flex flex-wrap gap-3">
      <label className="relative min-w-60 flex-1 md:max-w-sm">
        <span className="sr-only">{placeholder}</span>
        <Icon name="search" size={18} className="absolute top-3 left-3 text-icon-secondary" />
        <input
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className="h-11 w-full rounded-control border-[1.5px] border-control bg-page pr-3 pl-10 type-body"
        />
      </label>
      {selects.map((s) => (
        <AutoSelect key={s.name} {...s} />
      ))}
      <button type="submit" className="sr-only">
        Search
      </button>
    </form>
  );
}

export function ListTable({
  label,
  headings,
  children,
  paged,
  query,
  clearHref,
  filtered,
  emptyTitle,
  emptyText,
  minWidth = "min-w-240",
}: {
  label: string;
  headings: string[];
  children: ReactNode;
  paged: Pick<Paged<unknown>, "page" | "perPage" | "total">;
  query: Record<string, string>;
  clearHref: string;
  filtered: boolean;
  emptyTitle: string;
  emptyText: string;
  minWidth?: string;
}) {
  if (!paged.total)
    return (
      <div className="rounded-card border border-default bg-page">
        <EmptyState
          kind={filtered ? "no-results" : "first-use"}
          icon="search"
          title={filtered ? "Nothing matches these filters" : emptyTitle}
          action={
            filtered ? (
              <Link href={clearHref} className={buttonClasses({})}>
                Clear filters
              </Link>
            ) : undefined
          }
        >
          {filtered ? "Check the spelling, or widen the filters." : emptyText}
        </EmptyState>
      </div>
    );
  return (
    <>
      <div
        tabIndex={0}
        role="region"
        aria-label={label}
        className="relative overflow-x-auto rounded-card border border-default bg-page"
      >
        <table className={`w-full ${minWidth}`}>
          <thead>
            <tr className="bg-subtle text-left type-caption text-secondary">
              {headings.map((h, i) => (
                <th key={h || String(i)} scope="col" className={i === 0 ? "px-4 py-3" : "px-2 py-3"}>
                  {h || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      <p className="type-caption text-secondary">{paged.total.toLocaleString("en-IN")} in all</p>
      <ListPager paged={paged} query={query} />
    </>
  );
}
