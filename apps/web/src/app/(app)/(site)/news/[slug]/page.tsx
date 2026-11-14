import { parseServerEnv } from "@h2india/config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/news/article";
import { getArticle, getSections } from "@/news/data";
import { NewsListing, type ListingParams } from "@/news/listing";

// /news/<name> (step 5.3, A56): a news section (430:1952), "latest", "press-releases", or an article (434:2844). The CMS
// refuses an article slug that is a section's, so the two never clash.

type Params = Promise<{ slug: string }>;

const LATEST = { title: "Latest", description: "Every story from the newsroom, newest first. Times in IST." };
const PRESS = {
  title: "Press releases",
  description: "Supplied by companies and published as received. Not edited or verified by H2 India.",
};

async function resolve(slug: string) {
  if (slug === "latest") return { kind: "listing" as const, ...LATEST, filter: { notTypes: ["press_release"] } };
  if (slug === "press-releases") return { kind: "listing" as const, ...PRESS, filter: { types: ["press_release"] } };
  const section = (await getSections()).find((s) => s.slug === slug);
  if (section) {
    return {
      kind: "listing" as const,
      title: section.name,
      description: section.description,
      filter: { topic: section.slug, notTypes: ["press_release"] },
    };
  }
  const article = await getArticle(slug);
  return article ? { kind: "article" as const, article } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const found = await resolve(slug);
  if (!found) return { title: "Not found · H2 India" };
  if (found.kind === "listing") {
    return {
      title: `${found.title} · News · H2 India`,
      description: found.description ?? undefined,
      alternates: { canonical: `/news/${slug}` },
    };
  }
  const a = found.article;
  return {
    title: `${a.seo?.title ?? a.title} · H2 India`,
    description: a.seo?.description ?? a.dek,
    alternates: { canonical: `/news/${a.slug}` },
    openGraph: { type: "article", title: a.title, description: a.dek, publishedTime: a.publishedAt ?? undefined },
  };
}

export default async function NewsSlugPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<ListingParams>;
}) {
  const { slug } = await params;
  const found = await resolve(slug);
  if (!found) notFound();
  if (found.kind === "article") return <ArticlePage a={found.article} appUrl={parseServerEnv().APP_URL} />;
  return (
    <NewsListing
      slug={slug}
      title={found.title}
      description={found.description}
      filter={found.filter}
      params={await searchParams}
    />
  );
}
