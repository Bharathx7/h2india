"use client";

import { Pagination } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { PER_PAGE_OPTIONS, pageParams, type Paged } from "@/lib/paging";

/**
 * Numbered pages under a workspace list (Pagination 22:166), shown only when the list is longer than one page. Moves
 * with the router, so the shell and sidebar stay put.
 */
export function ListPager({
  paged,
  query,
  className,
  name,
}: {
  paged: Pick<Paged<unknown>, "page" | "perPage" | "total">;
  /** The page's other address parameters (pagingQuery). */
  query: Record<string, string>;
  className?: string;
  /** For a page with several lists: this list's own address parameters (see pageParams). */
  name?: string;
}) {
  const router = useRouter();
  const params = pageParams(name);
  if (paged.total <= PER_PAGE_OPTIONS[0]) return null;
  return (
    <Pagination
      page={paged.page}
      perPage={paged.perPage}
      total={paged.total}
      query={query}
      perPageOptions={[...PER_PAGE_OPTIONS]}
      onNavigate={(href) => {
        // A second list on the page keeps its place; a page's main list goes back to the top.
        router.push(href, { scroll: !name });
      }}
      className={className}
      pageParam={params.page}
      perPageParam={params.perPage}
    />
  );
}
