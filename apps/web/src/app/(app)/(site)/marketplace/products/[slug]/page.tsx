import { isEnabled } from "@h2india/config";
import { getDb } from "@h2india/core";
import { identityOf } from "@h2india/core/authz";
import { productDetail, similarProducts, type ProductDetail } from "@h2india/core/products";
import {
  buttonClasses,
  cx,
  EmptyState,
  EquipmentArt,
  equipmentKind,
  Icon,
  ProductCard,
  VerifiedBadge,
} from "@h2india/ui";
import type { Metadata } from "next";
import { ViewBeacon } from "@/components/ViewBeacon";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { showSample } from "@/cms/sample";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { guidesFor } from "@/marketplace/data";
import { GuideCards, wrap } from "@/marketplace/parts";
import { applicationHref, categoryHref, classHref } from "@/marketplace/views";
import { Crumbs } from "@/opportunities/parts";
import { STATE_OPTIONS } from "@/cms/records/states";
import { JsonLd } from "@/seo/jsonld";
import { absolute } from "@/seo/site";
import { getSession } from "@/server/auth";
import { AskQuestion, CompareSave, QuoteForm, ReportListing } from "./ProductActions";
import { ServiceView } from "./ServiceView";

// The product page (quote-only 393:7030, phones 395:9807; fixed price 393:8021, phones 395:10162), step 6.4. A price
// shows only for a fixed-price item, from core (canShowPrice); Add to cart and Buy now render only with the
// transactions flag on, so with it off no buy button exists in the page. Quote-only items carry Product structured
// data without an offer.

type Params = Promise<{ slug: string }>;

const load = (slug: string) => productDetail(getDb(), slug, { includeSample: showSample() });

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return { title: "Not found · H2 Economy" };
  return {
    title: `${p.name} · ${p.supplier.name} · H2 Economy`,
    description:
      p.summary ?? `${p.name} from ${p.supplier.name}: specifications, certificates and quotes on H2 Economy.`,
    alternates: { canonical: p.href },
  };
}
export const dynamic = "force-dynamic";

const TABS = [
  ["overview", "Overview"],
  ["specifications", "Specifications"],
  ["installation", "Installation"],
  ["certificates", "Certificates"],
  ["downloads", "Downloads"],
  ["delivery", "Delivery & warranty"],
  ["supplier", "About the supplier"],
] as const;

