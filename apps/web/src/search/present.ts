import { POPULAR_CATEGORIES } from "@h2india/core/catalogue";
import type { SearchIndexUid } from "@h2india/core/search";
import type { IconName } from "@h2india/ui";

// How search results are shown (step 5.2): the eyebrow and icon of each group as drawn on 372:16695, the related
// categories offered when nothing matches (372:16870) and the prefilled quote request. Safe to import in the browser.

export const GROUP_LOOK: Record<SearchIndexUid, { label: string; icon: IconName }> = {
  products: { label: "Products", icon: "package" },
  companies: { label: "Companies", icon: "building" },
  articles: { label: "News", icon: "newspaper" },
  schemes: { label: "Schemes", icon: "clipboard-check" },
  tenders: { label: "Tenders", icon: "file-text" },
  grants: { label: "Grants", icon: "clipboard-check" },
  jobs: { label: "Jobs", icon: "users" },
  events: { label: "Events", icon: "calendar" },
  knowledge: { label: "Knowledge", icon: "folder" },
};

/** The quote request prefilled with the searched words (the RFQ wizard reads ?q, step 9.3). */
export function quoteHrefFor(query: string): string {
  const q = query.trim();
  return q ? `/rfq/new?${new URLSearchParams({ q }).toString()}` : "/rfq/new";
}

/**
 * /search for the typed words; companies open the Suppliers tab, everything else the Products tab. `from=header` tells
 * the page the search was run from the overlay, for the zero-result log.
 */
export function searchPageHref(query: string, scope = "all", from?: "header"): string {
  const params = new URLSearchParams({ q: query.trim() });
  if (scope === "companies") params.set("tab", "suppliers");
  if (scope !== "all") params.set("scope", scope);
  if (from) params.set("from", from);
  return `/search?${params.toString()}`;
}

const stem = (word: string) =>
  word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5);

/**
 * Categories that share a word with the search (electrolyser → Electrolysers), at most three. The full catalogue comes
 * with step 6.1; until then the drawn popular categories are what there is, and nothing is offered if none match.
 */
export function relatedCategories(query: string): { label: string; href: string }[] {
  const words = new Set(
    query
      .split(/\s+/)
      .map(stem)
      .filter((w) => w.length >= 3),
  );
  if (!words.size) return [];
  return POPULAR_CATEGORIES.filter((c) => c.label.split(/\s+/).some((w) => words.has(stem(w))))
    .slice(0, 3)
    .map((c) => ({ label: c.label, href: c.href }));
}
