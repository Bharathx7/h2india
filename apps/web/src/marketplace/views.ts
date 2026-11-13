import type { PublicCatalogue, PublicCategory, PublicClass } from "@h2india/core/catalogue/taxonomy";

// Addresses and words for the marketplace pages (steps 6.2 and 6.3). Pure, so they're unit-tested.
//   /marketplace                                  landing (390:7501)
//   /marketplace/<class>                          class page (391:4379), one template for all five
//   /marketplace/<class>/<category>[/<sub>]       listing (step 6.3)
//   /marketplace/applications/<application>       application page (754:14685), one template for all (F4)

export const classHref = (classId: string) => `/marketplace/${classId}`;
export const applicationHref = (id: string) => `/marketplace/applications/${id}`;

export function categoryHref(
  c: Pick<PublicCategory, "classId" | "slug">,
  parent?: Pick<PublicCategory, "slug">,
): string {
  return parent ? `/marketplace/${c.classId}/${parent.slug}/${c.slug}` : `/marketplace/${c.classId}/${c.slug}`;
}

const n = (count: number) => count.toLocaleString("en-IN");

/** "98 products": live listings only, and nothing while there are none (A109). */
export function productsLine(count: number, word: "products" | "listings" = "products"): string | undefined {
  if (count <= 0) return undefined;
  return `${n(count)} ${count === 1 ? word.replace(/s$/, "") : word}`;
}

/** "412 products · 30 categories" on the class tiles (390:7618), without products while there are none. */
export function classTileLine(c: PublicClass): string {
  const words = c.id === "services" ? "listings" : "products";
  return [
    productsLine(c.liveProducts, words),
    `${n(c.categories.length)} ${c.categories.length === 1 ? "category" : "categories"}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** The categories the landing calls popular (390:7760), as drawn: the eight M23 names, in this order. */
export const POPULAR = [
  "electrolysers",
  "fuel-cell-systems",
  "compression-systems",
  "tanks-cylinders",
  "valves-regulators",
  "sensors-detectors",
  "catalysts",
  "testing-certification",
];

export function allCategories(cat: PublicCatalogue): PublicCategory[] {
  return cat.classes.flatMap((c) => c.categories);
}

/** Finds a top-level category by its address word, in any class. */
export function categoryBySlug(cat: PublicCatalogue, slug: string): PublicCategory | undefined {
  return allCategories(cat).find((c) => c.slug === slug);
}

export function popularCategories(cat: PublicCatalogue): PublicCategory[] {
  const all = allCategories(cat);
  return POPULAR.map((slug) => all.find((c) => c.slug === slug)).filter((c): c is PublicCategory => Boolean(c));
}