/** Product structured data with only what the page shows; no offer while buying is off (A121). */
function productLd(p: ProductDetail) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.summary ?? undefined,
    url: absolute(p.href),
    category: [p.classLabel, p.category.label, p.sub?.label].filter(Boolean).join(" > "),
    brand: { "@type": "Organization", name: p.supplier.name },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ state?: string }>;
}) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const forced = forcedState((await searchParams).state);
  const db = getDb();
  const [session, similar, guides] = await Promise.all([
    getSession(),
    similarProducts(db, p, { includeSample: showSample() }),
    guidesFor([p.category.label], 3),
  ]);
  const who = session ? await identityOf(db, session.user.id) : null;
  const company = who?.company ?? null;
  const transactions = isEnabled("transactions");
  const ref = { id: p.id, slug: p.slug, name: p.name, supplier: p.supplier.name, category: p.category.slug };
  const stateNames = STATE_OPTIONS.filter((s) => s.value !== "all-india").map((s) => s.label);
  if (p.serviceDetails) {
    return <ServiceView p={p} states={stateNames} signedIn={Boolean(session)} company={company} />;
  }
  const tabs = TABS.filter(([id]) => {
    if (id === "installation") return p.installation.length > 0;
    if (id === "certificates") return p.certificates.length > 0;
    if (id === "downloads") return p.documents.length > 0;
    return true;
  });

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <ViewBeacon type="listing_viewed" productId={p.id} />
      <JsonLd data={productLd(p)} />
      <section className={cx(wrap, "flex flex-col gap-6 pt-6 pb-12")}>
        <Crumbs
          items={[
            { label: "Marketplace", href: "/marketplace" },
            { label: p.classLabel, href: classHref(p.classId) },
            { label: p.category.label, href: categoryHref({ classId: p.classId, slug: p.category.slug }) },
            ...(p.sub
              ? [{ label: p.sub.label, href: categoryHref({ classId: p.classId, slug: p.sub.slug }, p.category) }]
              : []),
            { label: p.name },
          ]}
        />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,600px)_minmax(0,1fr)] lg:gap-12">
          {/* Founder v2 (18 Nov 2026): a branded tile until photos exist, and the key facts under it, so the left
              column carries what a buyer checks first instead of an empty grey box. The supplier's first checked
              photo replaces the drawing (20 Nov 2026). */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            {p.photos[0] ? (
              <div className="relative aspect-[16/9] overflow-hidden rounded-card bg-fresh-50 lg:aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element -- product photos come from the storage domain, already resized */}
                <img
                  src={p.photos[0].src}
                  srcSet={p.photos[0].srcSet || undefined}
                  sizes="(min-width: 1024px) 600px, 100vw"
                  alt={p.name}
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 size-full object-cover"
                />
              </div>
            ) : (
              <div
                className="relative aspect-[16/9] overflow-hidden rounded-card bg-fresh-50 lg:aspect-[4/3]"
                role="img"
                aria-label={`No photos of ${p.name} yet`}
              >
                <EquipmentArt kind={equipmentKind(p.category.slug, p.name)} />
              </div>
            )}
            <dl className="grid grid-cols-2 gap-3" aria-label="Key facts">
              <KeyFact label="Lead time" value={p.leadTime ?? "Ask the supplier"} />
              <KeyFact
                label="Warranty"
                value={p.warranty ? `${String(p.warranty.months)} months` : "Ask the supplier"}
              />
              <KeyFact label="Made in India" value={p.madeInIndia ? "Yes" : "Not stated"} />
              <KeyFact
                label="Minimum order"
                value={p.minOrder ? `${String(p.minOrder)} ${p.minOrder === 1 ? "unit" : "units"}` : "Ask the supplier"}
              />
            </dl>
          </div>

          <div className="flex flex-col gap-4">
            <p className="type-label-sm text-secondary">
              {[p.classLabel, p.category.label, p.sub?.label].filter(Boolean).join(" · ")}
            </p>
            <h1 className="type-h1 text-primary">{p.name}</h1>
            <p className="flex flex-wrap items-center gap-2 type-body text-body">
              by
              <Link href={p.supplier.href} className="type-label text-link hover:text-link-hover">
                {p.supplier.name}
              </Link>
              {p.supplier.verified ? <VerifiedBadge kind="supplier" /> : null}
            </p>
            {p.chips.length ? (
              <ul className="flex flex-wrap gap-2" aria-label="Key specifications">
                {p.chips.map((c) => (
                  <li
                    key={c}
                    className="rounded-pill border-[1.5px] border-control px-3 py-1.5 type-label text-primary"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            ) : null}
            {p.summary ? <p className="type-body text-body">{p.summary}</p> : null}

            <section aria-label="Buy box" className="flex flex-col gap-4 rounded-card border border-default p-6">
              {p.price ? (
                <div className="flex flex-col gap-1">
                  <p className="flex items-baseline gap-2">
                    <span className="type-h2 text-primary">{p.price.amount}</span>
                    <span className="type-body-sm text-secondary">excl. GST</span>
                  </p>
                  {p.price.gst ? <p className="type-body-sm text-body">{p.price.gst}</p> : null}
                  {p.price.total ? <p className="type-label text-primary">{p.price.total}</p> : null}
                  <p className="pt-2 type-body-sm text-body">Price set by the supplier, ex-works.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <h2 className="type-h3 text-primary">Price on request</h2>
                  {p.indicative ? (
                    <p className="type-body-sm text-body">
                      Indicative range from the supplier: {p.indicative}. The final price depends on site and scope.
                    </p>
                  ) : null}
                </div>
              )}
              <ul className="flex flex-col gap-2 type-body-sm text-body">
                {p.leadTime ? <Fact icon="truck">Lead time: {p.leadTime}</Fact> : null}
                {p.minOrder ? <Fact icon="info">Minimum order: {p.minOrder} units</Fact> : null}
                <Fact icon="file-text">GST invoice from the supplier</Fact>
              </ul>
              {p.price && transactions ? (
                <div className="flex flex-col gap-3" data-testid="buy-buttons">
                  <Link href={`/cart/add?product=${p.slug}`} className={buttonClasses({ size: "lg" })}>
                    <Icon name="shopping-cart" size={20} />
                    Add to cart
                  </Link>
                  <Link
                    href={`/cart/add?product=${p.slug}&buy=1`}
                    className={buttonClasses({ variant: "outline", size: "lg" })}
                  >
                    Buy now
                  </Link>
                  <p className="flex items-center gap-2 type-caption text-secondary">
                    <Icon name="shield-check" size={16} />
                    Payment is held until you accept delivery
                  </p>
                </div>
              ) : (
                <QuoteForm
                  product={ref}
                  states={STATE_OPTIONS.filter((s) => s.value !== "all-india").map((s) => s.label)}
                />
              )}
              <AskQuestion product={ref} signedIn={Boolean(session)} company={company} className="w-full" />
              <CompareSave product={ref} signedIn={Boolean(session)} buyer={who?.area === "buyer"} />
            </section>
            <div>
              <ReportListing product={ref} />
            </div>
          </div>
        </div>
      </section>

      <nav aria-label="On this page" className="sticky top-0 z-20 border-y border-default bg-page">
        <ul className={cx(wrap, "flex gap-6 overflow-x-auto")}>
          {tabs.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="inline-flex h-12 items-center type-label whitespace-nowrap text-primary hover:text-link"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div
        className={cx(
          wrap,
          "grid grid-cols-1 gap-12 py-12 lg:grid-cols-[minmax(0,792px)_minmax(0,360px)] lg:justify-between",
        )}
      >
        <div className="flex min-w-0 flex-col gap-12">
          <Block id="overview" title="Overview and applications">
            {p.summary ? <p className="type-body-lg text-body">{p.summary}</p> : null}
            {p.applications.length ? (
              <ul className="flex flex-wrap gap-2">
                {p.applications.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={applicationHref(a.id)}
                      className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control px-3 type-label text-primary hover:border-focus"
                    >
                      {a.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </Block>

          <Block id="specifications" title="Specifications">
            <div
              role="region"
              tabIndex={0}
              aria-label="Specifications"
              className="relative overflow-x-auto rounded-card border border-default"
            >
              <table className="w-full border-collapse md:min-w-120">
                <thead className="bg-subtle type-label-sm text-primary">
                  <tr>
                    {["Parameter", "Value", "Test condition"].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className={cx("px-4 py-3 text-left font-normal", h === "Test condition" && "max-md:hidden")}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                {p.specs.map((g) => (
                  <tbody key={g.group}>
                    <tr className="border-t border-default">
                      <th
                        scope="rowgroup"
                        colSpan={3}
                        className="bg-subtle/60 px-4 pt-4 pb-2 text-left type-label-sm text-secondary"
                      >
                        {g.group}
                      </th>
                    </tr>
                    {g.rows.map((r) => (
                      <tr key={r.label} className="border-t border-default type-body">
                        <th scope="row" className="px-4 py-3 text-left font-normal text-primary">
                          {r.label}
                        </th>
                        <td className="px-4 py-3 type-label text-primary tabular-nums">
                          {r.value}
                          {r.unit && r.unit !== "—" ? <span className="ml-1 text-secondary">{r.unit}</span> : null}
                          {r.condition ? (
                            <span className="mt-0.5 block type-caption font-normal text-secondary md:hidden">
                              {r.condition}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 type-caption text-secondary max-md:hidden">{r.condition}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
              <p className="border-t border-default px-4 py-3 type-caption text-secondary">
                Values come from the category&apos;s required fields, so filters, compare and this table always agree.
              </p>
            </div>
          </Block>

          {p.installation.length ? (
            <Block id="installation" title="Installation">
              <Facts rows={p.installation.map((f) => [f.label, f.value, f.unit ?? "—", f.note ?? ""])} />
            </Block>
          ) : null}

          {p.certificates.length ? (
            <Block id="certificates" title="Compliance and certificates">
              <div
                role="region"
                tabIndex={0}
                aria-label="Certificates"
                className="relative overflow-x-auto rounded-card border border-default"
              >
                <table className="w-full min-w-150 border-collapse">
                  <thead className="bg-subtle type-label-sm text-primary">
                    <tr>
                      {["Certificate", "Number", "Valid until", "Issuer"].map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 text-left font-normal">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {p.certificates.map((c) => (
                      <tr key={c.name} className="border-t border-default type-body-sm">
                        <th scope="row" className="px-4 py-3 text-left font-normal text-primary">
                          {c.name}
                        </th>
                        <td className="px-4 py-3 type-spec">{c.number ?? "—"}</td>
                        <td className="px-4 py-3">{c.validUntil ?? "—"}</td>
                        <td className="px-4 py-3 text-secondary">{c.issuer ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Block>
          ) : null}

          {p.documents.length ? (
            <Block id="downloads" title="Downloads">
              <ul className="flex flex-col divide-y divide-default rounded-card border border-default">
                {p.documents.map((d) => (
                  <li key={d.fileId} className="flex items-center gap-3 p-4">
                    <Icon name="file-text" size={20} className="text-icon-primary" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="type-label text-primary">{d.label}</span>
                      <span className="type-caption text-secondary">{d.meta}</span>
                    </span>
                    <a
                      href={`/api/v1/files/${d.fileId}/link`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Download ${d.label}`}
                      className="flex size-8 items-center justify-center rounded-pill border border-control hover:border-focus"
                    >
                      <Icon name="download" size={16} />
                    </a>
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}

          <Block id="delivery" title="Delivery, warranty and service">
            <Facts
              rows={[
                ["Lead time", p.leadTime ?? "Ask the supplier", "", "Ex-works, after order acceptance"],
                ...(p.warranty
                  ? [
                      ["Warranty", String(p.warranty.months), "months", p.warranty.note ?? ""] as [
                        string,
                        string,
                        string,
                        string,
                      ],
                    ]
                  : []),
                ...(p.service
                  ? [
                      ["Service in India", p.service.cities, "", p.service.note ?? ""] as [
                        string,
                        string,
                        string,
                        string,
                      ],
                    ]
                  : []),
              ]}
            />
          </Block>
        </div>

        <aside
          id="supplier"
          aria-labelledby="supplier-title"
          className="flex flex-col gap-4 self-start lg:sticky lg:top-16"
        >
          <h2 id="supplier-title" className="type-h3 text-primary">
            About the supplier
          </h2>
          <div className="flex flex-col overflow-hidden rounded-card border border-default">
            <div className="flex flex-col gap-3 p-5">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-12 items-center justify-center rounded-card bg-mint type-label-lg text-primary"
                >
                  {p.supplier.initials}
                </span>
                <span className="flex flex-col">
                  <span className="type-label-lg text-primary">{p.supplier.name}</span>
                  {p.supplier.place ? <span className="type-caption text-secondary">{p.supplier.place}</span> : null}
                </span>
              </div>
              {p.supplier.verified ? (
                <div className="flex flex-wrap gap-1.5">
                  <VerifiedBadge kind="supplier" />
                  <VerifiedBadge kind="gst" />
                </div>
              ) : null}
              {p.supplier.categories.length ? (
                <p className="type-body text-body">{p.supplier.categories.join(", ")}</p>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-default px-5 py-3.5">
              <Link
                href={p.supplier.href}
                className="inline-flex items-center gap-1.5 type-label text-link hover:text-link-hover"
              >
                View profile
                <Icon name="arrow-right" size={16} />
              </Link>
              <Link
                href={`/rfq/new?supplier=${p.supplier.slug}`}
                className={buttonClasses({ variant: "outline", size: "sm" })}
              >
                Request a quote
              </Link>
            </div>
          </div>
          <p className="type-caption text-secondary">
            {[
              p.supplier.foundedYear ? `In business since ${String(p.supplier.foundedYear)}` : null,
              p.supplier.employees ? `${p.supplier.employees} employees` : null,
              `${String(p.supplier.liveProducts)} ${p.supplier.liveProducts === 1 ? "product" : "products"} on H2 Economy`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </aside>
      </div>

      <section aria-labelledby="similar-title" className="bg-subtle py-12 md:py-16">
        <div className={cx(wrap, "flex flex-col gap-6")}>
          <div className="flex flex-col gap-2">
            <h2 id="similar-title" className="type-h2 text-primary">
              Similar products
            </h2>
            <p className="type-body text-body">Same category, with comparable specifications.</p>
          </div>
          <LiveSection
            label="Similar products"
            state={forced ?? (similar.length ? "ready" : "empty")}
            empty={
              <div className="rounded-card border border-default bg-page">
                <EmptyState title="No similar products yet">
                  Other suppliers in this category show here as they list.
                </EmptyState>
              </div>
            }
          >
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((s) => (
                <li key={s.id} className="flex">
                  <ProductCard
                    className="w-full"
                    name={s.name}
                    href={s.href}
                    eyebrow={[p.classLabel, p.category.label].join(" · ")}
                    supplier={s.supplier}
                    supplierVerified={s.verified}
                    chips={s.chips}
                    photo={s.photo}
                    leadTime={s.leadTime}
                    renderLink={({ href, className, children }) => (
                      <Link href={href} className={className}>
                        {children}
                      </Link>
                    )}
                  />
                </li>
              ))}
            </ul>
          </LiveSection>
        </div>
      </section>

      <section aria-labelledby="related-title" className="py-12 md:py-16">
        <div className={cx(wrap, "flex flex-col gap-6")}>
          <h2 id="related-title" className="type-h2 text-primary">
            Related news and guides
          </h2>
          <GuideCards guides={guides} state={forced} />
        </div>
      </section>
    </main>
  );
}

function Fact({ icon, children }: { icon: "truck" | "info" | "file-text"; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <Icon name={icon} size={18} className="text-icon-secondary" />
      {children}
    </li>
  );
}

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-16 flex-col gap-4">
      <h2 id={`${id}-title`} className="type-h3 text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: [string, string, string, string][] }) {
  return (
    <dl className="flex flex-col divide-y divide-default rounded-card border border-default">
      {rows.map(([label, value, unit, note]) => (
        <div
          key={label}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)] gap-3 px-4 py-3 max-md:grid-cols-2"
        >
          <dt className="type-body text-primary">{label}</dt>
          <dd className="type-label text-primary tabular-nums">
            {value}
            {unit && unit !== "—" ? <span className="ml-1 text-secondary">{unit}</span> : null}
          </dd>
          <dd className="type-caption text-secondary max-md:col-span-2">{note}</dd>
        </div>
      ))}
    </dl>
  );
}

/** One of the key facts under the product tile. */
function KeyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-card border border-default bg-page px-4 py-3">
      <dt className="type-caption text-secondary">{label}</dt>
      <dd className="type-label text-primary">{value}</dd>
    </div>
  );
}
