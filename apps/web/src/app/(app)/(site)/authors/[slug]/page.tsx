import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthor, listArticles } from "@/news/data";
import { AuthorPage } from "@/news/taxonomy";

// /authors/<slug> (444:5431; contributor 444:5946, step 5.3). An author page exists only while readers can see one of
// their stories, so sample bylines never appear where sample content is hidden.

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const author = await getAuthor((await params).slug);
  if (!author) return { title: "Not found · H2 India" };
  return {
    title: `${author.name} · H2 India`,
    description: author.bio ?? undefined,
    alternates: { canonical: `/authors/${author.slug}` },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ page?: string }>;
}) {
  const author = await getAuthor((await params).slug);
  if (!author || !(await listArticles({ author: author.slug, limit: 1 })).total) notFound();
  return <AuthorPage author={author} page={Math.max(1, Math.floor(Number((await searchParams).page)) || 1)} />;
}
