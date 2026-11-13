import config from "@payload-config";
import { cx, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { ArticleBody } from "@/components/article/ArticleBody";
import { glossaryTerms } from "@/cms/knowledge/library";
import { allChapters, getChapter } from "@/knowledge/data";
import { Quiz } from "@/knowledge/Quiz";
import { Crumbs, wrap } from "@/opportunities/parts";
import { getSession } from "@/server/auth";
import { ChapterTracker } from "@/knowledge/ChapterTracker";
import { getDb } from "@h2india/core";
import { learningProgress } from "@h2india/core/members";
import type { Glossary } from "@/payload-types";

// A Hydrogen 101 chapter (471:1876; phones 473:3145, step 5.6): the course outline, the chapter, its key terms, the
// quiz and previous and next. A signed-in member's progress is saved (step 7.5): "4 of 10 chapters done", ticks in
// the outline, Mark chapter as done; signed-out readers are invited to sign in to keep it.

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const c = await getChapter((await params).slug);
  if (!c) return { title: "Not found · H2 India" };
  return {
    title: `${c.title} · Hydrogen 101 · H2 India`,
    description: c.summary,
    alternates: { canonical: `/knowledge/hydrogen-101/${c.slug}` },
  };
}
export const dynamic = "force-dynamic";

export default async function ChapterPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [chapter, chapters, session] = await Promise.all([
    getChapter(slug),
    allChapters(),
    getSession().catch(() => null),
  ]);
  if (!chapter) notFound();
  const viewer = Boolean(session);
  const progress = session ? await learningProgress(getDb(), session.user.id) : [];
  const doneIds = new Set(progress.filter((p) => p.status === "done").map((p) => p.chapterId));
  const doneCount = chapters.filter((c) => doneIds.has(String(c.id))).length;
  const glossary = await glossaryTerms(await getPayload({ config }));
  const at = chapters.findIndex((c) => c.id === chapter.id);
  const previous = at > 0 ? chapters[at - 1] : undefined;
  const next = at >= 0 ? chapters[at + 1] : undefined;
  const terms = (chapter.keyTerms ?? []).filter((t): t is Glossary => typeof t === "object");
  const hero = typeof chapter.heroImage === "object" && chapter.heroImage ? chapter.heroImage : null;
  const quiz = (chapter.quiz ?? []).map((q) => ({
    question: q.question,
    options: (q.options ?? []).map((o) => o.option),
    answer: q.answer,
    explanation: q.explanation,
  }));

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "pt-6 md:pt-8")}>
        <Crumbs
          items={[
            { label: "Knowledge", href: "/knowledge" },
            { label: "Hydrogen 101", href: "/knowledge/hydrogen-101" },
            { label: `Chapter ${String(chapter.order)}` },
          ]}
        />
      </div>
      <div className={cx(wrap, "flex flex-col gap-8 pb-16 pt-6 lg:flex-row lg:items-start lg:gap-10")}>
        <nav
          aria-label="Hydrogen 101 chapters"
          className="rounded-card border border-default p-4 lg:sticky lg:top-24 lg:w-64 lg:shrink-0"
        >
          <p className="type-h4 text-primary">Hydrogen 101</p>
          {viewer ? (
            <div className="flex flex-col gap-1.5 pt-2">
              <div
                role="progressbar"
                aria-label="Chapters done"
                aria-valuemin={0}
                aria-valuemax={chapters.length}
                aria-valuenow={doneCount}
                className="h-1.5 overflow-hidden rounded-pill bg-subtle"
              >
                <div
                  className="h-full rounded-pill bg-accent"
                  style={{ width: `${String(chapters.length ? (doneCount / chapters.length) * 100 : 0)}%` }}
                />
              </div>
              <p className="type-caption text-secondary">
                {doneCount} of {chapters.length} chapters done
              </p>
            </div>
          ) : (
            <p className="pt-1 type-caption text-secondary">
              <Link href={`/sign-in?next=/knowledge/hydrogen-101/${chapter.slug}`} className="text-link underline">
                Sign in
              </Link>{" "}
              to save your progress
            </p>
          )}
          <ol className="mt-3 flex flex-col gap-0.5">
            {chapters.map((c) => {
              const on = c.id === chapter.id;
              return (
                <li key={c.id}>
                  <Link
                    href={`/knowledge/hydrogen-101/${c.slug}`}
                    aria-current={on ? "page" : undefined}
                    className={cx(
                      "flex gap-2 rounded-control px-2 py-1.5 type-body-sm",
                      on ? "bg-mint type-label text-primary" : "text-body hover:bg-subtle",
                    )}
                  >
                    {doneIds.has(String(c.id)) ? (
                      <span className="flex w-5 shrink-0 text-success">
                        <Icon name="check-circle" size={16} />
                        <span className="sr-only">Done: </span>
                      </span>
                    ) : (
                      <span className="w-5 shrink-0 type-spec text-secondary">{String(c.order).padStart(2, "0")}</span>
                    )}
                    {c.title.split(":")[0]}
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        <article className="flex min-w-0 max-w-180 flex-1 flex-col gap-6">
          <header className="flex flex-col gap-3">
            <p className="type-eyebrow text-secondary">
              CHAPTER {chapter.order} OF {chapters.length}
              {chapter.readingMinutes ? ` · ${String(chapter.readingMinutes)} MIN READ` : ""}
            </p>
            <h1 className="type-h1 text-primary">{chapter.title}</h1>
            <p className="type-body-lg text-body">{chapter.summary}</p>
          </header>
          {hero?.url ? (
            <figure className="flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- CMS media, sized by the editor */}
              <img src={hero.url} alt={hero.alt} className="w-full rounded-card" />
              {chapter.heroCaption ? (
                <figcaption className="type-caption text-secondary">{chapter.heroCaption}</figcaption>
              ) : null}
            </figure>
          ) : null}
          <ArticleBody data={chapter.body} glossary={glossary} />
          {terms.length ? (
            <section aria-labelledby="terms" className="flex flex-col gap-2">
              <h2 id="terms" className="type-eyebrow text-secondary">
                KEY TERMS IN THIS CHAPTER
              </h2>
              <ul className="flex flex-wrap gap-2">
                {terms.map((t) => (
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
          {quiz.length ? <Quiz questions={quiz} chapter={viewer ? chapter.slug : undefined} /> : null}
          {viewer ? <ChapterTracker slug={chapter.slug} done={doneIds.has(String(chapter.id))} /> : null}
          <nav aria-label="Previous and next chapter" className="grid gap-3 sm:grid-cols-2">
            {previous ? (
              <Link
                href={`/knowledge/hydrogen-101/${previous.slug}`}
                className="flex flex-col gap-1 rounded-card border border-default p-4 hover:border-focus"
              >
                <span className="type-eyebrow text-secondary">← PREVIOUS</span>
                <span className="type-label text-link">
                  Chapter {previous.order}: {previous.title.split(":")[0]}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/knowledge/hydrogen-101/${next.slug}`}
                className="flex flex-col items-end gap-1 rounded-card border border-default p-4 text-right hover:border-focus"
              >
                <span className="type-eyebrow text-secondary">NEXT CHAPTER →</span>
                <span className="type-label text-link">
                  Chapter {next.order}: {next.title.split(":")[0]}
                </span>
              </Link>
            ) : (
              <Link
                href="/knowledge"
                className="flex items-center justify-end gap-2 rounded-card border border-default p-4 type-label text-link hover:border-focus"
              >
                Back to Knowledge <Icon name="arrow-right" size={16} />
              </Link>
            )}
          </nav>
        </article>
      </div>
    </main>
  );
}
