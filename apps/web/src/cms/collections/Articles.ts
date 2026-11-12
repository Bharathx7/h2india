import { BlocksFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
import { APIError, type CollectionBeforeChangeHook, type CollectionConfig } from "payload";
import { KeyFacts, KeyNumbers } from "../blocks";
import { canDelete, canEdit, canPublish, publishedOrEditor } from "../roles";
import { slugFrom } from "../slug";
import { ALWAYS_LEGAL, ARTICLE_TYPES } from "../types";

// Articles: the six types (A28) with their header variants (437:3709 to 437:4387), authors, topics, tags, sources and
// SEO (639:8). Drafts and versions are kept and comparable. Only content.publish may publish (step 4.1); the editorial
// workflow (step 4.2) adds review, legal check, scheduling and corrections.

interface ArticleData {
  type?: string;
  _status?: "draft" | "published";
  sources?: unknown[] | null;
  sponsor?: { name?: string | null; disclosure?: string | null } | null;
  issuer?: string | null;
  legal?: { flagged?: boolean | null; passedAt?: string | null } | null;
}

const guardPublishing: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  const next = data as ArticleData;
  const before = originalDoc as ArticleData | undefined;
  const publishing = next._status === "published";
  if (!publishing) return data;
  if (!canPublish(req)) {
    throw new APIError("Only an Editor-in-chief can publish. Send it for review instead.", 403, null, true);
  }
  const type = next.type ?? before?.type ?? "";
  const legal = { ...(before?.legal ?? {}), ...(next.legal ?? {}) };
  if ((ALWAYS_LEGAL.includes(type) || legal.flagged) && !legal.passedAt) {
    throw new APIError("This piece needs a legal check before it's published.", 400, null, true);
  }
  if (!(next.sources ?? before?.sources ?? []).length) {
    throw new APIError("Add at least one source before publishing.", 400, null, true);
  }
  return data;
};

export const Articles: CollectionConfig = {
  slug: "articles",
  admin: {
    useAsTitle: "title",
    group: "Content",
    defaultColumns: ["title", "type", "_status", "updatedAt"],
    preview: (doc) => `/cms-preview/articles/${String(doc.id)}`,
  },
  versions: { drafts: { autosave: { interval: 2000 } }, maxPerDoc: 50 },
  access: { read: publishedOrEditor, create: canEdit, update: canEdit, delete: canDelete, readVersions: canEdit },
  hooks: { beforeChange: [guardPublishing] },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "type",
          type: "select",
          required: true,
          defaultValue: "news",
          options: ARTICLE_TYPES.map((t) => ({ label: t.label, value: t.value })),
          admin: { width: "30%", description: "Sponsored and press-release pieces always show their label." },
        },
        { name: "topics", type: "relationship", relationTo: "topics", hasMany: true, admin: { width: "35%" } },
        { name: "tags", type: "relationship", relationTo: "tags", hasMany: true, admin: { width: "35%" } },
      ],
    },
    { name: "title", type: "text", required: true, maxLength: 140 },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      hooks: { beforeValidate: [slugFrom("title")] },
      admin: { position: "sidebar", description: "Part of the address. Don't change it once published." },
    },
    { name: "dek", label: "Standfirst", type: "textarea", required: true, maxLength: 300 },
    { name: "heroImage", type: "upload", relationTo: "media" },
    {
      name: "body",
      type: "richText",
      required: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: [KeyNumbers, KeyFacts] })],
      }),
    },
    {
      name: "interviewee",
      type: "group",
      admin: { condition: (data) => (data as ArticleData).type === "interview" },
      fields: [
        { name: "name", type: "text" },
        { name: "role", type: "text" },
        { name: "organisation", type: "text" },
      ],
    },
    {
      name: "issuer",
      label: "Issued by",
      type: "text",
      admin: {
        condition: (data) => (data as ArticleData).type === "press_release",
        description: "The organisation that issued the press release. Shown with the label.",
      },
      validate: (value: string | null | undefined, { data }: { data: Partial<ArticleData> }) =>
        data.type !== "press_release" || (typeof value === "string" && value.trim()) ? true : "Who issued it?",
    },
    {
      name: "sponsor",
      type: "group",
      admin: { condition: (data) => (data as ArticleData).type === "sponsored" },
      fields: [
        {
          name: "name",
          type: "text",
          validate: (value: string | null | undefined, { data }: { data: Partial<ArticleData> }) =>
            data.type !== "sponsored" || (typeof value === "string" && value.trim()) ? true : "Who paid for it?",
        },
        { name: "logo", type: "upload", relationTo: "media" },
        {
          name: "disclosure",
          type: "textarea",
          defaultValue: "This article is paid for by the sponsor. H2 India's editors checked its facts.",
          validate: (value: string | null | undefined, { data }: { data: Partial<ArticleData> }) =>
            data.type !== "sponsored" || (typeof value === "string" && value.trim()) ? true : "Add the disclosure.",
        },
      ],
    },
    {
      name: "sources",
      type: "array",
      admin: {
        description: "Every article needs sources before it's published. They're listed at the end for readers.",
      },
      fields: [
        { name: "title", type: "text", required: true },
        { name: "url", type: "text" },
        { name: "note", type: "text", admin: { description: "For example PDF · hydroteksystems.in" } },
        { name: "internal", type: "checkbox", admin: { description: "Kept with the article, not shown to readers." } },
      ],
    },
    {
      name: "authors",
      type: "relationship",
      relationTo: "authors",
      hasMany: true,
      required: true,
      admin: { position: "sidebar" },
    },
    { name: "editor", type: "relationship", relationTo: "editors", admin: { position: "sidebar" } },
    {
      name: "legal",
      type: "group",
      admin: { position: "sidebar" },
      fields: [
        {
          name: "flagged",
          type: "checkbox",
          label: "Needs a legal check",
          admin: { description: "Always on for sponsored and press-release pieces (A27)." },
        },
        {
          name: "note",
          type: "textarea",
          admin: { condition: (_d, sibling) => Boolean((sibling as { flagged?: boolean }).flagged) },
        },
        { name: "passedBy", type: "relationship", relationTo: "editors", admin: { readOnly: true } },
        { name: "passedAt", type: "date", admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } } },
      ],
    },
    {
      name: "seo",
      label: "SEO",
      type: "group",
      fields: [
        { name: "title", label: "Search title", type: "text", maxLength: 60 },
        { name: "description", label: "Meta description", type: "textarea", maxLength: 160 },
      ],
    },
  ],
};
