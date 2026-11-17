import { CountChip, cx } from "@h2india/ui";
import Link from "next/link";
import type { Payload } from "payload";
import { RECORD_COLLECTIONS } from "@/cms/records/collections";
import { possibleUpdates, staleRecords } from "@/cms/records/quality";
import { TRACKER_SLUGS } from "@/cms/tracker/options";

// The Content tabs (638:8, 649:8, 649:730, 647:8, 646:9): Articles, Records, Newsletter, Media, Authors and Data
// quality, each with its count.

export const CONTENT_TABS = [
  { key: "articles", label: "Articles", href: "/admin/content?tab=articles" },
  { key: "records", label: "Records", href: "/admin/content?tab=records" },
  { key: "newsletter", label: "Newsletter", href: "/admin/content?tab=newsletter" },
  { key: "media", label: "Media", href: "/admin/content/media" },
  { key: "authors", label: "Authors", href: "/admin/content/authors" },
  { key: "quality", label: "Data quality", href: "/admin/content?tab=quality" },
] as const;

export type ContentTab = (typeof CONTENT_TABS)[number]["key"];

export async function contentCounts(payload: Payload): Promise<Record<ContentTab, number>> {
  const count = async (collection: "articles" | "media" | "authors" | "newsletter-issues") =>
    (await payload.count({ collection, overrideAccess: true })).totalDocs;
  const records = async () => {
    const n = await Promise.all(
      [...RECORD_COLLECTIONS, ...TRACKER_SLUGS].map((c) => payload.count({ collection: c, overrideAccess: true })),
    );
    return n.reduce((a, x) => a + x.totalDocs, 0);
  };
  const [articles, media, authors, newsletter, recordCount, stale, updates] = await Promise.all([
    count("articles"),
    count("media"),
    count("authors"),
    count("newsletter-issues"),
    records(),
    staleRecords(payload),
    possibleUpdates(payload),
  ]);
  return {
    articles,
    records: recordCount,
    newsletter,
    media,
    authors,
    quality: stale.length + updates.length,
  };
}

export function ContentTabs({ current, counts }: { current: ContentTab; counts: Record<ContentTab, number> }) {
  return (
    <nav aria-label="Content" className="flex gap-6 overflow-x-auto border-b border-default">
      {CONTENT_TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? "page" : undefined}
          className={cx(
            "-mb-px inline-flex items-center gap-2 border-b-2 py-3 whitespace-nowrap type-label",
            t.key === current ? "border-inverse" : "border-transparent text-secondary",
          )}
        >
          {t.label}
          <CountChip>{counts[t.key].toLocaleString("en-IN")}</CountChip>
        </Link>
      ))}
    </nav>
  );
}

/** "Content" with the page's sentence and its actions, as on every Content tab. */
export function ContentHeader({ intro, actions }: { intro: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex max-w-3xl flex-col gap-1">
        <h1 className="type-h2">Content</h1>
        <p className="type-body-sm text-secondary">{intro}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* The advanced editor stays for what the native screens don't do (A26); it moved here from Overview (founder
            QC, 17 Nov 2026). */}
        <Link
          href="/cms"
          prefetch={false}
          className="type-label text-secondary underline underline-offset-2 hover:text-body"
        >
          Advanced editor (CMS)
        </Link>
        {actions}
      </div>
    </div>
  );
}
