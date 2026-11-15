import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses, cx, EmptyState, Icon } from "@h2india/ui";
import { helpArticles } from "@/trust/data";
import { categoryLabel, CategoryCards, HelpSearch, StillStuck } from "@/trust/help";
import { main, wrap } from "@/trust/parts";
import { searchHelp } from "@/trust/views";

// Help centre (96:1942), search results and no results (763:40134).

export const metadata: Metadata = {
  title: "Help centre · H2 India",
  description: "Answers about buying, selling, payments, verification, alerts and your account on H2 India.",
  alternates: { canonical: "/help" },
};
export const dynamic = "force-dynamic";

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const articles = await helpArticles();
  const results = q ? searchHelp(articles, q) : [];
  const popular = articles
    .filter((a) => a.popular)
    .sort((a, b) => (a.popular ?? 0) - (b.popular ?? 0))
    .slice(0, 6);
  return (
    <main id="main" className={cx(main, "bg-page")}>
      <HelpSearch q={q} />
      {q ? (
        <section aria-labelledby="results" className={cx(wrap, "flex flex-col gap-4 pt-8")}>
          <h2 id="results" className="type-body-sm text-secondary" aria-live="polite">
            {results.length} {results.length === 1 ? "result" : "results"} for &ldquo;{q}&rdquo;
          </h2>
          {results.length ? (
            <ul className="flex flex-col divide-y divide-default border-y border-default">
              {results.map((a) => (
                <li key={a.id} className="flex flex-col gap-0.5 py-3">
                  <Link href={`/help/${a.slug}`} className="type-label text-link hover:underline">
                    {a.title}
                  </Link>
                  <span className="type-caption text-secondary">
                    {categoryLabel(a.category)} · {a.readMinutes ?? 2} min read
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              kind="no-results"
              title={`No help articles match “${q}”`}
              action={
                <Link href="/contact" className={buttonClasses({ size: "sm" })}>
                  Contact support
                </Link>
              }
            >
              Check the spelling or try fewer words. You can also browse the categories below, or write to our support
              team with your question.
            </EmptyState>
          )}
        </section>
      ) : null}
      <section
        aria-label={q ? "Browse by category" : "Help categories"}
        className={cx(wrap, "flex flex-col gap-4 pt-8")}
      >
        {q ? <h2 className="type-h3 text-primary">Browse by category</h2> : null}
        <CategoryCards articles={articles} />
      </section>
      {!q && popular.length ? (
        <section aria-labelledby="popular" className={cx(wrap, "flex flex-col gap-4 pt-12")}>
          <h2 id="popular" className="type-h3 text-primary">
            Popular articles
          </h2>
          <ol className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
            {popular.map((a, i) => (
              <li key={a.id} className="flex gap-4 border-b border-default py-3">
                <span className="type-spec text-secondary">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex flex-col gap-0.5">
                  <Link href={`/help/${a.slug}`} className="inline-flex items-center gap-1 type-label text-link">
                    {a.title} <Icon name="arrow-right" size={14} />
                  </Link>
                  <span className="type-caption text-secondary">
                    {categoryLabel(a.category)} · {a.readMinutes ?? 2} min read
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      <StillStuck />
    </main>
  );
}
