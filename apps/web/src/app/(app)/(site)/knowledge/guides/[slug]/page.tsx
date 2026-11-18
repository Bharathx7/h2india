import config from "@payload-config";
import { buttonClasses, cx, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPayload } from "payload";
import { ArticleBody, headingsOf } from "@/components/article/ArticleBody";
import { glossaryTerms } from "@/cms/knowledge/library";
import { getGuideRecord } from "@/knowledge/data";
import { dayMonthYear, readMinutes } from "@/news/data";
import { initials } from "@/news/article";
import { ShareButton } from "@/news/client";
import { Crumbs, wrap } from "@/opportunities/parts";
import type { Author } from "@/payload-types";

// A buyer's guide (472:2135; phones 473:3363, step 5.6): what the equipment is, how to compare it, the Indian
// approvals and what to ask, with "On this page", who it's for and "Ready to buy?". "Compressors on H2 Economy" (live
// products) joins with the marketplace in Stage 6. A guide without product categories is an Insights piece.

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const g = await getGuideRecord((await params).slug);
  if (!g) return { title: "Not found · H2 Economy" };
  return {
    title: `${g.title} · H2 Economy`,
    description: g.summary,
    alternates: { canonical: `/knowledge/guides/${g.slug}` },
  };
}
export const dynamic = "force-dynamic";

const STEPS = [
  { title: "Describe what you need", text: "Specs, quantity, delivery site and the date you need it on site." },
  { title: "H2 Economy checks it", text: "We review every request within 1 working day before it goes out." },
  { title: "Compare and choose", text: "Quotes arrive in one format. Accept the best one and order." },
];

export default async function BuyersGuidePage({ params }: { params: Params }) {
  const { slug } = await params;
  const g = await getGuideRecord(slug);
  if (!g) notFound();
  const categories = g.productCategories ?? [];
  if (!categories.length) redirect(`/knowledge/insights/${g.slug}`);
  const glossary = await glossaryTerms(await getPayload({ config }));
  const authors = (g.authors ?? []).filter((a): a is Author => typeof a === "object");
  const lead = authors[0];
  const headings = headingsOf(g.body);
  const category = categories[0] ?? "";
  const quote = `/rfq/new?${new URLSearchParams({ q: category }).toString()}`;

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "pt-6 md:pt-8")}>
        <Crumbs
          items={[
            { label: "Knowledge", href: "/knowledge" },
            { label: "Buyer's guides", href: "/knowledge/guides" },
            { label: g.title.split(":")[0] ?? g.title },
          ]}
        />
      </div>
      <div className={cx(wrap, "flex flex-col gap-8 pb-12 pt-6 lg:flex-row lg:items-start lg:gap-12")}>
        <article className="flex min-w-0 max-w-180 flex-1 flex-col gap-6">
          <header className="flex flex-col gap-3 border-b border-default pb-5">
            <p className="flex items-center gap-2">
              <StatusBadge status="Buyer's guide" tone="success" />
              <span className="type-label-sm text-secondary">BUYER&apos;S GUIDE · {category.toUpperCase()}</span>
            </p>
            <h1 className="type-h1 text-primary">{g.title}</h1>
            <p className="type-body-lg text-body">{g.summary}</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {lead ? (
                <span className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-pill bg-mint type-label-sm text-primary">
                    {initials(lead.name)}
                  </span>
                  <span className="flex flex-col">
                    <Link href={`/authors/${lead.slug}`} className="type-label-sm text-link hover:underline">
                      By {lead.name}
                    </Link>
                    {lead.title ? <span className="type-caption text-secondary">{lead.title}</span> : null}
                  </span>
                </span>
              ) : (
                <span />
              )}
              <ShareButton title={g.title} />
            </div>
            <p className="type-caption text-secondary">
              Updated {dayMonthYear(g.updatedAt)} · {readMinutes(g.body)} min read
            </p>
          </header>
          <ArticleBody data={g.body} glossary={glossary} />
        </article>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:w-80 lg:shrink-0">
          {g.audience ? (
            <section aria-labelledby="who" className="flex flex-col gap-2 rounded-card bg-mint p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 id="who" className="type-label text-primary">
                  Who this is for
                </h2>
                {g.level ? <StatusBadge status={g.level} tone="success" /> : null}
              </div>
              <p className="type-body-sm text-body">{g.audience}</p>
            </section>
          ) : null}
          {headings.length ? (
            <nav aria-labelledby="on-page" className="flex flex-col gap-2 rounded-card border border-default p-5">
              <h2 id="on-page" className="type-label text-primary">
                On this page
              </h2>
              <ol className="flex flex-col gap-1 border-l border-default pl-3">
                {headings.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} className="type-body-sm text-body hover:text-link">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <section aria-labelledby="ready" className="flex flex-col gap-3 rounded-card border border-default p-5">
            <h2 id="ready" className="type-label text-primary">
              Ready to buy?
            </h2>
            <p className="type-body-sm text-body">
              Send one request to up to 5 verified {category.toLowerCase()} suppliers.
            </p>
            <Link href={quote} className={cx(buttonClasses({ variant: "primary" }), "w-full")}>
              Request a quote
            </Link>
          </section>
        </aside>
      </div>

      <section aria-labelledby="rfq" className="border-t border-default">
        <div className={cx(wrap, "grid grid-cols-1 gap-6 py-12 lg:grid-cols-[22rem_1fr] lg:items-center")}>
          <div className="flex flex-col gap-3">
            <p className="type-label-sm text-secondary">REQUEST A QUOTE</p>
            <h2 id="rfq" className="type-h2 text-primary">
              Send one request to up to 5 verified suppliers
            </h2>
            <p className="type-body-sm text-body">
              H2 Economy checks every request within 1 working day. Suppliers then quote in the same format, so you can
              compare them side by side.
            </p>
            <Link href={quote} className={cx(buttonClasses({ variant: "primary" }), "self-start")}>
              Request a quote
            </Link>
          </div>
          <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-2 rounded-card border border-default p-4">
                <span className="flex size-7 items-center justify-center rounded-pill bg-mint type-spec text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="type-label text-primary">{s.title}</span>
                <span className="type-body-sm text-body">{s.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
