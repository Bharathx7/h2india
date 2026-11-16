import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { buttonClasses, cx, Icon } from "@h2india/ui";
import { NEWSLETTER_LISTS } from "@/cms/newsletter/issues";
import { issueDay, issue, issues } from "@/newsletter/data";
import { NewsBand } from "@/news/client";
import { Crumbs, wrap } from "@/opportunities/parts";
import { ShareButton } from "@/news/client";

// An issue of H2 Economy Weekly (446:6106, phone 447:6734): eyebrow, title, Subscribe and share, read time, the numbered
// sections, Manage preferences · Unsubscribe · Report a correction, and the previous and next issue.

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const i = await issue((await params).slug);
  if (!i) return { title: "Issue not found · H2 Economy" };
  return {
    title: `${i.title} · H2 Economy Weekly #${String(i.number)}`,
    description: (i.highlights ?? []).map((h) => h.text).join(". "),
    alternates: { canonical: `/newsletter/issues/${i.slug}` },
  };
}

export default async function IssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const i = await issue((await params).slug);
  if (!i) notFound();
  const list = NEWSLETTER_LISTS.find((l) => l.value === i.list)?.label ?? "H2 Economy Weekly";
  const siblings = await issues(i.list);
  const at = siblings.findIndex((x) => x.id === i.id);
  const previous = at >= 0 ? siblings[at + 1] : undefined;
  const next = at > 0 ? siblings[at - 1] : undefined;
  return (
    <main id="main" className="min-h-screen bg-page [&_:is(h1,h2,h3)]:text-wrap">
      <article className={cx(wrap, "flex max-w-180 flex-col gap-6 pt-6 pb-12 md:pt-8")}>
        <Crumbs
          items={[{ label: "Newsletters", href: "/newsletter" }, { label: `${list} · Issue ${String(i.number)}` }]}
        />
        <header className="flex flex-col gap-3">
          <p className="type-eyebrow text-secondary">
            {list} · Issue {i.number} · {issueDay(i.sentOn)}
          </p>
          <h1 className="type-h1 text-primary">{i.title}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/newsletter" className={buttonClasses({ size: "sm" })}>
              Subscribe
            </Link>
            <ShareButton title={i.title} />
            <span className="type-caption text-secondary">{i.readMinutes ?? 6} min read</span>
          </div>
        </header>
        {(i.sections ?? []).map((s, n) => (
          <section key={s.id ?? s.heading} aria-labelledby={`s${String(n)}`} className="flex flex-col gap-3">
            <h2 id={`s${String(n)}`} className="type-h3 text-primary">
              {n + 1}. {s.heading}
            </h2>
            {s.body ? (
              <RichText
                data={s.body}
                className="flex flex-col gap-3 type-body text-body [&_a]:text-link [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5"
              />
            ) : null}
          </section>
        ))}
        <footer className="flex flex-col gap-4 border-t border-default pt-6">
          <p className="flex flex-wrap gap-2 type-caption text-link">
            <Link href="/newsletter" className="underline">
              Manage preferences
            </Link>
            ·<span className="text-secondary">Unsubscribe from the link in your email</span>·
            <Link href={`/legal/corrections/suggest?page=/newsletter/issues/${i.slug}`} className="underline">
              Report a correction
            </Link>
          </p>
          <nav aria-label="Other issues" className="flex justify-between gap-4">
            {previous ? (
              <Link href={`/newsletter/issues/${previous.slug}`} className="flex flex-col">
                <span className="type-eyebrow text-secondary">← Previous issue</span>
                <span className="type-label-sm text-link">
                  Issue {previous.number} · {previous.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`/newsletter/issues/${next.slug}`} className="flex flex-col text-right">
                <span className="type-eyebrow text-secondary">Next issue →</span>
                <span className="type-label-sm text-link">
                  Issue {next.number} · {next.title}
                </span>
              </Link>
            ) : (
              <span className="flex items-center gap-1 type-caption text-secondary">
                <Icon name="calendar" size={14} /> Next issue next Monday, 08:00 IST
              </span>
            )}
          </nav>
        </footer>
      </article>
      <NewsBand />
    </main>
  );
}
