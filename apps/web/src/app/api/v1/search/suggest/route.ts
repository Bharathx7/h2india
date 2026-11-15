import { suggestAllowed } from "@h2india/core";
import { cleanQuery, isSearchScope, suggest } from "@h2india/core/search";
import { NextResponse } from "next/server";
import { GROUP_LOOK, relatedCategories } from "@/search/present";
import { apiError } from "@/server/api";
import { requestContext } from "@/server/request-context";

// GET /api/v1/search/suggest?q&scope: the header overlay's grouped suggestions (372:16695). Public, read-only, and only
// from the public indexes (published, non-private content). Nothing is logged here: the overlay asks on every keystroke,
// and half-typed words are not "searches with no results". Limited per IP per minute (A54).
export async function GET(request: Request) {
  if (!(await suggestAllowed((await requestContext()).ip ?? null)))
    return apiError(429, "TOO_MANY", "Too many searches at once. Wait a moment and try again.");
  const params = new URL(request.url).searchParams;
  const q = cleanQuery(params.get("q"));
  const scope = params.get("scope") ?? "all";
  if (!isSearchScope(scope)) return apiError(400, "BAD_SCOPE", "Unknown search scope.");
  try {
    const result = await suggest(q, scope);
    const groups = result.groups.map((g) => ({
      ...GROUP_LOOK[g.index],
      items: g.hits.map((h) => ({ id: h.id, title: h.title, meta: h.meta, href: h.href })),
    }));
    return NextResponse.json(
      { query: q, scope, groups, total: result.total, related: result.total === 0 ? relatedCategories(q) : [] },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[search] suggest failed", error);
    return apiError(503, "SEARCH_UNAVAILABLE", "We couldn’t load search results.");
  }
}
