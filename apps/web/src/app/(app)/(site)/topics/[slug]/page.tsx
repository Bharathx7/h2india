import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTopic, listArticles } from "@/news/data";
import { TopicPage } from "@/news/taxonomy";

// /topics/<slug> (442:4049, step 5.3): everything on one topic. A topic with no story readers can see doesn't exist.

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const topic = await getTopic((await params).slug);
  if (!topic) return { title: "Not found · H2 Economy" };
  return {
    title: `${topic.name} · H2 Economy`,
    description: topic.description ?? undefined,
    alternates: { canonical: `/topics/${topic.slug}` },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ page?: string }>;
}) {
  const topic = await getTopic((await params).slug);
  if (!topic || !(await listArticles({ topic: topic.slug, limit: 1 })).total) notFound();
  return <TopicPage topic={topic} page={Math.max(1, Math.floor(Number((await searchParams).page)) || 1)} />;
}
