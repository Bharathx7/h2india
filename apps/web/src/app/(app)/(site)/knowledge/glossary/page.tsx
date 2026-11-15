import { ArrowLink, buttonClasses, cx, EmptyState, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { allTerms, termOfTheDay } from "@/knowledge/data";
import { Crumbs, wrap } from "@/opportunities/parts";

// Hydrogen glossary (735:3378, step 5.6): letters, search, the terms under the chosen letter, term of the day, most
// searched and "Missing a term?". Each term opens its page (735:3810).

export const metadata: Metadata = {
  title: "Hydrogen glossary · H2 India",
  description: "Terms used in India's hydrogen industry, each explained in plain language.",
  alternates: { canonical: "/knowledge/glossary" },
};
export const dynamic = "force-dynamic";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

export default async function GlossaryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const s = await searchParams;
  const terms = await allTerms();
  const initial = (t: { term: string }) => t.term.charAt(0).toUpperCase();
  const present = new Set(terms.map(initial));
  const q = one(s.q).trim().toLowerCase().slice(0, 60);
  const asked = one(s.letter).toUpperCase();
  const letter = !q && present.has(asked) ? asked : !q ? (LETTERS.find((l) => present.has(l)) ?? "") : "";
  const list = q
    ? terms.filter((t) =>
        [t.term, t.expansion, t.short, ...(t.aliases ?? [])].some((x) => (x ?? "").toLowerCase().includes(q)),
      )
    : terms.filter((t) => initial(t) === letter);
  const today = termOfTheDay(terms);
  const popular = terms.filter((t) => t.popular);

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs items={[{ label: "Knowledge", href: "/knowledge" }, { label: "Glossary" }]} />
        <h1 className="mt-2 type-h1 text-primary">Hydrogen glossary</h1>
        <p className="type-body text-body">
          {terms.length} terms used in India&apos;s hydrogen industry, each explained in plain language with units and
          related products.
        </p>
      </div>
      <div className={cx(wrap, "flex flex-col gap-6 pb-16 pt-6 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <form action="/knowledge/glossary" role="search">
            <label className="flex h-11.5 items-center gap-2 rounded-control border border-input bg-page px-4 focus-within:field-focus">
              <Icon name="search" size={18} className="text-icon-secondary" />
              <span className="sr-only">Search the glossary</span>
              <input
                type="search"
                name="q"
                defaultValue={q}
                maxLength={60}
                placeholder={`Search ${String(terms.length)} terms, for example LCOH or Nm³/h`}
                className="min-w-0 flex-1 bg-transparent type-body text-primary placeholder:text-secondary focus-visible:outline-none"
              />
            </label>
          </form>
          <nav aria-label="Letters" className="flex flex-wrap gap-2">
            {LETTERS.map((l) =>
              present.has(l) ? (
                <Link
                  key={l}
                  href={`/knowledge/glossary?letter=${l}`}
                  aria-current={l === letter ? "page" : undefined}
                  className={cx(
                    "flex size-8 items-center justify-center rounded-control border type-label",
                    l === letter
                      ? "border-transparent bg-inverse text-inverse"
                      : "border-control text-primary hover:border-focus",
                  )}
                >
                  {l}
                </Link>
              ) : (
                <span
                  key={l}
                  aria-hidden="true"
                  className="flex size-8 items-center justify-center rounded-control border border-default type-label text-secondary opacity-40"
                >
                  {l}
                </span>
              ),
            )}
          </nav>
          <p className="flex items-baseline gap-2">
            <span className="type-h3 text-primary">{q ? `“${q}”` : letter}</span>
            <span className="type-caption text-secondary">
              {list.length} {list.length === 1 ? "term" : "terms"}
            </span>
          </p>
          {list.length ? (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {list.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/knowledge/glossary/${t.slug}`}
                    className="flex h-full flex-col gap-1 rounded-card border border-default p-4 hover:border-focus"
                  >
                    <span className="type-label text-link">{t.term}</span>
                    <span className="type-body-sm text-body">{t.short}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-card border border-default py-6">
              <EmptyState
                kind="no-results"
                title="No term matches"
                action={
                  <Link href="/contact?about=glossary" className={buttonClasses({ variant: "outline", size: "sm" })}>
                    Suggest a term
                  </Link>
                }
              >
                Try another spelling, or tell us the term and we&apos;ll add it.
              </EmptyState>
            </div>
          )}
        </div>
        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          {today ? (
            <section aria-labelledby="today" className="flex flex-col gap-2 rounded-card bg-mint p-5">
              <p className="type-eyebrow text-secondary">TERM OF THE DAY</p>
              <h2 id="today" className="type-h4 text-primary">
                {today.term}
              </h2>
              <p className="type-body-sm text-body">{today.short}</p>
              <ArrowLink asChild className="type-label-sm">
                <Link href={`/knowledge/glossary/${today.slug}`}>Read the full entry</Link>
              </ArrowLink>
            </section>
          ) : null}
          {popular.length ? (
            <section aria-labelledby="popular" className="flex flex-col gap-3 rounded-card border border-default p-5">
              <h2 id="popular" className="type-h4 text-primary">
                Most searched
              </h2>
              <ul className="flex flex-wrap gap-2">
                {popular.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/knowledge/glossary/${t.slug}`}
                      className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control px-2.75 type-label text-primary hover:border-focus"
                    >
                      {t.term}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section aria-labelledby="missing" className="flex flex-col gap-2 rounded-card border border-default p-5">
            <h2 id="missing" className="type-h4 text-primary">
              Missing a term?
            </h2>
            <p className="type-body-sm text-body">Tell us and our editors will add it, usually within a week.</p>
            <Link
              href="/contact?about=glossary"
              className={cx(buttonClasses({ variant: "outline", size: "sm" }), "self-start")}
            >
              Suggest a term
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
