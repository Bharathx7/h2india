import type { Where } from "payload";
import { possibleUpdates, staleRecords } from "@/cms/records/quality";
import { contentType } from "./records";
import { CONTENT_SECTIONS, SECTION_SLUGS, sectionOf } from "./sections";
import type { cmsSession } from "./session";

// What the content home shows (founder, 20 Nov 2026): what needs someone, what changed lately, and search across
// every kind of content. Counts are plain counts; lists run as the signed-in editor, so they see only what the CMS
// lets them see.

type Cms = NonNullable<Awaited<ReturnType<typeof cmsSession>>>;

export interface NeedsItem {
  key: string;
  label: string;
  count: number;
  href: string;
  /** Who acts on it, in one line. */
  hint: string;
}

const articleCount = async (cms: Cms, workflow: string) =>
  (
    await cms.payload.count({
      collection: "articles",
      where: { workflow: { equals: workflow } },
      overrideAccess: true,
    })
  ).totalDocs;

export async function needsAttention(cms: Cms): Promise<NeedsItem[]> {
  const [review, legal, scheduled, corrections, submissions, jobs, stale, updates] = await Promise.all([
    articleCount(cms, "In review"),
    articleCount(cms, "Legal check"),
    articleCount(cms, "Scheduled"),
    cms.payload.count({ collection: "corrections", where: { status: { equals: "Open" } }, overrideAccess: true }),
    cms.payload.count({
      collection: "submissions",
      where: { status: { equals: "Under review" } },
      overrideAccess: true,
    }),
    cms.payload.find({
      collection: "jobs",
      where: { "post.state": { equals: "Submitted for review" } },
      draft: true,
      depth: 0,
      limit: 1,
      overrideAccess: true,
    }),
    staleRecords(cms.payload),
    possibleUpdates(cms.payload),
  ]);
  const articles = (status: string) => `/admin/content?tab=articles&status=${encodeURIComponent(status)}`;
  return [
    {
      key: "review",
      label: "Articles waiting for review",
      count: review,
      href: articles("In review"),
      hint: "An Editor-in-chief publishes them or sends them back.",
    },
    {
      key: "legal",
      label: "Articles in legal check",
      count: legal,
      href: articles("Legal check"),
      hint: "Checked before they can go out.",
    },
    {
      key: "scheduled",
      label: "Articles scheduled",
      count: scheduled,
      href: articles("Scheduled"),
      hint: "They publish on their own at the set time (IST).",
    },
    {
      key: "corrections",
      label: "Reader corrections",
      count: corrections.totalDocs,
      href: articles("corrections"),
      hint: "Fix the article and log the correction.",
    },
    {
      key: "submissions",
      label: "Submissions to review",
      count: submissions.totalDocs + jobs.totalDocs,
      href: "/admin/queues",
      hint: "Events, press releases and jobs people sent in.",
    },
    {
      key: "stale",
      label: "Records to re-check",
      count: stale.length,
      href: "/admin/content?tab=quality",
      hint: "Check against the official source, then mark verified.",
    },
    {
      key: "updates",
      label: "Possible updates",
      count: updates.length,
      href: "/admin/content?tab=quality&view=updates",
      hint: "An official source changed; the record may need editing.",
    },
  ];
}

export interface FoundItem {
  slug: string;
  id: number;
  title: string;
  /** "Tender", "Article". */
  kind: string;
  section: string;
  href: string;
  updatedAt: string;
}

function titleOf(d: Record<string, unknown>, field: string): string {
  const v = [d[field], d.filename].find((x) => typeof x === "string" || typeof x === "number");
  return v === undefined ? `#${String(d.id)}` : String(v);
}

async function findIn(cms: Cms, slug: string, where: Where | undefined, limit: number): Promise<FoundItem[]> {
  if (slug === "articles") {
    const res = await cms.payload.find({
      collection: "articles",
      draft: true,
      depth: 0,
      limit,
      sort: "-updatedAt",
      user: cms.user,
      overrideAccess: false,
      ...(where ? { where } : {}),
    });
    return res.docs.map((a) => ({
      slug,
      id: a.id,
      title: a.title,
      kind: "Article",
      section: "Articles",
      href: `/admin/content/articles/${String(a.id)}`,
      updatedAt: a.updatedAt,
    }));
  }
  const type = contentType(cms.payload, slug);
  if (!type) return [];
  const res = await cms.payload.find({
    collection: slug as "schemes",
    draft: type.drafts,
    depth: 0,
    limit,
    sort: "-updatedAt",
    user: cms.user,
    overrideAccess: false,
    ...(where ? { where } : {}),
  });
  return res.docs.map((raw) => {
    const d = raw as unknown as Record<string, unknown>;
    return {
      slug,
      id: d.id as number,
      title: titleOf(d, type.titleField),
      kind: type.singular,
      section: sectionOf(slug)?.label ?? "",
      href: `/admin/content/${slug}/${String(d.id)}`,
      updatedAt: String(d.updatedAt),
    };
  });
}

/** Kinds people write by hand (not the system's history or the inbox), for Recently changed. */
const EDITED_SLUGS = [
  "articles",
  ...CONTENT_SECTIONS.filter((s) => s.id !== "inbox" && s.id !== "media").flatMap((s) => s.types.map((t) => t.slug)),
];

/** The latest changes across content, newest first. */
export async function recentlyChanged(cms: Cms, limit = 8): Promise<FoundItem[]> {
  const lists = await Promise.all(EDITED_SLUGS.map((slug) => findIn(cms, slug, undefined, 3).catch(() => [])));
  return lists
    .flat()
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, limit);
}

/** Search every kind of content by its title (up to five of each kind). */
export async function searchContent(cms: Cms, q: string): Promise<FoundItem[]> {
  const term = q.trim();
  if (!term) return [];
  const lists = await Promise.all(
    ["articles", ...SECTION_SLUGS].map((slug) => {
      const field = slug === "articles" ? "title" : contentType(cms.payload, slug)?.titleField;
      if (!field || field === "id") return Promise.resolve([]);
      return findIn(cms, slug, { [field]: { like: term } }, 5).catch(() => []);
    }),
  );
  return lists.flat();
}
