import { LiveSection } from "@/components/LiveSection";
import { CategoryTile, cx, EmptyState, equipmentKind, Icon, OrgCard, Skeleton } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { forcedState } from "@/lib/dev-state";
import { catalogue, guidesFor, suppliersFor } from "@/marketplace/data";
import { GuideCards, PageSection, RfqBand, wrap } from "@/marketplace/parts";
import { categoryHref, classHref, productsLine, tileIcon } from "@/marketplace/views";
import { Crumbs } from "@/opportunities/parts";

// A product class (Systems 391:4379; phones 394:9055), step 6.2: one template for all five classes. Categories come
// from admin Catalogue; top suppliers are directory profiles that name the class's categories, verified first
// ("ranked by verified listings and reply time" joins with listings, 8.3); guides are buyer's guides on them.

type Params = Promise<{ classId: string }>;

async function findClass(id: string) {
  const cat = await catalogue();
  return cat.classes.find((c) => c.id === id) ?? null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const c = await findClass((await params).classId);
  if (!c) return { title: "Not found · H2 Economy" };
  return {
    title: `${c.label} · Marketplace · H2 Economy`,
    description: `${c.description} Compare by specification and request quotes from verified suppliers in India.`,
    alternates: { canonical: classHref(c.id) },
  };
}
export const dynamic = "force-dynamic";

export default async function ClassPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ state?: string }>;
}) {
  const c = await findClass((await params).classId);
  if (!c) notFound();
  const forced = forcedState((await searchParams).state);
  const labels = c.categories.map((x) => x.label);
  const [suppliers, guides] = await Promise.all([suppliersFor(labels, 3), guidesFor(labels, 3)]);
  const counts = [
    productsLine(c.liveProducts, c.id === "services" ? "listings" : "products"),
    `${String(c.categories.length)} categories`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <section aria-labelledby="class-title" className="bg-mint">
        <div className={cx(wrap, "flex flex-col gap-4 py-8 md:py-12")}>
          <Crumbs items={[{ label: "Marketplace", href: "/marketplace" }, { label: c.label }]} />
          <h1 id="class-title" className="type-h1 text-primary">
            {c.label}
          </h1>
          <p className="max-w-170 type-body-lg text-body">{c.description}</p>
          <p className="flex flex-wrap items-center gap-x-6 gap-y-2 type-caption text-secondary">
            <span>{counts}</span>
            <Link
              href="/knowledge/guides"
              className="inline-flex items-center gap-1.5 type-label text-link hover:text-link-hover"
            >
              {c.label} buyer&apos;s guides
              <Icon name="arrow-right" size={16} />
            </Link>
          </p>
        </div>
      </section>

      <PageSection id="categories" title="Categories">
        <LiveSection
          label={`${c.label} categories`}
          state={forced ?? (c.categories.length ? "ready" : "empty")}
          skeleton={
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} kind="card" />
              ))}
            </div>
          }
          empty={
            <div className="rounded-card border border-default bg-subtle">
              <EmptyState title={`No ${c.label.toLowerCase()} categories yet`}>
                Categories appear here as our catalogue team adds them.
              </EmptyState>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {c.categories.map((x) => (
              <CategoryTile
                key={x.id}
                title={x.label}
                detail={productsLine(x.liveProducts, c.id === "services" ? "listings" : "products")}
                href={categoryHref(x)}
                icon={tileIcon(x.slug)}
                art={equipmentKind(x.slug)}
              />
            ))}
          </div>
        </LiveSection>
      </PageSection>

      <PageSection
        id="suppliers"
        title={`Top suppliers in ${c.label}`}
        sub="Ranked by verified listings and reply time, not by payment."
        className="bg-mint"
      >
        <LiveSection
          label={`Top suppliers in ${c.label}`}
          state={forced ?? (suppliers.length ? "ready" : "empty")}
          skeleton={
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Skeleton kind="card" />
              <Skeleton kind="card" />
              <Skeleton kind="card" />
            </div>
          }
          empty={
            <div className="rounded-card border border-default bg-page">
              <EmptyState title="Suppliers are joining">
                {`Verified ${c.label.toLowerCase()} suppliers show here as they list with H2 Economy.`}
              </EmptyState>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {suppliers.map((s) => (
              <OrgCard
                key={s.id}
                name={s.name}
                initials={s.initials}
                place={[s.city, s.state].filter(Boolean).join(", ")}
                gstVerified={s.verified}
                summary={s.categories.slice(0, 3).join(", ") || s.summary}
                href={s.href}
                quoteHref="/rfq/new"
                renderLink={({ href, className, children }) => (
                  <Link href={href} className={className}>
                    {children}
                  </Link>
                )}
              />
            ))}
          </div>
        </LiveSection>
      </PageSection>

      <PageSection
        id="guides"
        title={`Guides and news for ${c.label}`}
        link={{ label: "Knowledge home", href: "/knowledge" }}
      >
        <GuideCards guides={guides} state={forced} />
      </PageSection>

      <RfqBand />
    </main>
  );
}
