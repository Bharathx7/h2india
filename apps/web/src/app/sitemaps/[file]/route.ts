import { newsSitemap, sitemapEntries, urlset } from "@/seo/sitemaps";

// /sitemaps/<type>.xml (pages, news, knowledge, opportunities, events, tracker, help, newsletter) and
// /sitemaps/google-news.xml, step 5.10.
export const dynamic = "force-dynamic";

const xml = (body: string) =>
  new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  });

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const file = (await params).file;
  const type = file.replace(/\.xml$/, "");
  if (!file.endsWith(".xml")) return new Response("Not found", { status: 404 });
  if (type === "google-news") return xml(await newsSitemap());
  const entries = await sitemapEntries(type);
  if (!entries) return new Response("Not found", { status: 404 });
  return xml(urlset(entries));
}
