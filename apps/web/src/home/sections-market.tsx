import type { ProductCard } from "@h2india/core/products";
import { Button, CategoryTile, EmptyState, EquipmentArt, equipmentKind, Icon } from "@h2india/ui";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { catalogue } from "@/marketplace/data";
import { categoryHref, popularCategories, productsLine, tileIcon } from "@/marketplace/views";
import { HomeArrowLink, ModuleError, Section, SectionTitle } from "./parts";
import { loadShowcase, SHOWCASE_SIZE } from "./showcase";

// Home product showcase (founder upgrade, 18 Nov 2026; replaces sections 06 to 08: the class tiles, Browse by
// application and the "Why buy and sell" bento). Three rows on one mint band: six popular categories, then five
// featured and five latest products. Every card in a row is the same size: it fills its cell and its footer sits on
// the bottom edge. Phones swipe the product rows; from 1024 px they are five across.

export async function ProductShowcase() {
  const cat = await catalogue();
  const popular = popularCategories(cat).slice(0, 6);
  return (
    <Section id="marketplace" className="bg-page" inner="flex flex-col gap-12 py-12 md:gap-16 md:py-24">
      <SectionTitle
        id="marketplace"
        title="Browse the marketplace"
        sub="Hydrogen equipment, components and services. Prices appear only on product pages."
        link={{ label: "Explore the marketplace", href: "/marketplace" }}
        size="h1"
        className="relative"
      />
      <Row title="Popular categories" id="popular">
        <ul aria-labelledby="popular-title" className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
          {popular.map((c) => (
            <li key={c.id} className="flex">
              <CategoryTile
                title={c.label}
                detail={productsLine(c.liveProducts)}
                href={categoryHref(c)}
                icon={tileIcon(c.slug)}
                art={equipmentKind(c.slug)}
                className="h-full w-full"
              />
            </li>
          ))}
        </ul>
      </Row>
      <Suspense fallback={<ProductRowsSkeleton />}>
        <ProductRows />
      </Suspense>
    </Section>
  );
}

function Row({
  id,
  title,
  sub,
  link,
  children,
}: {
  id: string;
  title: string;
  sub?: string;
  link?: { label: string; href: string };
  children: ReactNode;
}) {
  return (
    <div className="relative flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 id={`${id}-title`} className="type-h3 text-primary">
            {title}
          </h3>
          {sub ? <p className="type-body-sm text-body">{sub}</p> : null}
        </div>
        {link ? <HomeArrowLink href={link.href}>{link.label}</HomeArrowLink> : null}
      </div>
      {children}
    </div>
  );
}

async function ProductRows() {
  let data: Awaited<ReturnType<typeof loadShowcase>>;
  try {
    data = await loadShowcase();
  } catch (error) {
    console.error("[home] products failed", error);
    return (
      <Row id="featured" title="Featured products">
        <ModuleError
          title="We couldn't load the products"
          text="This is on our side. Try again, or open the marketplace."
        />
      </Row>
    );
  }
  if (!data.featured.length) {
    return (
      <Row id="featured" title="Featured products">
        <div className="rounded-card border border-default bg-page" data-testid="featured-empty">
          <EmptyState
            kind="first-use"
            title="Featured products are on the way"
            action={
              <Button asChild>
                <Link href="/list-your-company">List your products</Link>
              </Button>
            }
          >
            Products show here once suppliers list them and our team has checked them.
          </EmptyState>
        </div>
      </Row>
    );
  }
  return (
    <>
      <Row
        id="featured"
        title="Featured products"
        sub="Verified suppliers first, never paid placement."
        link={{ label: "All products", href: "/marketplace" }}
      >
        <ProductRow label="Featured products" items={data.featured} />
      </Row>
      <Row id="latest" title="Latest products" sub="Newly listed on H2 Economy.">
        <ProductRow label="Latest products" items={data.latest} />
      </Row>
    </>
  );
}

/** Five cards across from 1024 px; a swipeable row below that (the scroll box is focusable for keyboards). */
function ProductRow({ label, items }: { label: string; items: ProductCard[] }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="relative -mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 md:-mx-6 md:px-6 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0"
    >
      <ul className="grid snap-x snap-mandatory auto-cols-[72%] grid-flow-col gap-3 sm:auto-cols-[44%] md:auto-cols-[31%] md:gap-4 lg:grid-flow-row lg:grid-cols-5">
        {items.slice(0, SHOWCASE_SIZE).map((p) => (
          <li key={p.id} className="flex snap-start">
            <ShowcaseCard product={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A compact product card: no price (card rule), two lines kept for every name so the row lines up. */
function ShowcaseCard({ product: p }: { product: ProductCard }) {
  const category = p.subLabel ?? p.categoryLabel;
  return (
    <article className="group card-lift relative flex h-full w-full flex-col overflow-hidden rounded-card border border-default bg-page">
      <div className="relative aspect-[4/3] bg-fresh-50">
        {p.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- product photos come from the storage domain, already resized
          <img
            src={p.photo.src}
            srcSet={p.photo.srcSet || undefined}
            sizes="(min-width: 1024px) 20vw, (min-width: 768px) 31vw, (min-width: 640px) 44vw, 72vw"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <EquipmentArt kind={equipmentKind(p.subLabel, p.categoryLabel, p.name)} />
        )}
        {p.supplier.verified ? (
          <span className="absolute top-3 left-3 inline-flex h-6 items-center gap-1 rounded-pill bg-page px-2 type-label-sm text-primary shadow-soft">
            <Icon name="shield-check" size={14} className="text-icon-success" />
            Verified
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="line-clamp-1 type-caption text-secondary">{category}</p>
        <h4 className="line-clamp-2 min-h-[2lh] type-label-lg text-primary">
          <Link
            href={p.href}
            className="rounded-control after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {p.name}
          </Link>
        </h4>
        <p className="line-clamp-1 type-body-sm text-secondary">{p.supplier.name}</p>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-default pt-3">
          {p.leadTime ? (
            <span className="flex min-w-0 flex-col">
              <span className="type-caption text-secondary">Lead time</span>
              <span className="truncate type-label-sm text-success">{p.leadTime}</span>
            </span>
          ) : (
            <span className="type-label-sm text-secondary">Lead time on request</span>
          )}
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-inverse text-inverse transition-transform duration-(--motion-duration-fast) ease-standard group-hover:translate-x-0.5"
          >
            <Icon name="arrow-right" size={16} />
          </span>
        </div>
      </div>
    </article>
  );
}

/** The product rows while they load: the same cards' size, so nothing moves when they arrive. */
function ProductRowsSkeleton() {
  return (
    <div role="status" aria-label="Loading products" className="relative flex flex-col gap-5">
      <span className="block h-7 w-56 max-w-full rounded-control shimmer" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: SHOWCASE_SIZE }, (_, i) => (
          <span key={i} className={`block h-80 rounded-card shimmer ${i > 0 ? "max-sm:hidden" : ""}`} />
        ))}
      </div>
    </div>
  );
}
