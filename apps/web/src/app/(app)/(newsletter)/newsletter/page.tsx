import type { Metadata } from "next";
import Link from "next/link";
import { cx, EmptyState, Icon } from "@h2india/ui";
import { IN_EVERY_ISSUE, NEWSLETTER_LISTS } from "@/cms/newsletter/issues";
import { issueDay, issues } from "@/newsletter/data";
import { ArchiveSignup } from "@/newsletter/forms";
import { Crumbs, wrap } from "@/opportunities/parts";

// Newsletters archive (445:5885, phone 447:6556): India H₂ Weekly and Tender Alert digest tabs, past issues newest
// first (ten at a time, then Show older issues), the sign-up box and In every issue.

export const metadata: Metadata = {
  title: "Newsletters · H2 India",
  description: "Indian hydrogen news, tenders and schemes in your inbox. Read past issues of India H₂ Weekly.",
  alternates: { canonical: "/newsletter" },
};
export const dynamic = "force-dynamic";

const PAGE = 10;

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string; show?: string }>;
}) {
  const sp = await searchParams;
  const list = NEWSLETTER_LISTS.some((l) => l.value === sp.list) ? (sp.list ?? "weekly") : "weekly";
  const all = await issues(list);
  const shown = all.slice(0, Math.max(PAGE, Number(sp.show) || PAGE));
  return (
    <main id="main" className="min-h-screen bg-page pb-16 [&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs items={[{ label: "News", href: "/news" }, { label: "Newsletters" }]} />
        <h1 className="mt-2 type-h1 text-primary">Newsletters</h1>
        <p className="type-body text-body">
          Indian hydrogen news, tenders and schemes in your inbox. Read past issues below.
        </p>
      </div>
      <nav aria-label="Newsletters" className="mt-6 border-b border-default">
        <div className={cx(wrap, "flex gap-6")}>
          {NEWSLETTER_LISTS.map((l) => (
            <Link
              key={l.value}
              href={l.value === "weekly" ? "/newsletter" : `/newsletter?list=${l.value}`}
              aria-current={l.value === list ? "page" : undefined}
              className={cx(
                "-mb-px border-b-2 py-3 type-label",
                l.value === list
                  ? "border-inverse text-primary"
                  : "border-transparent text-secondary hover:text-primary",
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
      <div className={cx(wrap, "flex flex-col gap-8 pt-8 lg:flex-row lg:items-start")}>
        <section aria-label="Past issues" className="min-w-0 flex-1">
          {shown.length ? (
            <ol className="flex flex-col border-t border-default">
              {shown.map((i) => (
                <li
                  key={i.id}
                  className="grid grid-cols-1 gap-3 border-b border-default py-6 md:grid-cols-[8rem_1fr_auto] md:gap-6"
                >
                  <div>
                    <p className="type-spec text-secondary">{issueDay(i.sentOn)}</p>
                    <p className="type-label text-primary">Issue {i.number}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h2 className="type-h4 text-primary">
                      <Link href={`/newsletter/issues/${i.slug}`} className="hover:underline">
                        {i.title}
                      </Link>
                    </h2>
                    <ul className="flex list-disc flex-col gap-1 pl-5 type-body-sm text-body">
                      {(i.highlights ?? []).map((h) => (
                        <li key={h.id ?? h.text}>{h.text}</li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    href={`/newsletter/issues/${i.slug}`}
                    className="inline-flex items-center gap-1 self-start type-label-sm text-link"
                  >
                    Read issue<span className="sr-only"> {i.number}</span> <Icon name="arrow-right" size={14} />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No issues yet">The first issue goes out on a Monday. Subscribe to get it.</EmptyState>
          )}
          {all.length > shown.length ? (
            <Link
              href={`/newsletter?${list === "weekly" ? "" : `list=${list}&`}show=${String(shown.length + PAGE)}`}
              scroll={false}
              className="mt-6 inline-flex h-10 items-center rounded-pill border border-control px-4 type-label text-primary hover:border-focus"
            >
              Show older issues
            </Link>
          ) : null}
        </section>
        <aside className="flex flex-col gap-4 lg:w-82 lg:shrink-0">
          <ArchiveSignup />
          <section aria-labelledby="every" className="flex flex-col gap-2 rounded-card border border-default p-5">
            <h2 id="every" className="type-h4 text-primary">
              In every issue
            </h2>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 type-body-sm text-body">
              {IN_EVERY_ISSUE.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}
