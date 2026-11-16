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

/** The current search params minus page and perPage, so Pagination keeps the filters in its links. */
export function pagingQuery(params: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (k === "page" || k === "perPage") continue;
    const one = Array.isArray(v) ? v[0] : v;
    if (one !== undefined && one !== "") out[k] = one;
  }
  return out;
}
