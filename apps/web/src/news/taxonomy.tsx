import { ArrowLink, Breadcrumbs, cx, Icon, Pagination } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Author } from "@/payload-types";
import { authorCovers, dayMonthYear, listArticles, topicGlossary, topicRecords, type ArticleSummary } from "./data";
import { initials } from "./article";
import { NoStories, StoryCard, wrap } from "./parts";

// Topic (442:4049; phones 443:4659), tag (443:4989; phones 443:5301) and author pages (444:5431; phones 444:5737;
// external contributor 444:5946). Following a topic or author comes with member accounts (Stage 7); companies and
// products on a topic page come with the directory and marketplace (Stage 6).

export const PER_PAGE = 20;

function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <Breadcrumbs
      items={items}
      renderLink={(c, className) => (
        <Link href={c.href} className={className}>
          {c.label}
        </Link>
      )}
    />
  );
}

function StoryList({
  items,
  total,
  page,
  emptyHref,
}: {
  items: ArticleSummary[];
  total: number;
  page: number;
  emptyHref: string;
}) {
  if (!items.length) return <NoStories filtered={false} href={emptyHref} />;
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {items.map((a) => (
          <li key={a.id}>
            <StoryCard a={a} layout="row" />
          </li>
        ))}
      </ul>
      {total > PER_PAGE ? (
        <Pagination className="mt-3" page={page} perPage={PER_PAGE} total={total} perPageOptions={[PER_PAGE]} />
      ) : null}
    </div>
  );
}

function Chips({ items }: { items: { label: string; href: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((c) => (
        <li key={c.href}>
          <Link
            href={c.href}
            className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control bg-page px-2.75 type-label text-primary hover:border-focus"
          >
            {c.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SideCard({
  title,
  tone = "outline",
  children,
}: {
  title: string;
  tone?: "outline" | "tint";
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={cx(
        "flex flex-col gap-3 rounded-card p-5",
        tone === "tint" ? "bg-subtle" : "border border-default bg-page",
      )}
    >
      <h2 className="type-h4 text-primary">{title}</h2>
      {children}
    </section>
  );
}

export async function TopicPage({
  topic,
  page,
}: {
  topic: { id: number; name: string; slug: string; description?: string | null };
  page: number;
}) {
  const [list, records, glossary] = await Promise.all([
    listArticles({ topic: topic.slug, page, limit: PER_PAGE }),
    topicRecords(topic.id),
    topicGlossary(topic.id),
  ]);
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className="bg-mint">
        <div className={cx(wrap, "flex flex-col gap-3 py-8")}>
          <Crumbs
            items={[
              { label: "Home", href: "/" },
              { label: "News", href: "/news" },
              { label: "Topics" },
              { label: topic.name },
            ]}
          />
          <p className="mt-2 type-eyebrow text-secondary">Topic</p>
          <h1 className="type-h1 text-primary">{topic.name}</h1>
          {topic.description ? <p className="max-w-180 type-body text-body">{topic.description}</p> : null}
        </div>
      </div>
      <div className={cx(wrap, "flex flex-col gap-8 py-10 lg:flex-row lg:items-start")}>
        <section aria-labelledby="latest" className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <h2 id="latest" className="type-h2 text-primary">
              Latest on {topic.name.toLowerCase()}
            </h2>
            <p className="type-label text-secondary">
              {list.total} {list.total === 1 ? "story" : "stories"}
            </p>
          </div>
          <StoryList items={list.items} total={list.total} page={list.page} emptyHref="/news" />
        </section>
        <aside className="flex flex-col gap-4 lg:w-96 lg:shrink-0">
          {records.length ? (
            <SideCard title="Schemes and tenders">
              <ul className="flex flex-col">
                {records.map((r) => (
                  <li key={r.href} className="flex flex-col gap-0.5 border-b border-default py-3 last:border-0">
                    <p className="type-eyebrow text-secondary">
                      {r.kind}
                      {r.status ? ` · ${r.status}` : ""}
                    </p>
                    <Link href={r.href} className="type-label text-primary hover:text-link-hover hover:underline">
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </SideCard>
          ) : null}
          {glossary.length ? (
            <SideCard title="Glossary terms" tone="tint">
              <Chips items={glossary.map((g) => ({ label: g.term, href: `/knowledge/glossary/${g.slug}` }))} />
            </SideCard>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

export async function TagPage({ tag, page }: { tag: { name: string; slug: string }; page: number }) {
  const list = await listArticles({ tag: tag.slug, page, limit: PER_PAGE });
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-3 pt-8 pb-6")}>
        <Crumbs
          items={[
            { label: "Home", href: "/" },
            { label: "News", href: "/news" },
            { label: "Tags" },
            { label: tag.name },
          ]}
        />
        <p className="mt-2 type-eyebrow text-secondary">Tag</p>
        <h1 className="type-h1 text-primary">{tag.name}</h1>
        <p className="type-body text-secondary">
          {list.total} {list.total === 1 ? "story" : "stories"} tagged {tag.name}
        </p>
      </div>
      <div className={cx(wrap, "max-w-200 pb-16")}>
        <StoryList items={list.items} total={list.total} page={list.page} emptyHref="/news" />
      </div>
    </main>
  );
}

export async function AuthorPage({ author, page }: { author: Author; page: number }) {
  const [list, covers] = await Promise.all([
    listArticles({ author: author.slug, page, limit: PER_PAGE }),
    authorCovers(author.slug),
  ]);
  const firstName = author.name.split(/\s+/)[0] ?? author.name;
  const kind =
    author.kind === "contributor"
      ? "Contributor"
      : author.kind === "organisation"
        ? "Organisation"
        : "H2 Economy newsroom";
  const latest = list.items[0];
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className="bg-mint">
        <div className={cx(wrap, "flex flex-col gap-6 py-10 md:flex-row md:items-start")}>
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-pill bg-page type-h3 text-primary md:size-24"
          >
            {initials(author.name)}
          </span>
          <div className="flex max-w-180 flex-col gap-3">
            <p className="type-eyebrow text-secondary">
              Author · {kind}
              {author.kind === "contributor" && author.organisation ? ` · ${author.organisation}` : ""}
            </p>
            <h1 className="type-h1 text-primary">{author.name}</h1>
            {author.title ? <p className="type-label text-primary">{author.title}</p> : null}
            {author.bio ? <p className="type-body text-body">{author.bio}</p> : null}
            {covers.length ? (
              <div className="flex flex-col gap-2">
                <p className="type-eyebrow text-secondary">Covers</p>
                <Chips items={covers.map((c) => ({ label: c.name, href: c.href }))} />
              </div>
            ) : null}
            {(author.links ?? []).length ? (
              <p className="flex flex-wrap gap-3 type-label">
                {(author.links ?? []).map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-link hover:underline"
                  >
                    {l.label}
                    <Icon name="external-link" size={14} />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ))}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <section aria-labelledby="stories" className={cx(wrap, "flex max-w-200 flex-col gap-4 py-10")}>
        <div className="flex items-end justify-between gap-3">
          <h2 id="stories" className="type-h2 text-primary">
            Stories by {firstName}
          </h2>
          <p className="type-label-sm text-secondary">
            {list.total} {list.total === 1 ? "story" : "stories"}
            {latest ? ` · latest ${dayMonthYear(latest.publishedAt)}` : ""}
          </p>
        </div>
        <StoryList items={list.items} total={list.total} page={list.page} emptyHref="/news" />
        <ArrowLink asChild className="self-start">
          <Link href="/news">All news</Link>
        </ArrowLink>
      </section>
    </main>
  );
}
