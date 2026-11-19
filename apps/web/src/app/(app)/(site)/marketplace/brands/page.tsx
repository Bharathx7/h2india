import { getDb } from "@h2india/core";
import { listBrands } from "@h2india/core/brands";
import { Button, cx, EmptyState, Icon, Pagination, Skeleton } from "@h2india/ui";
import { LIST_PER_PAGE, pageSlice, pagingQuery } from "@/lib/paging";
import type { Metadata } from "next";
import Link from "next/link";
import { showSample } from "@/cms/sample";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { catalogue } from "@/marketplace/data";
import { wrap } from "@/marketplace/parts";
import { Crumbs } from "@/opportunities/parts";

// Brands index (401:11734; phones 405:13196), step 6.5: A–Z with search, class, country of origin and "has an
// authorised dealer in India". The filters are a plain form, so they work without scripts and the address keeps them.
export const metadata: Metadata = {
  title: "Brands · Marketplace · H2 Economy",
  description:
    "Hydrogen brands sold on H2 Economy, from Indian makers and international manufacturers with authorised Indian dealers.",
  alternates: { canonical: "/marketplace/brands" },
};
export const dynamic = "force-dynamic";

type Search = Promise<{ q?: string; class?: string; origin?: string; dealer?: string; state?: string; page?: string }>;

export default async function BrandsPage({ searchParams }: { searchParams: Search }) {
  const s = await searchParams;
  const forced = forcedState(s.state);
  const [cat, data] = await Promise.all([
    catalogue(),
    listBrands(getDb(), {
      includeSample: showSample(),
      q: s.q,
      classId: s.class,
      origin: s.origin,
      withDealer: s.dealer === "1",
    }),
  ]);
  const letterOf = (b: { name: string }) => b.name.charAt(0).toUpperCase();
  // A to Z, 20 a page (public QC): the letter links go to the page where that letter starts.
  const sorted = [...data.brands].sort((a, b) =>
    letterOf(a) < letterOf(b) ? -1 : letterOf(a) > letterOf(b) ? 1 : a.name.localeCompare(b.name, "en-IN"),
  );
  const letters = [...new Set(sorted.map(letterOf))];
  const shown = pageSlice(sorted, s.page);
  const query = pagingQuery(s);
  const letterHref = (l: string) => {
    const page = Math.floor(sorted.findIndex((b) => letterOf(b) === l) / LIST_PER_PAGE) + 1;
    if (page === shown.page) return `#letter-${l}`;
    const q = new URLSearchParams({ ...query, ...(page > 1 ? { page: String(page) } : {}) }).toString();
    return `?${q}#letter-${l}`;
  };
  const pageLetters = [...new Set(shown.items.map(letterOf))];
  const n = data.total.toLocaleString("en-IN");
  const field = "h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body text-primary";

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <section aria-labelledby="brands-title" className="bg-subtle">
        <div className={cx(wrap, "flex flex-col gap-4 py-8 md:py-10")}>
          <Crumbs items={[{ label: "Marketplace", href: "/marketplace" }, { label: "Brands" }]} />
          <h1 id="brands-title" className="type-h1 text-primary">
            Brands
          </h1>
          <p className="type-body text-body">
            {n} brands sold on H2 Economy, from Indian makers and international manufacturers with authorised Indian
            dealers.
          </p>
          <form method="get" role="search" className="flex flex-wrap items-center gap-3">
            <label className="flex h-11 min-w-60 flex-1 items-center gap-2 rounded-control border-[1.5px] border-control bg-page px-3 focus-within:field-focus">
              <Icon name="search" size={18} className="text-icon-secondary" />
              <span className="sr-only">Search brands</span>
              <input
                name="q"
                defaultValue={s.q}
                placeholder={`Search ${n} brands`}
                className="min-w-0 flex-1 bg-transparent type-body outline-none"
              />
            </label>
            <select name="class" defaultValue={s.class ?? ""} aria-label="Class" className={field}>
              <option value="">All classes</option>
              {cat.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <select name="origin" defaultValue={s.origin ?? ""} aria-label="Country of origin" className={field}>
              <option value="">Any country of origin</option>
              {data.origins.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 type-body text-primary">
              <input
                type="checkbox"
                name="dealer"
                value="1"
                defaultChecked={s.dealer === "1"}
                className="size-5 accent-ink-900"
              />
              Has an authorised dealer in India
            </label>
            <Button type="submit" variant="secondary">
              Apply
            </Button>
          </form>
        </div>
      </section>

      <div className={cx(wrap, "flex flex-col gap-8 py-10")}>
        <LiveSection
          label="Brands"
          state={forced ?? (data.brands.length ? "ready" : "empty")}
          skeleton={<Skeleton kind="card" />}
          empty={
            <div className="rounded-card border border-default bg-subtle">
              <EmptyState kind="no-results" title="No brands match">
                Try another name, class or country.
              </EmptyState>
            </div>
          }
        >
          <nav aria-label="Brands A to Z" className="flex flex-wrap gap-1.5">
            {letters.map((l) => (
              <a
                key={l}
                href={letterHref(l)}
                className="inline-flex size-8 items-center justify-center rounded-pill border border-default type-label-sm hover:border-focus"
              >
                {l}
              </a>
            ))}
          </nav>
          {pageLetters.map((l) => (
            <section
              key={l}
              id={`letter-${l}`}
              aria-label={`Brands starting with ${l}`}
              className="flex scroll-mt-16 flex-col gap-3"
            >
              <h2 className="type-h4 text-primary">{l}</h2>
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                {shown.items
                  .filter((b) => letterOf(b) === l)
                  .map((b) => (
                    <li key={b.slug}>
                      <Link
                        href={`/marketplace/brands/${b.slug}`}
                        className="flex h-full flex-col gap-2 rounded-card border border-default p-3 hover:shadow-soft"
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-12 items-center justify-center rounded-control bg-linear-to-br from-fresh-50 to-fresh-200 type-label text-link"
                        >
                          {b.initials}
                        </span>
                        <span className="type-label text-primary">{b.name}</span>
                        <span className="type-caption text-secondary">
                          {[b.origin, b.liveProducts ? `${String(b.liveProducts)} products` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
          {shown.total > LIST_PER_PAGE ? (
            <Pagination
              page={shown.page}
              perPage={LIST_PER_PAGE}
              total={shown.total}
              perPageOptions={[LIST_PER_PAGE]}
              query={query}
            />
          ) : null}
        </LiveSection>
      </div>
    </main>
  );
}
