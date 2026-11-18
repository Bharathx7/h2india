import { buttonClasses, CategoryTile, cx, EmptyState, Icon, StatusBadge, VerifiedBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { dayMonthYear } from "@/news/format";
import { applicationLists, applicationPage, catalogue, guidesFor, suppliersFor } from "@/marketplace/data";
import { wrap } from "@/marketplace/parts";
import {
  allCategories,
  applicationHref,
  categoryBySlug,
  categoryHref,
  productsLine,
  tileIcon,
} from "@/marketplace/views";
import { readMinutes } from "@/news/data";
import { Crumbs } from "@/opportunities/parts";
import type { Guide } from "@/payload-types";

// An application (Refuelling & mobility 754:14685; phones 754:15141), step 6.2. One template for all seven (F4 safe
// default): the words, headline figures (always with source and date) and the "What goes into" chain are the
// application's CMS page; categories come from admin Catalogue; suppliers, guide, schemes, tenders, events and news
// from the directory and the CMS. An application without a published page shows its categories and the quote request.

type Params = Promise<{ id: string }>;

async function findApplication(id: string) {
  const cat = await catalogue();
  const app = cat.applications.find((a) => a.id === id);
  return app ? { cat, app } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const found = await findApplication(id);
  if (!found) return { title: "Not found · H2 Economy" };
  const page = await applicationPage(id);
  return {
    title: `${page?.title ?? found.app.label} · Marketplace · H2 Economy`,
    description: page?.intro ?? `${found.app.label}: equipment and suppliers on H2 Economy.`,
    alternates: { canonical: applicationHref(id) },
  };
}
export const dynamic = "force-dynamic";

export default async function ApplicationPage({ params }: { params: Params }) {
  const { id } = await params;
  const found = await findApplication(id);
  if (!found) notFound();
  const { cat, app } = found;
  const page = await applicationPage(id);
  const categories = allCategories(cat).filter((c) => app.categoryIds.includes(c.id));
  const chain = (page?.chain?.steps ?? []).map((s) => ({
    ...s,
    cat: s.category ? categoryBySlug(cat, s.category) : undefined,
  }));
  const words = [...categories.map((c) => c.label), ...chain.flatMap((s) => (s.cat ? [s.cat.label] : []))];
  const guide = page?.guide && typeof page.guide === "object" ? page.guide : null;
  const [suppliers, lists, guides] = await Promise.all([
    suppliersFor(words, 4),
    applicationLists(page),
    guide ? Promise.resolve([] as Guide[]) : guidesFor(words, 1),
  ]);
  const shownGuide = guide ?? guides[0] ?? null;
  const browse = productsLine(app.liveProducts);

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <section aria-labelledby="app-title">
        <div className={cx(wrap, "flex flex-col gap-6 pt-8 pb-10 md:pt-10")}>
          <Crumbs items={[{ label: "Marketplace", href: "/marketplace" }, { label: app.label }]} />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-195 flex-col gap-3">
              <h1 id="app-title" className="type-h1 text-primary">
                {page?.title ?? app.label}
              </h1>
              {page?.intro ? <p className="type-body-lg text-body">{page.intro}</p> : null}
            </div>
            <div className="flex flex-wrap gap-3">
              {browse ? (
                <Link
                  href={`/search?scope=products&q=${encodeURIComponent(app.label)}`}
                  className={buttonClasses({ variant: "outline", size: "lg" })}
                >
                  Browse {browse}
                </Link>
              ) : null}
              <Link href="/rfq/new" className={buttonClasses({ size: "lg" })}>
                Request a quote
              </Link>
            </div>
          </div>
          {page?.figures?.length ? (
            <div className="flex flex-col gap-3">
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {page.figures.map((f) => (
                  <div key={f.id ?? f.label} className="flex flex-col-reverse gap-1 rounded-card bg-subtle p-4">
                    <dt className="type-caption text-secondary">{f.label}</dt>
                    <dd className="type-h3 text-primary">{f.value}</dd>
                  </div>
                ))}
              </dl>
              {page.figuresSource && page.figuresAsOf ? (
                <p className="type-caption text-secondary">
                  Source: {page.figuresSource}, data as of {dayMonthYear(page.figuresAsOf)}.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <div className={cx(wrap, "flex flex-col gap-6 pb-16")}>
        {chain.length ? (
          <Card title={page?.chain?.title ?? "What goes into it"} sub={page?.chain?.note ?? undefined}>
            <ol className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
              {chain.map((s, i) => (
                <li
                  key={s.id ?? s.label}
                  className="flex flex-col items-stretch gap-3 lg:flex-1 lg:flex-row lg:items-center"
                >
                  {i > 0 ? (
                    <Icon name="arrow-right" size={18} className="self-center text-icon-primary max-lg:rotate-90" />
                  ) : null}
                  {s.cat ? (
                    <Link
                      href={categoryHref(s.cat)}
                      className="flex flex-1 flex-col gap-1 rounded-control border border-accent bg-mint p-3 hover:shadow-soft"
                    >
                      <span className="type-label text-primary">{s.label}</span>
                      <span className="type-caption text-link">
                        {[s.cat.label, productsLine(s.cat.liveProducts)].filter(Boolean).join(" · ")}
                      </span>
                    </Link>
                  ) : (
                    <div className="flex flex-1 flex-col gap-1 rounded-control bg-subtle p-3">
                      <span className="type-label text-primary">{s.label}</span>
                      {s.note ? <span className="type-caption text-secondary">{s.note}</span> : null}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        ) : categories.length ? (
          <Card title="Categories">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {categories.map((c) => (
                <CategoryTile
                  key={c.id}
                  title={c.label}
                  detail={productsLine(c.liveProducts)}
                  href={categoryHref(c)}
                  icon={tileIcon(c.slug)}
                />
              ))}
            </div>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <Card
              title="Top suppliers"
              sub={`Verified suppliers with ${app.shortLabel.toLowerCase()} products on H2 Economy.`}
            >
              {suppliers.length ? (
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {suppliers.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 rounded-control border border-default p-3">
                      <span
                        aria-hidden="true"
                        className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-subtle type-label-sm text-primary"
                      >
                        {s.initials}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <Link href={s.href} className="type-label text-link underline-offset-2 hover:underline">
                          {s.name}
                        </Link>
                        <span className="type-caption text-secondary">
                          {s.categories.slice(0, 2).join(", ") || s.summary}
                        </span>
                      </span>
                      {s.verified ? <VerifiedBadge kind="gst" /> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="type-body text-body">Suppliers show here as they list with H2 Economy.</p>
              )}
            </Card>
            <Card title="Schemes and tenders">
              {lists.records.length ? (
                <ul className="flex flex-col divide-y divide-default">
                  {lists.records.map((r) => (
                    <Row key={r.href} href={r.href} title={r.title} meta={r.kind} status={r.status} />
                  ))}
                </ul>
              ) : (
                <p className="type-body text-body">No open schemes or tenders on this right now.</p>
              )}
            </Card>
            <Card title="Latest news">
              {lists.news.length ? (
                <ul className="flex flex-col divide-y divide-default">
                  {lists.news.map((a) => (
                    <Row
                      key={a.href}
                      href={a.href}
                      title={a.title}
                      meta={`${a.typeLabel} · ${dayMonthYear(a.publishedAt)}`}
                    />
                  ))}
                </ul>
              ) : (
                <p className="type-body text-body">No recent news on this yet.</p>
              )}
            </Card>
          </div>

          <aside className="flex flex-col gap-6" aria-label={`More on ${app.label}`}>
            {shownGuide ? (
              <div className="flex flex-col items-start gap-3 rounded-card bg-mint p-6">
                <p className="type-eyebrow text-secondary">Buyer&apos;s guide · {readMinutes(shownGuide.body)} min</p>
                <h2 className="type-h4 text-primary">{shownGuide.title}</h2>
                <p className="type-body-sm text-body">{shownGuide.summary}</p>
                <Link
                  href={`/knowledge/guides/${shownGuide.slug}`}
                  className={buttonClasses({ variant: "outline", size: "sm" })}
                >
                  Read the guide
                </Link>
              </div>
            ) : null}
            <Card title="Events">
              {lists.events.length ? (
                <ul className="flex flex-col divide-y divide-default">
                  {lists.events.map((e) => (
                    <Row
                      key={e.id}
                      href={`/events/${e.slug}`}
                      title={e.name}
                      meta={[dayMonthYear(e.startsAt), e.city].filter(Boolean).join(" · ")}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyState title="No upcoming events">Events on this show here when they're announced.</EmptyState>
              )}
            </Card>
            <div className="flex flex-col items-start gap-3 rounded-card bg-subtle p-6">
              <h2 className="type-h4 text-primary">{page?.cta?.title ?? "Planning a project?"}</h2>
              <p className="type-body-sm text-body">
                {page?.cta?.text ?? "Send one request and get quotes from verified suppliers for the whole package."}
              </p>
              <Link href="/rfq/new" className={buttonClasses({ size: "sm" })}>
                Request a quote
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-default p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="type-h4 text-primary">{title}</h2>
        {sub ? <p className="type-caption text-secondary">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Row({ href, title, meta, status }: { href: string; title: string; meta: string; status?: string | null }) {
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link href={href} className="type-label text-link underline-offset-2 hover:underline">
          {title}
        </Link>
        <span className="type-caption text-secondary">{meta}</span>
      </span>
      {status ? <StatusBadge status={status} /> : null}
    </li>
  );
}
