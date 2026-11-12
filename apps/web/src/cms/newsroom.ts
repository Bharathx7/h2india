import { revalidateTag } from "next/cache";
import {
  APIError,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
  type CollectionBeforeChangeHook,
  type Field,
  type PayloadRequest,
  type Validate,
} from "payload";

// The public newsroom (step 5.3): reader levels, the live explainer fields (801:7492), the rule that article and section
// addresses can't clash (both live under /news/<name>), and refreshing cached pages the moment the CMS changes.

/** The reader level on Insights cards and posts (440:40, 441:801). */
export const LEVELS = ["Beginner", "Professional", "Expert"] as const;

export function levelField(condition?: (data: Record<string, unknown>) => boolean): Field {
  return {
    name: "level",
    type: "select",
    options: [...LEVELS],
    admin: { position: "sidebar", description: "Who it's written for. Shown on Insights (440:40).", condition },
  };
}

/** /news/<name> words that are pages of their own, never an article. */
export const RESERVED_NEWS_SLUGS = ["press-releases", "latest", "page"];

/** The cache tag every public newsroom read carries; changes to these collections refresh it. */
export const NEWS_TAG = "newsroom";

async function taken(req: PayloadRequest, collection: "articles" | "topics", slug: string, id?: number | string) {
  const found = await req.payload.find({
    collection,
    where:
      id === undefined ? { slug: { equals: slug } } : { and: [{ slug: { equals: slug } }, { id: { not_equals: id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    draft: true,
    req,
  });
  return found.docs.length > 0;
}

/** An article's address can't be a section's (A56): /news/policy is the Policy section. */
export const articleSlugFree: Validate<string | null | undefined> = async (value, { req }) => {
  if (typeof value !== "string" || !value) return true;
  if (RESERVED_NEWS_SLUGS.includes(value) || (await taken(req, "topics", value))) {
    return `“${value}” is the address of a news section. Change the slug.`;
  }
  return true;
};

/**
 * The same rule as a save hook, because Payload skips field validation for drafts: an article never takes a section's
 * address, even before it's published.
 */
export const refuseSectionSlug: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const slug = (data as { slug?: unknown }).slug ?? (originalDoc as { slug?: unknown } | undefined)?.slug;
  if (typeof slug !== "string" || !slug) return data;
  if (RESERVED_NEWS_SLUGS.includes(slug) || (await taken(req, "topics", slug))) {
    throw new APIError(`“${slug}” is the address of a news section. Change the slug.`, 400, null, true);
  }
  return data;
};

/** A section's address can't be an article's. */
export const topicSlugFree: Validate<string | null | undefined> = async (value, { req }) => {
  if (typeof value !== "string" || !value) return true;
  if (RESERVED_NEWS_SLUGS.includes(value) || (await taken(req, "articles", value))) {
    return `An article already uses “${value}”. Choose another slug.`;
  }
  return true;
};

/**
 * Refreshes the cached newsroom pages after a change. Outside a Next.js request (the seed, imports from the command
 * line) there is no cache to refresh, so the call is skipped; the pages also refresh on their own within a minute.
 */
function refresh() {
  try {
    revalidateTag(NEWS_TAG, { expire: 0 });
  } catch {
    // Not inside Next.js.
  }
}

const afterChange: CollectionAfterChangeHook = ({ doc }) => {
  refresh();
  return doc as unknown;
};
const afterDelete: CollectionAfterDeleteHook = () => {
  refresh();
};

export const newsroomHooks = { afterChange: [afterChange], afterDelete: [afterDelete] };

/** "Key facts" in the article's side column (434:2844, 801:7492): issuer, scheme, dates. */
export const keyFactsField: Field = {
  name: "keyFacts",
  label: "Key facts (side column)",
  type: "array",
  maxRows: 6,
  fields: [
    { name: "label", type: "text", required: true, admin: { description: "For example Issuer, Bid due" } },
    { name: "value", type: "text", required: true },
  ],
};

/** The live explainer (801:7492 live, 801:8616 ended): summary, pinned key numbers and timed updates. */
export const liveField: Field = {
  name: "live",
  label: "Live explainer",
  type: "group",
  admin: {
    description: "For an event that unfolds through the day (an auction, a results day). Updates show newest first.",
  },
  fields: [
    {
      name: "status",
      type: "select",
      defaultValue: "off",
      options: [
        { label: "Not a live explainer", value: "off" },
        { label: "Live", value: "live" },
        { label: "Ended", value: "ended" },
      ],
    },
    {
      name: "summary",
      type: "array",
      admin: { condition: (_d, s) => (s as { status?: string }).status !== "off" },
      fields: [{ name: "point", type: "text", required: true }],
    },
    {
      name: "summaryAt",
      label: "Summary updated",
      type: "date",
      admin: {
        condition: (_d, s) => (s as { status?: string }).status !== "off",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
    {
      name: "keyNumbers",
      label: "Pinned key numbers",
      type: "array",
      maxRows: 3,
      admin: { condition: (_d, s) => (s as { status?: string }).status !== "off" },
      fields: [
        {
          name: "value",
          type: "text",
          required: true,
          admin: { description: "As readers see it, for example ₹49.20" },
        },
        { name: "label", type: "text", required: true },
      ],
    },
    {
      name: "keyNumbersSource",
      label: "Key numbers source",
      type: "text",
      admin: { condition: (_d, s) => (s as { status?: string }).status !== "off" },
    },
    {
      name: "meaning",
      label: "What it means (when ended)",
      type: "array",
      admin: { condition: (_d, s) => (s as { status?: string }).status === "ended" },
      fields: [{ name: "point", type: "text", required: true }],
    },
    {
      name: "updates",
      type: "array",
      admin: { condition: (_d, s) => (s as { status?: string }).status !== "off" },
      fields: [
        {
          name: "at",
          type: "date",
          required: true,
          admin: { date: { pickerAppearance: "dayAndTime", displayFormat: "d MMM, h:mm a" } },
        },
        { name: "title", type: "text", required: true },
        { name: "text", type: "textarea" },
        {
          name: "document",
          type: "group",
          fields: [
            { name: "title", type: "text" },
            { name: "url", type: "text" },
            { name: "note", type: "text", admin: { description: "For example PDF · 3 pages · seci.co.in" } },
          ],
        },
      ],
    },
  ],
};
