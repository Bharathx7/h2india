import config from "@payload-config";
import { ArrowLink, Breadcrumbs, cx, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPayload } from "payload";
import { ArticleBody, headingsOf } from "@/components/article/ArticleBody";
import { glossaryTerms } from "@/cms/knowledge/library";
import { initials } from "@/news/article";
import { dayMonthYear, getGuide, listInsights, readMinutes } from "@/news/data";
import { ShareButton, WeeklyBox } from "@/news/client";
import { RelatedStories, wrap } from "@/news/parts";
import type { Author, Topic } from "@/payload-types";

// An Insights guide (441:801; phones 441:1669, step 5.3, A55): who it's for, what you'll learn, contents, the guide,
// the author and related insights. "Products in this guide" comes with the marketplace (Stage 6). Analysis and
// explainer pieces on Insights open as articles under /news.

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const guide = await getGuide((await params).slug);
  if (!guide) return { title: "Not found · H2 Economy" };
  return {
    title: `${guide.title} · Insights · H2 Economy`,
    description: guide.summary,
    alternates: { canonical: `/knowledge/insights/${guide.slug}` },
  };
}

const objects = <T extends object>(rel: unknown): T[] =>
  Array.isArray(rel) ? rel.filter((r): r is T => Boolean(r) && typeof r === "object") : [];

export default async function GuidePage({ params }: { params: Params }) {
  const guide = await getGuide((await params).slug);
  if (!guide) notFound();
  // A guide written for a product category is a buyer's guide (472:2135, step 5.6) and lives there.
  if ((guide.productCategories ?? []).length) redirect(`/knowledge/guides/${guide.slug}`);
  const payload = await getPayload({ config });
  const [glossary, related] = await Promise.all([glossaryTerms(payload), listInsights({ limit: 4 })]);
  const authors = objects<Author>(guide.authors);
  const lead = authors[0];
  const topics = objects<Topic>(guide.topics);
  const headings = headingsOf(guide.body);
  const others = related.items.filter((a) => !(a.kind === "guide" && a.id === guide.id)).slice(0, 3);
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "pt-6")}>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Knowledge", href: "/knowledge" },
            { label: "Insights", href: "/knowledge/insights" },
          ]}
          renderLink={(c, className) => (
            <Link href={c.href} className={className}>
              {c.label}
            </Link>
          )}
        />
      </div>
      <div className={cx(wrap, "flex flex-col gap-8 py-6 lg:flex-row lg:items-start lg:gap-24")}>
        <article className="flex min-w-0 max-w-180 flex-1 flex-col gap-6">
          <header className="flex flex-col gap-4 border-b border-default pb-6">
            <p className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-tint px-2.5 py-1 type-label-sm text-primary">
                <span aria-hidden="true" className="size-1.5 rounded-pill bg-current" />
                Guide
              </span>
              <span className="type-label-sm text-link">Insights · Buyer&apos;s guide</span>
            </p>
            <h1 className="type-h1 text-primary">{guide.title}</h1>
            <p className="type-body-lg text-body">{guide.summary}</p>
            <div className="flex items-center gap-3">
              {lead ? (
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-mint type-label-sm text-primary"
                >
                  {initials(lead.name)}
                </span>
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {lead ? (
                  <p className="type-label text-link">
                    By{" "}
                    <Link href={`/authors/${lead.slug}`} className="hover:underline">
                      {authors.map((x) => x.name).join(", ")}
                    </Link>
                  </p>
                ) : null}
                {lead?.title ? <p className="type-caption text-secondary">{lead.title}</p> : null}
              </div>
              <ShareButton title={guide.title} />
            </div>
            <p className="type-caption text-secondary">
              Updated {dayMonthYear(guide.updatedAt)} · {readMinutes(guide.body)} min read
            </p>
          </header>
          <div
            aria-hidden="true"
            className="flex aspect-video w-full items-center justify-center rounded-card bg-mint text-icon-primary"
          >
            <Icon name="newspaper" size={48} />
          </div>
          <ArticleBody data={guide.body} glossary={glossary} />
          {lead ? (
            <section aria-label="About the author" className="flex gap-3 rounded-card bg-subtle p-4">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-page type-label-sm text-primary"
              >
                {initials(lead.name)}
              </span>
              <div className="flex flex-col gap-1">
                <p className="type-label text-primary">{lead.name}</p>
                {lead.bio ? <p className="type-caption text-body">{lead.bio}</p> : null}
                <ArrowLink asChild className="type-label-sm">
                  <Link href={`/authors/${lead.slug}`}>More from {lead.name.split(/\s+/)[0]}</Link>
                </ArrowLink>
              </div>
            </section>
          ) : null}
          {topics.length ? (
            <ul aria-label="Topics" className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/topics/${t.slug}`}
                    className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control bg-page px-2.75 type-label text-primary hover:border-focus"
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
        <aside className="flex flex-col gap-6 lg:w-96 lg:shrink-0">
          {guide.audience || (guide.learn ?? []).length ? (
            <section aria-label="Who this is for" className="flex flex-col gap-3 rounded-card bg-mint p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="type-h4 text-primary">Who this is for</h2>
                {guide.level ? (
                  <span className="inline-flex items-center gap-1.5 rounded-pill bg-tint px-2.5 py-1 type-label-sm text-primary">
                    <span aria-hidden="true" className="size-1.5 rounded-pill bg-current" />
                    {guide.level}
                  </span>
                ) : null}
              </div>
              {guide.audience ? <p className="type-body-sm text-body">{guide.audience}</p> : null}
              {(guide.learn ?? []).length ? (
                <>
                  <p className="type-label-sm text-secondary">You will learn</p>
                  <ul className="flex flex-col gap-2">
                    {(guide.learn ?? []).map((l) => (
                      <li key={l.id ?? l.point} className="flex items-start gap-2 type-body-sm text-body">
                        <Icon name="check-circle" size={18} className="mt-0.5 shrink-0 text-icon-primary" />
                        {l.point}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          ) : null}
          {headings.length ? (
            <nav
              aria-label="On this page"
              className="flex flex-col gap-3 rounded-card border border-default bg-page p-5"
            >
              <h2 className="type-h4 text-primary">On this page</h2>
              <ol className="flex flex-col gap-2">
                {headings.map((h) => (
                  <li key={h.id} className="border-l-2 border-default pl-2.5 type-body-sm text-body">
                    <a href={`#${h.id}`} className="hover:text-link-hover hover:underline">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <WeeklyBox />
        </aside>
      </div>
      <RelatedStories items={others} title="Related insights" columns={3} />
    </main>
  );
}
