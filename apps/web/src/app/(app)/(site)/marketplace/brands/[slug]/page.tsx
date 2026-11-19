import { getDb } from "@h2india/core";
import { brandDetail } from "@h2india/core/brands";
import { buttonClasses, cx, EmptyState, ProductCard, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { showSample } from "@/cms/sample";
import { guidesFor } from "@/marketplace/data";
import { GuideCards, PageSection, wrap } from "@/marketplace/parts";
import { dayMonthYear } from "@/news/format";
import { Crumbs } from "@/opportunities/parts";

// A brand (401:12097; phones 405:13441; no authorised dealer 401:12561), step 6.5. Authorised dealers show Verified
// only once an operator has checked the letter and while it is valid (A128).

type Params = Promise<{ slug: string }>;
const load = (slug: string) => brandDetail(getDb(), slug, { includeSample: showSample() });

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const b = await load((await params).slug);
  if (!b) return { title: "Not found · H2 Economy" };
  return {
    title: `${b.name} · Brands · H2 Economy`,
    description: b.description ?? `${b.name} products and authorised dealers in India.`,
    alternates: { canonical: `/marketplace/brands/${b.slug}` },
  };
}
export const dynamic = "force-dynamic";

export default async function BrandPage({ params }: { params: Params }) {
  const b = await load((await params).slug);
  if (!b) notFound();
  const guides = await guidesFor([b.name], 3);
  const verifiedDealers = b.dealers.filter((d) => d.verified).length;

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <section aria-labelledby="brand-title" className="bg-subtle">
        <div className={cx(wrap, "flex flex-col gap-4 py-8 md:py-10")}>
          <Crumbs
            items={[
              { label: "Marketplace", href: "/marketplace" },
              { label: "Brands", href: "/marketplace/brands" },
              { label: b.name },
            ]}
          />
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex size-16 items-center justify-center rounded-card border border-default bg-page type-h4 text-primary"
            >
              {b.initials}
            </span>
            <div className="flex flex-col gap-1">
              <h1 id="brand-title" className="type-h1 text-primary">
                {b.name}
              </h1>
              <p className="flex flex-wrap gap-x-3 type-caption text-secondary">
                <span>Origin: {b.origin}</span>
                {b.liveProducts ? <span>{b.liveProducts} products</span> : null}
                {verifiedDealers ? <span>{verifiedDealers} authorised dealers in India</span> : null}
                {b.ownerName ? (
                  b.ownerUrl ? (
                    <a
                      href={b.ownerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="type-label-sm text-link underline"
                    >
                      Owned by {b.ownerName}
                    </a>
                  ) : (
                    <span>Owned by {b.ownerName}</span>
                  )
                ) : null}
              </p>
            </div>
          </div>
          {b.description ? <p className="max-w-200 type-body text-body">{b.description}</p> : null}
        </div>
      </section>

      {b.products.length ? (
        <PageSection id="brand-products" title={`${b.name} products`}>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {b.products.map((p) => (
              <li key={p.id} className="flex">
                <ProductCard
                  className="w-full"
                  name={p.name}
                  href={p.href}
                  eyebrow={p.eyebrow}
                  supplier={p.supplier}
                  supplierVerified={p.verified}
                  chips={p.chips}
                  leadTime={p.leadTime}
                  renderLink={({ href, className, children }) => (
                    <Link href={href} className={className}>
                      {children}
                    </Link>
                  )}
                />
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      <PageSection
        id="dealers"
        title="Authorised in India"
        sub={
          b.dealers.length
            ? `Dealers hold a current authorisation letter from ${b.name}, checked by H2 Economy.`
            : undefined
        }
        className="bg-subtle"
      >
        {b.dealers.length ? (
          <ul className="flex flex-col divide-y divide-default rounded-card border border-default bg-page">
            {b.dealers.map((d) => (
              <li key={d.href} className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex min-w-0 flex-1 flex-col">
                  <Link href={d.href} className="type-label text-primary hover:underline">
                    {d.name}
                  </Link>
                  <span className="type-caption text-secondary">
                    {[d.place, d.regions, d.scope].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {d.validUntil ? (
                  <span className="type-caption text-secondary">
                    Authorisation letter valid until {dayMonthYear(d.validUntil)}
                  </span>
                ) : null}
                {d.verified ? (
                  <StatusBadge status="Verified" tone="success" />
                ) : (
                  <StatusBadge status="Not yet checked" tone="neutral" />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-card border border-default bg-page">
            <EmptyState
              title="No authorised Indian dealer listed yet"
              action={
                <Link href="/list-your-company" className={buttonClasses({})}>
                  List your company
                </Link>
              }
            >
              {`If you hold an authorisation letter for ${b.name}, add it from your supplier workspace and we'll check it.`}
            </EmptyState>
          </div>
        )}
      </PageSection>

      <PageSection id="related" title="Related news" link={{ label: "All buyer's guides", href: "/knowledge/guides" }}>
        <GuideCards guides={guides} />
      </PageSection>
    </main>
  );
}
