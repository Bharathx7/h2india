import { sitemapIndex } from "@/seo/sitemaps";

// /sitemap.xml: the sitemap index (step 5.10). The page /sitemap is the HTML sitemap for people.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(sitemapIndex(), {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
