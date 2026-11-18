import { getDb } from "@h2india/core";
import { listProducts, type ProductCard } from "@h2india/core/products";
import type { ListingQuery } from "@h2india/core/products/rules";
import { showSample } from "@/cms/sample";
import { catalogue } from "@/marketplace/data";
import { allCategories } from "@/marketplace/views";

// Product showcase (founder upgrade, 18 Nov 2026): five featured and five latest products from the live catalogue.
// There is no editorial "featured" flag yet, so Featured uses the marketplace's own relevance order (verified
// suppliers first, then newest; never by payment) and Latest the newest listings, leaving out those already in
// Featured while the catalogue has enough to fill both rows. Nothing here reads a price.

export const SHOWCASE_SIZE = 5;

const QUERY: ListingQuery = {
  sub: [],
  choices: {},
  ranges: {},
  certifications: [],
  verified: false,
  madeInIndia: false,
  state: "",
  leadWeeks: null,
  sort: "relevance",
  view: "grid",
  defaultView: "grid",
  page: 1,
  perPage: SHOWCASE_SIZE,
};

export interface Showcase {
  featured: ProductCard[];
  latest: ProductCard[];
}

export async function loadShowcase(): Promise<Showcase> {
  const cat = await catalogue();
  const categories = allCategories(cat).flatMap((c) => [
    { id: c.id, slug: c.slug, label: c.label, parentId: null },
    ...c.children.map((s) => ({ id: s.id, slug: s.slug, label: s.label, parentId: c.id })),
  ]);
  const scope = { categories, defs: [], includeSample: showSample() };
  const db = getDb();
  const [featured, latest] = await Promise.all([
    listProducts(db, scope, QUERY),
    listProducts(db, scope, { ...QUERY, sort: "newest", perPage: SHOWCASE_SIZE * 2 }),
  ]);
  const shown = new Set(featured.items.map((p) => p.id));
  const fresh = latest.items.filter((p) => !shown.has(p.id));
  return {
    featured: featured.items,
    latest: (fresh.length >= SHOWCASE_SIZE ? fresh : latest.items).slice(0, SHOWCASE_SIZE),
  };
}
