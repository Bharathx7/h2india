import { isEnabled } from "@h2india/config";

// Search-engine basics (step 5.10). Absolute URLs come from NEXT_PUBLIC_APP_URL so canonical links, sitemaps and
// structured data agree. Indexing stays off (noindex everywhere, robots.txt disallows all) until the
// searchIndexing flag is switched on at Launch 1.

export const SITE_NAME = "H2 India";
export const SITE_DESCRIPTION =
  "India's hydrogen ecosystem platform: products and companies, Indian hydrogen news, schemes, tenders and events in one place.";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function absolute(path: string): string {
  return path.startsWith("http") ? path : `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export const indexable = () => isEnabled("searchIndexing");
