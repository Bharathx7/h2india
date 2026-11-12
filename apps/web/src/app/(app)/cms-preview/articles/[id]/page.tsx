import config from "@payload-config";
import { formatIstDateTime } from "@h2india/core/companies/client";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getPayload } from "payload";
import { ArticleBody } from "@/components/article/ArticleBody";
import { glossaryTerms } from "@/cms/knowledge/library";
import { typeBadge, ARTICLE_TYPES } from "@/cms/types";

// Preview of a draft for editors (step 4.1, "Preview" on 639:8). Only signed-in editors; the public article page with
// every header variant comes with the newsroom in step 5.3.
export const metadata: Metadata = { title: "Preview · H2 India CMS", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ArticlePreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) redirect(`/sign-in?next=/cms-preview/articles/${id}`);
  const article = await payload
    .findByID({ collection: "articles", id, draft: true, depth: 1, user, overrideAccess: false })
    .catch(() => null);
  if (!article) notFound();
  const badge = typeBadge(article.type);
  const typeLabel = ARTICLE_TYPES.find((t) => t.value === article.type)?.label ?? article.type;
  const authors = article.authors.map((a) => (typeof a === "object" ? a.name : "")).filter(Boolean);
  const sources = (article.sources ?? []).filter((s) => !s.internal);
  return (
    <main className="mx-auto flex max-w-180 flex-col gap-6 px-4 py-10">
      <p role="status" className="rounded-control bg-warning px-3 py-2 type-label-sm text-primary">
        Preview · {article._status === "published" ? "published" : "draft"} · saved{" "}
        {formatIstDateTime(new Date(article.updatedAt))}
      </p>
      <header className="flex flex-col gap-3">
        <p className="flex items-center gap-2 type-eyebrow text-secondary">
          {badge ? <span className="rounded-pill bg-subtle px-2 py-0.5 text-primary">{badge}</span> : typeLabel}
        </p>
        <h1 className="type-h1">{article.title}</h1>
        <p className="type-body-lg text-body">{article.dek}</p>
        <p className="type-body-sm text-secondary">
          {article.type === "press_release" && article.issuer
            ? `Issued by ${article.issuer}`
            : `By ${authors.join(", ")}`}
        </p>
        {article.type === "sponsored" && article.sponsor?.name ? (
          <p className="rounded-card bg-subtle p-3 type-body-sm text-body">
            Sponsored by {article.sponsor.name}. {article.sponsor.disclosure}
          </p>
        ) : null}
      </header>
      <ArticleBody data={article.body} glossary={await glossaryTerms(payload)} />
      {(article.corrections ?? []).length > 0 ? (
        <section aria-labelledby="corrections" className="border-t border-default pt-4">
          <h2 id="corrections" className="type-h4">
            Corrections
          </h2>
          <ul className="mt-2 flex flex-col gap-2 type-body-sm text-body">
            {(article.corrections ?? []).map((c) => (
              <li key={c.id ?? c.date}>
                <span className="type-label">{formatIstDateTime(new Date(c.date))}:</span> {c.note}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {sources.length > 0 ? (
        <section aria-labelledby="sources" className="border-t border-default pt-4">
          <h2 id="sources" className="type-h4">
            Sources
          </h2>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 type-body-sm text-body">
            {sources.map((s) => (
              <li key={s.id ?? s.title}>
                {s.url ? (
                  <a className="text-link underline" href={s.url} rel="noopener noreferrer">
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
                {s.note ? ` · ${s.note}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
