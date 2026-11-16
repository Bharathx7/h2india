import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cx, Icon } from "@h2india/ui";
import type { HelpArticle } from "@/payload-types";
import { helpArticle } from "@/trust/data";
import { categoryLabel } from "@/trust/help";
import { HelpFeedback } from "@/trust/HelpFeedback";
import { main, PageHead, wrap } from "@/trust/parts";
import { istDay } from "@/trust/views";
import { slugify } from "@/cms/slug";

// A help article (278:23978): updated date and read time, On this page, numbered steps that count on across
// sections, the grey callout, Was this helpful? and Related.

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await helpArticle((await params).slug);
  if (!a) return { title: "Help article not found · H2 Economy" };
  return {
    title: `${a.title} · Help centre · H2 Economy`,
    description: a.intro.slice(0, 160),
    alternates: { canonical: `/help/${a.slug}` },
  };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = await helpArticle((await params).slug);
  if (!a) notFound();
  const sections = a.sections ?? [];
  const anchors = [
    ...sections.map((s) => ({ id: slugify(s.heading), label: s.heading })),
    ...(a.callout?.title ? [{ id: slugify(a.callout.title), label: a.callout.title }] : []),
  ];
  // Steps count on across sections (1, 2, 3 under Invite; 4 under Change), so number them before rendering.
  const starts = sections.reduce<number[]>(
    (acc, s, i) => [...acc, (acc[i - 1] ?? 0) + (i ? (sections[i - 1]?.steps?.length ?? 0) : 0)],
    [],
  );
  const related = (a.related ?? []).filter((r): r is HelpArticle => typeof r === "object");
  return (
    <main id="main" className={main}>
      <div className="mx-auto max-w-180">
        <PageHead
          crumbs={[{ label: "Help centre", href: "/help" }, { label: categoryLabel(a.category) }]}
          title={a.title}
        />
        <div className={cx(wrap, "flex flex-col gap-6 pt-2")}>
          <p className="type-caption text-secondary">
            Updated {istDay(a.updatedAt)} · {a.readMinutes ?? 2} min read
          </p>
          <p className="type-body-lg text-body">{a.intro}</p>
          {anchors.length > 1 ? (
            <nav aria-labelledby="on-page" className="flex flex-col gap-1.5 rounded-card border border-default p-4">
              <p id="on-page" className="type-eyebrow text-secondary">
                On this page
              </p>
              {anchors.map((x) => (
                <a key={x.id} href={`#${x.id}`} className="inline-flex items-center gap-1 type-label-sm text-link">
                  {x.label} <Icon name="arrow-right" size={14} />
                </a>
              ))}
            </nav>
          ) : null}
          {sections.map((s, si) => (
            <section key={s.heading} aria-labelledby={slugify(s.heading)} className="flex flex-col gap-3">
              <h2 id={slugify(s.heading)} className="scroll-mt-24 type-h4 text-primary">
                {s.heading}
              </h2>
              {s.steps?.length ? (
                <ol className="flex flex-col gap-3">
                  {s.steps.map((step, k) => {
                    const n = (starts[si] ?? 0) + k + 1;
                    return (
                      <li key={step.id ?? step.text} value={n} className="flex items-start gap-3 type-body text-body">
                        <span
                          aria-hidden="true"
                          className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-mint type-label-sm text-primary"
                        >
                          {n}
                        </span>
                        {step.text}
                      </li>
                    );
                  })}
                </ol>
              ) : null}
              {s.text ? <p className="type-body text-body">{s.text}</p> : null}
            </section>
          ))}
          {a.callout?.title ? (
            <section
              aria-labelledby={slugify(a.callout.title)}
              className="flex flex-col gap-1 rounded-card bg-subtle p-4"
            >
              <h2 id={slugify(a.callout.title)} className="scroll-mt-24 type-label text-primary">
                {a.callout.title}
              </h2>
              {a.callout.text ? <p className="type-body-sm text-body">{a.callout.text}</p> : null}
            </section>
          ) : null}
          <HelpFeedback />
          {related.length ? (
            <section aria-labelledby="related" className="flex flex-col gap-2">
              <h2 id="related" className="type-h4 text-primary">
                Related
              </h2>
              {related.map((r) => (
                <Link key={r.id} href={`/help/${r.slug}`} className="type-label-sm text-link hover:underline">
                  {r.title}
                </Link>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
