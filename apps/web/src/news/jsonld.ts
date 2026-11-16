import type { Article, Author, Topic } from "../payload-types";

// NewsArticle structured data for an article page (playbook step 5.3). Pure: tested on its own.

const objects = <T extends object>(rel: unknown): T[] =>
  Array.isArray(rel) ? rel.filter((r): r is T => Boolean(r) && typeof r === "object") : [];

/** NewsArticle structured data (playbook step 5.3). */
export function structuredData(a: Article, url: string) {
  const authors = objects<Author>(a.authors);
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.title,
    description: a.dek,
    datePublished: a.publishedAt ?? a.createdAt,
    dateModified: a.updatedAt,
    mainEntityOfPage: url,
    url,
    articleSection: objects<Topic>(a.topics).find((t) => typeof t.order === "number")?.name,
    author:
      a.type === "press_release" && a.issuer
        ? [{ "@type": "Organization", name: a.issuer }]
        : authors.map((x) => ({
            "@type": x.kind === "organisation" ? "Organization" : "Person",
            name: x.name,
            url: new URL(`/authors/${x.slug}`, url).toString(),
          })),
    publisher: { "@type": "Organization", name: "H2 Economy" },
    ...(a.type === "sponsored" && a.sponsor?.name
      ? { sponsor: { "@type": "Organization", name: a.sponsor.name } }
      : {}),
  };
}
