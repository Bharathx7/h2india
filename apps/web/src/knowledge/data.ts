import config from "@payload-config";
import { getPayload, type Where } from "payload";
import { publicWhere } from "@/cms/sample";
import type { Article, Chapter, Glossary, Guide, Podcast, Report, Standard, Video } from "@/payload-types";

// The knowledge library's public reads (step 5.6): only published records, and samples only where shown (A37).
// Lists are small (tens to a few hundred), so pages filter them in memory.

const payload = () => getPayload({ config });
const and = (...parts: Where[]): Where => ({ and: [publicWhere(), ...parts] });

async function all<T>(collection: string, sort: string, depth = 0): Promise<T[]> {
  const res = await (
    await payload()
  ).find({ collection: collection as "chapters", where: publicWhere(), sort, limit: 1000, depth, pagination: false });
  return res.docs as unknown as T[];
}

async function one<T>(collection: string, slug: string, depth = 1): Promise<T | null> {
  const res = await (
    await payload()
  ).find({ collection: collection as "chapters", where: and({ slug: { equals: slug } }), limit: 1, depth });
  return (res.docs[0] as unknown as T | undefined) ?? null;
}

export const allChapters = () => all<Chapter>("chapters", "order");
export const getChapter = (slug: string) => one<Chapter>("chapters", slug);
export const allGuides = () => all<Guide>("guides", "-updatedAt", 1);
export const getGuideRecord = (slug: string) => one<Guide>("guides", slug, 2);
export const allTerms = () => all<Glossary>("glossary", "term");
export const getTerm = (slug: string) => one<Glossary>("glossary", slug);
export const allStandards = () => all<Standard>("standards", "-dated");
export const getStandard = (slug: string) => one<Standard>("standards", slug);
export const allReports = () => all<Report>("reports", "-publishedOn", 1);
export const getReport = (slug: string) => one<Report>("reports", slug);
export const allVideos = () => all<Video>("videos", "-publishedOn", 1);
export const getVideo = (slug: string) => one<Video>("videos", slug);
export const allPodcasts = () => all<Podcast>("podcasts", "-publishedOn");
export const getPodcast = (slug: string) => one<Podcast>("podcasts", slug);

/** Stories that mention a term in the title or standfirst ("Read more", 735:3810), newest first. */
export async function articlesMentioning(words: string[], limit = 3): Promise<Article[]> {
  const terms = words.map((w) => w.trim()).filter((w) => w.length >= 3);
  if (!terms.length) return [];
  const res = await (
    await payload()
  ).find({
    collection: "articles",
    where: and({
      or: terms.flatMap((w): Where[] => [{ title: { like: w } }, { dek: { like: w } }]),
    }),
    sort: "-publishedAt",
    limit,
    depth: 0,
  });
  return res.docs;
}

/** The term shown as "Term of the day": the same for everyone on a given India day, cycling through the glossary. */
export function termOfTheDay<T>(terms: T[], now = new Date()): T | null {
  if (!terms.length) return null;
  const day = Math.floor((now.getTime() + 5.5 * 3_600_000) / 86_400_000);
  return terms[day % terms.length] ?? null;
}
