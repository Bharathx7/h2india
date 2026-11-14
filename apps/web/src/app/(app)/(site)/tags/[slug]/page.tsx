import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTag, listArticles } from "@/news/data";
import { TagPage } from "@/news/taxonomy";

// /tags/<slug> (443:4989, step 5.3): the stories with one tag.

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const tag = await getTag((await params).slug);
  if (!tag) return { title: "Not found · H2 India" };
  return { title: `${tag.name} · H2 India`, alternates: { canonical: `/tags/${tag.slug}` } };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ page?: string }>;
}) {
  const tag = await getTag((await params).slug);
  if (!tag || !(await listArticles({ tag: tag.slug, limit: 1 })).total) notFound();
  return <TagPage tag={tag} page={Math.max(1, Math.floor(Number((await searchParams).page)) || 1)} />;
}
