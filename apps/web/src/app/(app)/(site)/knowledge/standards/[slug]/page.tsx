import { Alert, buttonClasses, cx, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/article/ArticleBody";
import { getStandard } from "@/knowledge/data";
import { dayMonthYear } from "@/news/format";
import { Crumbs, host, wrap } from "@/opportunities/parts";
import type { Standard } from "@/payload-types";

// A standard or regulation (735:4587, step 5.6): our summary, its scope, the products it applies to and its details,
// with the official text one click away. "This is our summary, not the official text."

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const s = await getStandard((await params).slug);
  if (!s) return { title: "Not found · H2 India" };
  return {
    title: `${s.title} · Standards library · H2 India`,
    description: s.summary,
    alternates: { canonical: `/knowledge/standards/${s.slug}` },
  };
}
export const dynamic = "force-dynamic";

export default async function StandardPage({ params }: { params: Params }) {
  const s = await getStandard((await params).slug);
  if (!s) notFound();
  const related = (s.related ?? []).filter((x): x is Standard => typeof x === "object" && x._status === "published");
  const hasBody = Boolean((s.body as { root?: { children?: unknown[] } } | null | undefined)?.root?.children?.length);
  const subtitle = [
    s.kind,
    s.issuer,
    [s.documentType, s.dated ? `dated ${dayMonthYear(s.dated)}` : null].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(" · ");
  const details = [
    { label: "Issuing body", value: s.issuer },
    { label: "Type", value: [s.kind, s.documentType ? `(${s.documentType})` : null].filter(Boolean).join(" ") },
    ...(s.code !== s.title ? [{ label: "Number", value: s.code }] : []),
    ...(s.dated ? [{ label: "Dated", value: dayMonthYear(s.dated) }] : []),
    { label: "Status", value: s.inForce ?? "In force" },
  ];

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs
          items={[
            { label: "Knowledge", href: "/knowledge" },
            { label: "Standards and regulations", href: "/knowledge/standards" },
            { label: s.title },
          ]}
        />
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="type-h1 text-primary">{s.title}</h1>
            <p className="type-body text-body">{subtitle}</p>
          </div>
          <a
            href={s.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "primary" })}
          >
            <Icon name="external-link" size={18} />
            Open on {host(s.sourceUrl)}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
      <div className={cx(wrap, "flex flex-col gap-6 pb-16 pt-6 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 max-w-180 flex-1 flex-col gap-4">
          <Alert tone="success" title="This is our summary, not the official text">
            Always read the {s.kind.toLowerCase()} on the issuer&apos;s website before relying on it.
          </Alert>
          <section aria-labelledby="summary" className="flex flex-col gap-2 rounded-card border border-default p-5">
            <h2 id="summary" className="type-h4 text-primary">
              Summary
            </h2>
            <p className="type-body text-body">{s.summary}</p>
            {hasBody && s.body ? <ArticleBody data={s.body} /> : null}
          </section>
          {(s.scope ?? []).length ? (
            <section aria-labelledby="scope" className="flex flex-col gap-3 rounded-card border border-default p-5">
              <h2 id="scope" className="type-h4 text-primary">
                Scope and who it affects
              </h2>
              <ul className="flex flex-col gap-2.5">
                {(s.scope ?? []).map((p) => (
                  <li key={p.id ?? p.point} className="flex items-start gap-2.5 type-body-sm text-body">
                    <Icon name="check" size={16} className="mt-0.5 shrink-0 text-icon-primary" />
                    {p.point}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {(s.appliesTo ?? []).length ? (
            <section aria-labelledby="products" className="flex flex-col gap-2 rounded-card border border-default p-5">
              <h2 id="products" className="type-h4 text-primary">
                Applicable products
              </h2>
              <p className="type-caption text-secondary">
                Listings where buyers may ask for evidence under this {s.kind.toLowerCase()}.
              </p>
              <ul className="flex flex-wrap gap-2">
                {(s.appliesTo ?? []).map((a) => (
                  <li
                    key={a}
                    className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control px-2.75 type-label text-primary"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          <section aria-labelledby="details" className="flex flex-col gap-2 rounded-card border border-default p-5">
            <h2 id="details" className="type-h4 text-primary">
              Record details
            </h2>
            <dl className="flex flex-col">
              {details.map((d) => (
                <div key={d.label} className="flex flex-col gap-0.5 border-t border-default py-2.5">
                  <dt className="type-caption text-secondary">{d.label}</dt>
                  <dd className="type-body-sm text-primary">{d.value}</dd>
                </div>
              ))}
              <div className="flex flex-col gap-0.5 border-t border-default py-2.5">
                <dt className="type-caption text-secondary">Official source</dt>
                <dd className="type-body-sm">
                  <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                    {host(s.sourceUrl)}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 border-t border-default py-2.5">
                <dt className="type-caption text-secondary">Last checked by H2 India</dt>
                <dd className="type-body-sm text-primary">{dayMonthYear(s.checkedAt ?? s.updatedAt)}</dd>
              </div>
            </dl>
          </section>
          {related.length ? (
            <section aria-labelledby="related" className="flex flex-col gap-2 rounded-card border border-default p-5">
              <h2 id="related" className="type-h4 text-primary">
                Related records
              </h2>
              <ul className="flex flex-col">
                {related.map((r) => (
                  <li key={r.id} className="border-t border-default py-2.5">
                    <Link href={`/knowledge/standards/${r.slug}`} className="type-label text-link hover:underline">
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
