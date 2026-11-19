// Numbered pages for public lists (public QC, 16 Nov 2026): every list shows 20 records a page with the shared
// Pagination from @h2india/ui. Pure, so it is unit-tested without the CMS.

export const LIST_PER_PAGE = 20;

/** Reads ?page= safely: a whole number from 1, clamped to the last page. Anything else is page 1. */
export function pageNumber(raw: unknown, total: number, perPage = LIST_PER_PAGE): number {
  const value = Array.isArray(raw) ? (raw as unknown[])[0] : raw;
  const n = typeof value === "string" || typeof value === "number" ? Math.floor(Number(value)) : NaN;
  const last = Math.max(1, Math.ceil(total / perPage));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, last);
}

/** One page of an already filtered list. */
export function pageSlice<T>(
  list: readonly T[],
  raw: unknown,
  perPage = LIST_PER_PAGE,
): { page: number; total: number; perPage: number; items: T[] } {
  const total = list.length;
  const page = pageNumber(raw, total, perPage);
  return { page, total, perPage, items: list.slice((page - 1) * perPage, page * perPage) };
}

/** The current search params minus this list's page and perPage, so Pagination keeps the filters (and the other lists'
 * pages) in its links. */
export function pagingQuery(
  params: Record<string, string | string[] | undefined>,
  name?: string,
): Record<string, string> {
  const own = pageParams(name);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (k === own.page || k === own.perPage) continue;
    const one = Array.isArray(v) ? v[0] : v;
    if (one !== undefined && one !== "") out[k] = one;
  }
  return out;
}

// Workspace lists (founder QC, 17 Nov 2026: "pagination, common"): 25 a page, with 50 and 100 to choose from. The
// address holds the page (?page=2&perPage=50), so a page can be shared and Back works.

export const PER_PAGE_OPTIONS = [25, 50, 100] as const;
export const WORKSPACE_PER_PAGE = 25;

export interface PageRequest {
  page: number;
  perPage: number;
}

/**
 * The address parameters a list pages with: page and perPage, or, when a page holds several lists (founder, 19 Nov
 * 2026: pagination on every admin list), `<name>Page` and `<name>PerPage` so each list pages on its own.
 */
export function pageParams(name?: string): { page: string; perPage: string } {
  return name ? { page: `${name}Page`, perPage: `${name}PerPage` } : { page: "page", perPage: "perPage" };
}

/** The page asked for in the address; anything odd falls back to page 1 of 25. */
export function pageRequest(sp: Record<string, string | string[] | undefined>, name?: string): PageRequest {
  const keys = pageParams(name);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const per = Number(one(sp[keys.perPage]));
  const perPage = (PER_PAGE_OPTIONS as readonly number[]).includes(per) ? per : WORKSPACE_PER_PAGE;
  const page = Math.max(1, Math.floor(Number(one(sp[keys.page])) || 1));
  return { page, perPage };
}

/** Offset and limit for a database query that pages itself. */
export function pageWindow(req: PageRequest): { offset: number; limit: number } {
  return { offset: (req.page - 1) * req.perPage, limit: req.perPage };
}

export interface Paged<T> extends PageRequest {
  rows: T[];
  total: number;
}

/** One page of an already loaded workspace list. A page past the end shows the last page. */
export function pageOf<T>(rows: readonly T[], req: PageRequest): Paged<T> {
  const total = rows.length;
  const page = Math.min(req.page, Math.max(1, Math.ceil(total / req.perPage)));
  const start = (page - 1) * req.perPage;
  return { rows: rows.slice(start, start + req.perPage), total, page, perPage: req.perPage };
}
