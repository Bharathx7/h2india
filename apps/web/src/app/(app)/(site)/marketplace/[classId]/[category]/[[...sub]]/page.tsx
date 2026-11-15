import { getDb } from "@h2india/core";
import { effectiveSchema } from "@h2india/core/catalogue/taxonomy";
import { listProducts } from "@h2india/core/products";
import { activeFilters, defaultViewFor, listingSearch, parseListing } from "@h2india/core/products/rules";
import { buttonClasses, cx, Icon, Skeleton } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveSection } from "@/components/LiveSection";
import { showSample } from "@/cms/sample";
import { forcedState } from "@/lib/dev-state";
import { catalogue, guidesFor } from "@/marketplace/data";
import { Listing } from "@/marketplace/Listing";
import { wrap } from "@/marketplace/parts";
import { categoryHref, classHref } from "@/marketplace/views";
import { Crumbs } from "@/opportunities/parts";
import { getSession } from "@/server/auth";

// Category and sub-category listings (392:4896, 392:5787, 392:6656; phones 395:9321, 395:9617; loading 127:6922,
// error 127:6957), step 6.3. Filters come from the category's filterable attributes, counts from the live products,
// and the address holds every choice; the first page is rendered on the server for search engines.

type Params = Promise<{ classId: string; category: string; sub?: string[] }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

async function resolve(p: Awaited<Params>) {
  const cat = await catalogue();
  const klass = cat.classes.find((c) => c.id === p.classId);
  const category = klass?.categories.find((c) => c.slug === p.category);
  if (!klass || !category || (p.sub?.length ?? 0) > 1) return null;
  const sub = p.sub?.[0] ? category.children.find((c) => c.slug === p.sub?.[0]) : undefined;
  if (p.sub?.[0] && !sub) return null;
  return { klass, category, sub };
}

/** "PEM electrolysers" on a sub-category page (392:5787); the category's name otherwise. */
const titleOf = (category: { label: string }, sub?: { label: string }) =>
  sub ? `${sub.label} ${category.label.charAt(0).toLowerCase()}${category.label.slice(1)}` : category.label;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await resolve(await params);
  if (!found) return { title: "Not found · H2 India" };
  const title = titleOf(found.category, found.sub);
  return {
    title: `${title} · ${found.klass.label} · H2 India`,
    description: `Compare ${title.toLowerCase()} from suppliers in India by specification, and request quotes from up to 5 verified suppliers.`,
    alternates: { canonical: found.sub ? categoryHref(found.sub, found.category) : categoryHref(found.category) },
  };
}
export const dynamic = "force-dynamic";

export default async function ListingPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const p = await params;
  const found = await resolve(p);
  if (!found) notFound();
  const { klass, category, sub } = found;
  const search = await searchParams;
  const forced = forcedState(search.state);
  const includeSample = showSample();
  const db = getDb();
  const defs = await effectiveSchema(db, (sub ?? category).id, { includeSample });
  const query = parseListing(search, defs, { defaultView: defaultViewFor(klass.id) });
  const scopeCategories = sub
    ? [{ id: sub.id, slug: sub.slug, label: sub.label, parentId: category.id }]
    : [
        { id: category.id, slug: category.slug, label: category.label, parentId: null },
        ...category.children.map((c) => ({ id: c.id, slug: c.slug, label: c.label, parentId: category.id })),
      ];
  const [result, guides, session] = await Promise.all([
    listProducts(db, { categories: scopeCategories, defs, includeSample }, query),
    guidesFor([category.label], 1),
    getSession(),
  ]);
  // No results (Doc 1 §9.2): which single filter to drop to find products, the nearest matches, and a quote request
  // carrying the filters.
  let noResults:
    | { suggestions: { label: string; href: string; count: number }[]; nearest: typeof result.items; rfqHref: string }
    | undefined;
  if (result.total === 0) {
    const subLabels = Object.fromEntries(category.children.map((c) => [c.slug, c.label]));
    const tries = await Promise.all(
      activeFilters(query, defs, subLabels).map(async (f) => {
        const relaxed = { ...query, ...f.without, page: 1 };
        const r = await listProducts(db, { categories: scopeCategories, defs, includeSample }, relaxed);
        return { label: f.label, relaxed, total: r.total, items: r.items };
      }),
    );
    const found = tries.filter((t) => t.total > 0).sort((a, b) => b.total - a.total);
    const base = sub ? categoryHref(sub, category) : categoryHref(category);
    noResults = {
      suggestions: found
        .slice(0, 4)
        .map((t) => ({ label: t.label, href: `${base}${listingSearch(t.relaxed)}`, count: t.total })),
      nearest: found[0]?.items.slice(0, 3) ?? [],
      rfqHref: `/rfq/new?category=${encodeURIComponent((sub ?? category).slug)}&filters=${encodeURIComponent(listingSearch(query).slice(1))}`,
    };
  }
  const title = titleOf(category, sub);
  const basePath = sub ? categoryHref(sub, category) : categoryHref(category);
  const total = result.total;

  return (
    <main id="main" className="pb-24 [&_:is(h1,h2,h3)]:text-wrap">
      <section aria-labelledby="listing-title">
        <div className={cx(wrap, "flex flex-col gap-4 py-8")}>
          <Crumbs
            items={[
              { label: "Marketplace", href: "/marketplace" },
              { label: klass.label, href: classHref(klass.id) },
              ...(sub
                ? [{ label: category.label, href: categoryHref(category) }, { label: sub.label }]
                : [{ label: category.label }]),
            ]}
          />
          <h1 id="listing-title" className="type-h1 text-primary">
            {title}
          </h1>
          {(sub ?? category).description ? (
            <p className="max-w-190 type-body-lg text-body">{(sub ?? category).description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <p className="type-caption text-secondary">
              {total.toLocaleString("en-IN")} {total === 1 ? "product" : "products"}
            </p>
            {guides[0] ? (
              <Link
                href={`/knowledge/guides/${guides[0].slug}`}
                className="inline-flex items-center gap-1.5 type-label text-link hover:text-link-hover"
              >
                Read the {category.label.toLowerCase()} buyer&apos;s guide
                <Icon name="arrow-right" size={16} />
              </Link>
            ) : null}
            <Link
              href={`/rfq/new?category=${encodeURIComponent((sub ?? category).slug)}`}
              className={cx(buttonClasses({ variant: "outline" }), "md:ml-auto")}
            >
              Request quotes from up to 5 suppliers
            </Link>
          </div>
        </div>
      </section>

      <div className={wrap}>
        {forced && forced !== "ready" && forced !== "empty" ? (
          <LiveSection
            label="Products"
            state={forced}
            errorTitle="We couldn't load these products"
            errorText="Check your connection and try again. Your filters are kept."
            skeleton={
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} kind="card" />
                ))}
              </div>
            }
            empty={null}
          />
        ) : (
          <Listing
            basePath={basePath}
            query={query}
            defs={defs.filter((d) => d.filterable || d.comparable)}
            facets={result.facets}
            items={forced === "empty" ? [] : result.items}
            total={forced === "empty" ? 0 : total}
            eyebrow={`${klass.label} · ${category.label}`}
            categorySlug={category.slug}
            signedIn={Boolean(session)}
            noResults={forced === "empty" ? undefined : noResults}
          />
        )}
      </div>
    </main>
  );
}
