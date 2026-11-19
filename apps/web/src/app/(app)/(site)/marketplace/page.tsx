import { LiveSection } from "@/components/LiveSection";
import { Button, CategoryTile, cx, EmptyState, equipmentKind, Icon, Skeleton } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { forcedState } from "@/lib/dev-state";
import { catalogue, guidesFor } from "@/marketplace/data";
import { ClassTile, GuideCards, PageSection, RfqBand, wrap } from "@/marketplace/parts";
import {
  applicationHref,
  categoryHref,
  classHref,
  popularCategories,
  productsLine,
  tileIcon,
} from "@/marketplace/views";

// Marketplace landing (390:7501; phones 394:8565), step 6.2. Classes, applications and categories come from the
// catalogue an operator keeps in admin Catalogue (step 6.1), so a hidden category disappears here at once. No price
// anywhere. Products, their counts and featured brands join when suppliers list products (8.3, A109).

export const metadata: Metadata = {
  title: "Marketplace · H2 Economy",
  description:
    "Hydrogen equipment, components and services from verified suppliers in India. Compare by specification and request quotes from up to 5 suppliers.",
  alternates: { canonical: "/marketplace" },
};
export const dynamic = "force-dynamic";

const chip =
  "inline-flex h-8 items-center rounded-pill border-[1.5px] px-2.75 type-label whitespace-nowrap transition-colors duration-(--motion-duration-fast) ease-standard";

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const forced = forcedState((await searchParams).state);
  const [cat, guides] = await Promise.all([catalogue(), guidesFor([], 3)]);
  const popular = popularCategories(cat);

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      {/* Founder v2 (18 Nov 2026): the dark ink band with the deep glow, as on the home page. */}
      <section aria-labelledby="market-title" className="relative isolate overflow-hidden bg-inverse">
        <div aria-hidden="true" className="depth-deep-glow absolute -top-60 -right-40 -z-10 size-160" />
        <div aria-hidden="true" className="depth-dot-grid absolute top-10 right-0 -z-10 size-120 opacity-40" />
        <div className={cx(wrap, "flex flex-col gap-6 py-12 md:py-20")}>
          <h1 id="market-title" className="max-w-210 type-display text-inverse max-md:type-h1">
            Hydrogen equipment, components and services from verified suppliers
          </h1>
          <p className="max-w-185 type-body-lg text-neutral-0/80">
            Compare by specification, request quotes from up to 5 suppliers and pay only after delivery.
          </p>
          <form
            action="/search"
            role="search"
            className="flex max-w-210 items-center gap-3 rounded-pill border-[1.5px] border-control bg-page py-1.5 pr-1.5 pl-5 shadow-ink-float focus-within:field-focus"
          >
            <input type="hidden" name="scope" value="products" />
            <Icon name="search" size={24} className="shrink-0 text-icon-secondary" />
            <label htmlFor="market-q" className="sr-only">
              Search hydrogen products
            </label>
            <input
              id="market-q"
              name="q"
              type="search"
              placeholder="Search hydrogen products"
              className="min-w-0 flex-1 bg-transparent type-body-lg text-primary outline-none placeholder:text-secondary"
            />
            <Button type="submit" size="lg">
              Search
            </Button>
          </form>
          <nav aria-label="Browse by class" className="flex flex-wrap gap-2">
            <Link
              href="/marketplace"
              aria-current="page"
              className={cx(chip, "border-transparent bg-accent text-primary")}
            >
              All classes
            </Link>
            {cat.classes.map((c) => (
              <Link
                key={c.id}
                href={classHref(c.id)}
                className={cx(
                  chip,
                  "border-neutral-0/24 bg-neutral-0/6 text-inverse hover:border-neutral-0/64 hover:bg-neutral-0/12",
                )}
              >
                {c.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <PageSection
        id="classes"
        title="Browse by product class"
        sub="Electrolysers, fuel cells and tanks are categories inside these five classes."
      >
        <LiveSection
          label="Product classes"
          state={forced ?? (cat.classes.length ? "ready" : "empty")}
          skeleton={<Tiles count={5} />}
          empty={
            <EmptyState title="The catalogue is being set up">Classes appear here once they are published.</EmptyState>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {cat.classes.map((c) => (
              <ClassTile key={c.id} c={c} />
            ))}
          </div>
        </LiveSection>
      </PageSection>

      <PageSection id="applications" title="Browse by application" className="bg-mint">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {cat.applications.map((a) => (
            <CategoryTile
              key={a.id}
              title={a.label}
              detail={productsLine(a.liveProducts)}
              href={applicationHref(a.id)}
              icon={tileIcon(a.id)}
            />
          ))}
        </div>
      </PageSection>

      <PageSection id="popular" title="Popular categories">
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {popular.map((c) => (
            <CategoryTile
              key={c.id}
              title={c.label}
              detail={productsLine(c.liveProducts, c.classId === "services" ? "listings" : "products")}
              href={categoryHref(c)}
              icon={tileIcon(c.slug)}
              art={equipmentKind(c.slug)}
            />
          ))}
        </div>
      </PageSection>

      <PageSection id="new" title="New this week" className="bg-mint">
        <LiveSection
          label="New this week"
          state={forced ?? "empty"}
          skeleton={<Tiles count={4} />}
          empty={
            <div className="rounded-card border border-default bg-page">
              <EmptyState
                title="New products are on the way"
                action={
                  <Button asChild>
                    <Link href="/list-your-company">List your products</Link>
                  </Button>
                }
              >
                Products show here once suppliers list them and our team has checked them.
              </EmptyState>
            </div>
          }
        />
      </PageSection>

      <RfqBand />

      <PageSection
        id="guides"
        title="Buyer's guides"
        sub="How to specify and buy, by category."
        link={{ label: "All buyer's guides", href: "/knowledge/guides" }}
      >
        <GuideCards guides={guides} state={forced} />
      </PageSection>
    </main>
  );
}

function Tiles({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} kind="card" />
      ))}
    </div>
  );
}
