import config from "@payload-config";
import { getPayload, type Where } from "payload";
import { publicWhere } from "@/cms/sample";
import { LEGAL_PAGES } from "@/cms/trust/collections";
import { SUB_VIEWS } from "@/tracker/views";
import { absolute } from "./site";

// The XML sitemaps (step 5.10): an index at /sitemap.xml pointing to one sitemap per content type, and a Google
// News sitemap of articles from the last two days. Only what readers may see (published, no hidden samples).

export interface Entry {
  loc: string;
  lastmod?: string;
}

type Source = { collection: string; href: (slug: string) => string; where?: Where };

const COLLECTIONS: Record<string, Source[]> = {
  news: [{ collection: "articles", href: (s) => `/news/${s}` }],
  knowledge: [
    { collection: "chapters", href: (s) => `/knowledge/hydrogen-101/${s}` },
    { collection: "guides", href: (s) => `/knowledge/guides/${s}` },
    { collection: "glossary", href: (s) => `/knowledge/glossary/${s}` },
    { collection: "standards", href: (s) => `/knowledge/standards/${s}` },
    { collection: "reports", href: (s) => `/knowledge/reports/${s}` },
    { collection: "videos", href: (s) => `/knowledge/media/videos/${s}` },
    { collection: "podcasts", href: (s) => `/knowledge/media/podcasts/${s}` },
  ],
  opportunities: [
    { collection: "schemes", href: (s) => `/opportunities/schemes/${s}` },
    { collection: "tenders", href: (s) => `/opportunities/tenders/${s}` },
    { collection: "grants", href: (s) => `/opportunities/grants/${s}` },
    { collection: "jobs", href: (s) => `/opportunities/jobs/${s}` },
  ],
  events: [{ collection: "events", href: (s) => `/events/${s}` }],
  tracker: SUB_VIEWS.map((v) => ({ collection: v.slug, href: (s: string) => `/tracker/${v.path}/${s}` })),
  help: [{ collection: "help-articles", href: (s) => `/help/${s}` }],
  newsletter: [{ collection: "newsletter-issues", href: (s) => `/newsletter/issues/${s}` }],
};

/** Hub and company pages that always exist. */
const PAGES = [
  "/",
  "/news",
  "/knowledge",
  "/knowledge/glossary",
  "/knowledge/guides",
  "/knowledge/standards",
  "/knowledge/reports",
  "/knowledge/media",
  "/knowledge/insights",
  "/opportunities",
  "/opportunities/schemes",
  "/opportunities/tenders",
  "/opportunities/grants",
  "/opportunities/jobs",
  "/events",
  "/events/webinars",
  "/tracker",
  ...SUB_VIEWS.map((v) => `/tracker/${v.path}`),
  "/newsletter",
  "/about",
  "/about/mission",
  "/about/team",
  "/contact",
  "/contact/partnerships",
  "/careers",
  "/media-kit",
  "/advertise",
  "/for-buyers",
  "/for-suppliers",
  "/verification",
  "/pricing",
  "/help",
  "/sitemap",
  "/legal/grievance-officer",
  ...LEGAL_PAGES.map((p) => p.href),
];

export const SITEMAP_TYPES = ["pages", ...Object.keys(COLLECTIONS)] as const;

async function fromCollection(source: Source): Promise<Entry[]> {
  const res = await (
    await getPayload({ config })
  ).find({
    collection: source.collection as "articles",
    where: source.where ? { and: [publicWhere(), source.where] } : publicWhere(),
    limit: 5000,
    depth: 0,
    pagination: false,
    select: { slug: true, updatedAt: true } as never,
  });
  return (res.docs as unknown as { slug?: string; updatedAt?: string }[])
    .filter((d) => d.slug)
    .map((d) => ({ loc: absolute(source.href(d.slug ?? "")), lastmod: d.updatedAt }));
}

export async function sitemapEntries(type: string): Promise<Entry[] | null> {
  if (type === "pages") return PAGES.map((p) => ({ loc: absolute(p) }));
  const sources = COLLECTIONS[type];
  if (!sources) return null;
  return (await Promise.all(sources.map(fromCollection))).flat();
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function urlset(entries: Entry[]): string {
  const rows = entries
    .map((e) => `<url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${esc(e.lastmod)}</lastmod>` : ""}</url>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows}</urlset>`;
}

export function sitemapIndex(): string {
  const rows = [...SITEMAP_TYPES, "google-news"]
    .map((t) => `<sitemap><loc>${esc(absolute(`/sitemaps/${t}.xml`))}</loc></sitemap>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows}</sitemapindex>`;
}

/** Google News sitemap: articles published in the last two days. */
export async function newsSitemap(now = new Date()): Promise<string> {
  const since = new Date(now.getTime() - 2 * 86_400_000).toISOString();
  const res = await (
    await getPayload({ config })
  ).find({
    collection: "articles",
    where: { and: [publicWhere(), { publishedAt: { greater_than_equal: since } }] },
    limit: 1000,
    depth: 0,
    pagination: false,
    sort: "-publishedAt",
  });
  const rows = res.docs
    .map(
      (a) =>
        `<url><loc>${esc(absolute(`/news/${a.slug}`))}</loc><news:news><news:publication><news:name>H2 India</news:name><news:language>en</news:language></news:publication><news:publication_date>${esc(a.publishedAt ?? a.updatedAt)}</news:publication_date><news:title>${esc(a.title)}</news:title></news:news></url>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${rows}</urlset>`;
}
