import { cx } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/article/ArticleBody";
import { articlesMentioning, getTerm } from "@/knowledge/data";
import { dayMonthYear } from "@/news/format";
import { ShareButton } from "@/news/client";
import { Crumbs, wrap } from "@/opportunities/parts";
import type { Glossary, Standard } from "@/payload-types";

// A glossary term (735:3810; phones 745:7231, step 5.6): definition, plain language, how it's worked out, related
// terms and standards, and stories that mention it. "Related products" joins with the marketplace (Stage 6).

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = await getTerm((await params).slug);
  if (!t) return { title: "Not found · H2 India" };
  return {
    title: `${t.term}${t.expansion ? ` (${t.expansion})` : ""} · Hydrogen glossary · H2 India`,
    description: t.short,
    alternates: { canonical: `/knowledge/glossary/${t.slug}` },
  };
}
export const dynamic = "force-dynamic";

export default async function TermPage({ params }: { params: Params }) {
  const t = await getTerm((await params).slug);
  if (!t) notFound();
  const related = (t.related ?? []).filter((x): x is Glossary => typeof x === "object" && x._status === "published");
  const standards = (t.standards ?? []).filter(
    (x): x is Standard => typeof x === "object" && x._status === "published",
  );
  const stories = await articlesMentioning([t.term, ...(t.aliases ?? [])]);
  const title = t.expansion ? `${t.term} (${t.expansion.charAt(0).toLowerCase()}${t.expansion.slice(1)})` : t.term;
  const subtitle = [t.category, (t.aliases ?? []).length ? `also written as ${(t.aliases ?? []).join(", ")}` : null]
    .filter(Boolean)
    .join(" · ");
  const hasBody = Boolean((t.body as { root?: { children?: unknown[] } } | null | undefined)?.root?.children?.length);

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs
          items={[
            { label: "Knowledge", href: "/knowledge" },
            { label: "Glossary", href: "/knowledge/glossary" },
            { label: t.term },
          ]}
        />
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="type-h1 text-primary">{title}</h1>
            {subtitle ? <p className="type-body text-body">{subtitle}</p> : null}
          </div>
          <ShareButton title={title} />
        </div>
      </div>
      <div className={cx(wrap, "flex flex-col gap-6 pb-16 pt-6 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 max-w-180 flex-1 flex-col gap-4">
          <section aria-label="Definition" className="flex flex-col gap-1 rounded-card bg-mint p-5">
            <p className="type-eyebrow text-secondary">DEFINITION</p>
            <p className="type-h4 text-primary">{t.short}</p>
          </section>
          {hasBody && t.body ? (
            <section aria-labelledby="plain" className="flex flex-col gap-2 rounded-card border border-default p-5">
              <h2 id="plain" className="type-h4 text-primary">
                In plain language
              </h2>
              <div className="[&_*]:type-body">
                <ArticleBody data={t.body} />
              </div>
            </section>
          ) : null}
          {t.formula ? (
            <section aria-labelledby="formula" className="flex flex-col gap-2 rounded-card border border-default p-5">
              <h2 id="formula" className="type-h4 text-primary">
                How it&apos;s worked out
              </h2>
              <pre className="overflow-x-auto rounded-control bg-subtle p-3 type-spec whitespace-pre-wrap text-primary">
                {t.formula}
              </pre>
              {t.formulaNote ? <p className="type-caption text-secondary">{t.formulaNote}</p> : null}
            </section>
          ) : null}
          {related.length || standards.length ? (
            <section aria-labelledby="related" className="flex flex-col gap-3 rounded-card border border-default p-5">
              <h2 id="related" className="type-h4 text-primary">
                Related terms
              </h2>
              <ul className="flex flex-wrap gap-2">
                {related.map((r) => (
                  <li key={`g${String(r.id)}`}>
                    <Link
                      href={`/knowledge/glossary/${r.slug}`}
                      className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control px-2.75 type-label text-primary hover:border-focus"
                    >
                      {r.term}
                    </Link>
                  </li>
                ))}
                {standards.map((s) => (
                  <li key={`s${String(s.id)}`}>
                    <Link
                      href={`/knowledge/standards/${s.slug}`}
                      className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control px-2.75 type-label text-primary hover:border-focus"
                    >
                      {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          {stories.length ? (
            <section aria-labelledby="more" className="flex flex-col gap-3 rounded-card border border-default p-5">
              <h2 id="more" className="type-h4 text-primary">
                Read more
              </h2>
              <ul className="flex flex-col">
                {stories.map((a) => (
                  <li key={a.id} className="border-t border-default py-2.5">
                    <Link href={`/news/${a.slug}`} className="type-label text-link hover:underline">
                      {a.title}
                    </Link>
                    {a.publishedAt ? (
                      <p className="type-caption text-secondary">{dayMonthYear(a.publishedAt)}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <p className="type-caption text-secondary">
            Spotted an error?{" "}
            <Link href={`/contact?about=${encodeURIComponent(`glossary:${t.slug}`)}`} className="text-link underline">
              Suggest a correction
            </Link>
          </p>
        </aside>
      </div>
    </main>
  );
}
