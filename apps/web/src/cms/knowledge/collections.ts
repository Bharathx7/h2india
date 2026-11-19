import { BlocksFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
import { APIError, type CollectionBeforeChangeHook, type CollectionConfig, type Field } from "payload";
import { KeyFacts, KeyNumbers, YouTube } from "../blocks";
import { canDelete, canEdit, canPublish, canView, has } from "../roles";
import { publicOrEditor, refuseSamplePublish } from "../sample";
import { scanUpload } from "../scan";
import { slugFrom } from "../slug";
import { levelField, newsroomHooks } from "../newsroom";
import { searchHooks } from "../../search/hooks";
import { chapterWithNeighbours, purgeReportLeads } from "./library";

// The knowledge library (step 4.4, Figma page 09): Hydrogen 101 chapters (471:1876), buyer's guides (472:2135),
// glossary terms (735:3378, 735:3810; editor 645:773), standards and regulations (735:4138, 735:4587; editor 645:1249),
// reports with a gated download (736:421, 736:833), videos (273:22177, 273:22703) and podcast episodes (736:1169).
// Media stays with the hosting chosen in M9; until then records keep only its URL.

const body: Field = {
  name: "body",
  type: "richText",
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: [KeyNumbers, KeyFacts, YouTube] })],
  }),
};

const slug = (from: string): Field => ({
  name: "slug",
  type: "text",
  required: true,
  unique: true,
  index: true,
  hooks: { beforeValidate: [slugFrom(from)] },
  admin: { position: "sidebar" },
});

const sample: Field = {
  name: "sample",
  type: "checkbox",
  admin: { position: "sidebar", description: "Sample content (F9): never shown in production." },
};
const topics: Field = {
  name: "topics",
  type: "relationship",
  relationTo: "topics",
  hasMany: true,
  admin: { position: "sidebar" },
};

/** Editorial pieces (chapters, guides, reports, videos, podcasts): editors write, the Editor-in-chief publishes (A32). */
const editorialPublish: CollectionBeforeChangeHook = ({ data, req }) => {
  if ((data as { _status?: string })._status === "published" && req.user && !canPublish(req)) {
    throw new APIError("Only an Editor-in-chief can publish. Ask them to review it.", 403, null, true);
  }
  return data;
};

const editorial = {
  versions: { drafts: true, maxPerDoc: 30 },
  access: { read: publicOrEditor, create: canEdit, update: canEdit, delete: canDelete, readVersions: canEdit },
  hooks: { beforeChange: [editorialPublish, refuseSamplePublish], ...searchHooks },
} satisfies Partial<CollectionConfig>;

/** Reference records (glossary, standards): like schemes and tenders, editors publish them (A30). */
const reference = {
  versions: { drafts: true, maxPerDoc: 30 },
  access: { read: publicOrEditor, create: canEdit, update: canEdit, delete: canDelete, readVersions: canEdit },
  hooks: { beforeChange: [refuseSamplePublish], ...searchHooks },
} satisfies Partial<CollectionConfig>;

export const Chapters: CollectionConfig = {
  slug: "chapters",
  labels: { singular: "Hydrogen 101 chapter", plural: "Hydrogen 101" },
  admin: { useAsTitle: "title", group: "Knowledge", defaultColumns: ["order", "title", "_status"] },
  ...editorial,
  defaultSort: "order",
  endpoints: [
    {
      // GET /api/cms/chapters/:slug/neighbours: the chapter with the chapters before and after it (published only).
      path: "/:slug/neighbours",
      method: "get",
      handler: async (req) => {
        const slug = typeof req.routeParams?.slug === "string" ? req.routeParams.slug : "";
        const found = await chapterWithNeighbours(req.payload, slug);
        if (!found) return Response.json({ errors: [{ message: "Not found" }] }, { status: 404 });
        const { chapter, previous, next } = found;
        return Response.json({
          chapter: { title: chapter.title, slug: chapter.slug, order: chapter.order },
          previous,
          next,
        });
      },
    },
  ],
  fields: [
    {
      name: "order",
      type: "number",
      required: true,
      unique: true,
      index: true,
      admin: { description: "Chapter number: sets previous and next." },
    },
    { name: "title", type: "text", required: true },
    slug("title"),
    { name: "summary", type: "textarea", required: true, maxLength: 300 },
    { name: "readingMinutes", type: "number" },
    { name: "heroImage", type: "upload", relationTo: "media" },
    { name: "heroCaption", label: "Picture caption", type: "text" },
    { ...body, required: true },
    {
      name: "keyTerms",
      label: "Key terms in this chapter",
      type: "relationship",
      relationTo: "glossary",
      hasMany: true,
    },
    {
      name: "quiz",
      label: "Check your understanding",
      type: "array",
      maxRows: 5,
      admin: { description: "Questions at the end of the chapter (471:1876). The answer is checked in the browser." },
      fields: [
        { name: "question", type: "text", required: true },
        {
          name: "options",
          type: "array",
          minRows: 2,
          maxRows: 5,
          fields: [{ name: "option", type: "text", required: true }],
        },
        {
          name: "answer",
          label: "Correct option (1 for the first)",
          type: "number",
          required: true,
          min: 1,
          max: 5,
        },
        { name: "explanation", type: "text", admin: { description: "Shown after they check." } },
      ],
    },
    topics,
    sample,
  ],
};

// Guides are the "Guide" pieces on Insights (440:40, post 441:801, step 5.3, A55) and the buyer's guides (step 5.6).
export const Guides: CollectionConfig = {
  slug: "guides",
  labels: { singular: "Buyer's guide", plural: "Buyer's guides" },
  admin: { useAsTitle: "title", group: "Knowledge" },
  ...editorial,
  hooks: {
    ...editorial.hooks,
    afterChange: [...editorial.hooks.afterChange, ...newsroomHooks.afterChange],
    afterDelete: [...editorial.hooks.afterDelete, ...newsroomHooks.afterDelete],
  },
  fields: [
    { name: "title", type: "text", required: true },
    slug("title"),
    { name: "summary", type: "textarea", required: true, maxLength: 300 },
    levelField(),
    {
      name: "audience",
      label: "Who this is for",
      type: "textarea",
      maxLength: 300,
      admin: { description: "For example Plant engineers and procurement teams choosing a first electrolyser." },
    },
    {
      name: "learn",
      label: "You will learn",
      type: "array",
      maxRows: 6,
      fields: [{ name: "point", type: "text", required: true }],
    },
    { name: "authors", type: "relationship", relationTo: "authors", hasMany: true },
    { name: "heroImage", type: "upload", relationTo: "media" },
    { ...body, required: true },
    {
      name: "productCategories",
      label: "Products in this guide",
      type: "text",
      hasMany: true,
      admin: { description: "Catalogue categories; linked to live products with the marketplace (Stage 6)." },
    },
    topics,
    sample,
  ],
};

export const Glossary: CollectionConfig = {
  slug: "glossary",
  labels: { singular: "Glossary term", plural: "Glossary" },
  admin: { useAsTitle: "term", group: "Knowledge", defaultColumns: ["term", "short", "_status"] },
  ...reference,
  defaultSort: "term",
  fields: [
    {
      name: "term",
      type: "text",
      required: true,
      index: true,
      admin: { description: "As readers see it, for example RfS." },
    },
    slug("term"),
    { name: "expansion", type: "text", admin: { description: "For example Request for Selection." } },
    {
      name: "category",
      type: "select",
      options: ["Technology", "Economics", "Policy", "Safety", "Markets", "Units"],
      admin: { description: "Shown under the term (735:3810), for example Economics." },
    },
    {
      name: "aliases",
      type: "text",
      hasMany: true,
      admin: { description: "Other ways it's written; each is linked in articles too." },
    },
    {
      name: "short",
      label: "Short definition",
      type: "textarea",
      required: true,
      maxLength: 220,
      admin: {
        description:
          "Shown in the hover-card in articles, after the expansion: for example the tender document SECI issues to invite bids for a SIGHT round.",
      },
    },
    { ...body, label: "In plain language" },
    {
      name: "formula",
      label: "How it's worked out",
      type: "textarea",
      admin: { description: "A formula, shown in a code box. Leave empty when there isn't one." },
    },
    { name: "formulaNote", label: "Units note", type: "text" },
    {
      name: "popular",
      label: "Most searched",
      type: "checkbox",
      admin: { position: "sidebar", description: "Listed under Most searched on the glossary (735:3378)." },
    },
    { name: "related", type: "relationship", relationTo: "glossary", hasMany: true },
    { name: "standards", type: "relationship", relationTo: "standards", hasMany: true },
    {
      name: "autoLink",
      type: "checkbox",
      defaultValue: true,
      admin: { position: "sidebar", description: "Link it in articles automatically (first mention only)." },
    },
    topics,
    sample,
  ],
};

export const Standards: CollectionConfig = {
  slug: "standards",
  labels: { singular: "Standard or regulation", plural: "Standards and regulations" },
  admin: { useAsTitle: "code", group: "Knowledge", defaultColumns: ["code", "title", "kind", "inForce"] },
  ...reference,
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "code",
          type: "text",
          required: true,
          index: true,
          admin: { description: "For example ISO 22734:2019." },
        },
        {
          name: "kind",
          type: "select",
          required: true,
          defaultValue: "Standard",
          options: ["Standard", "Rule", "Notification", "Guideline", "Regulation"],
        },
      ],
    },
    { name: "title", type: "text", required: true },
    slug("code"),
    {
      type: "row",
      fields: [
        { name: "issuer", type: "text", required: true, admin: { description: "ISO, IEC, BIS, PESO, MNRE…" } },
        {
          name: "inForce",
          label: "Status",
          type: "select",
          defaultValue: "In force",
          options: ["In force", "Draft", "Withdrawn", "Superseded"],
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "dated",
          type: "date",
          admin: { date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" }, description: "Its date." },
        },
        {
          name: "documentType",
          label: "Document",
          type: "text",
          admin: { description: "For example office memorandum." },
        },
        {
          name: "checkedAt",
          label: "Last checked by H2 Economy",
          type: "date",
          admin: { date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" } },
        },
      ],
    },
    { name: "summary", type: "textarea", required: true, maxLength: 400 },
    body,
    {
      name: "scope",
      label: "Scope and who it affects",
      type: "array",
      fields: [{ name: "point", type: "text", required: true }],
    },
    { name: "related", label: "Related records", type: "relationship", relationTo: "standards", hasMany: true },
    {
      name: "appliesTo",
      type: "text",
      hasMany: true,
      admin: { description: "Equipment it applies to; linked to products in Stage 6." },
    },
    { name: "sourceUrl", label: "Official page", type: "text", required: true },
    topics,
    sample,
  ],
};

/** Report PDFs: private storage, opened only through a short link after the gate (step 4.4). */
export const ReportFiles: CollectionConfig = {
  slug: "report-files",
  labels: { singular: "Report file", plural: "Report files" },
  admin: { useAsTitle: "filename", group: "Knowledge" },
  access: { read: canView, create: canEdit, update: canEdit, delete: canDelete },
  hooks: { beforeOperation: [scanUpload] },
  upload: { mimeTypes: ["application/pdf"] },
  fields: [{ name: "pages", type: "number" }],
};

export const Reports: CollectionConfig = {
  slug: "reports",
  admin: { useAsTitle: "title", group: "Knowledge" },
  ...editorial,
  fields: [
    { name: "title", type: "text", required: true },
    slug("title"),
    {
      name: "kicker",
      type: "text",
      admin: { description: "On the cover, for example Survey, Data note or Analysis." },
    },
    {
      name: "publishedOn",
      label: "Published on",
      type: "date",
      required: true,
      index: true,
      admin: {
        date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" },
        description: "Shown on the listing (736:8).",
      },
    },
    { name: "subtitle", type: "text", admin: { description: "For example what 62 buyers told us." } },
    { name: "summary", type: "textarea", required: true },
    {
      name: "findings",
      label: "Key findings",
      type: "array",
      fields: [{ name: "finding", type: "text", required: true }],
    },
    { name: "contents", type: "array", fields: [{ name: "chapter", type: "text", required: true }] },
    { name: "writtenBy", type: "textarea" },
    {
      name: "gated",
      type: "checkbox",
      defaultValue: true,
      admin: { description: "Readers give their details to download (736:421)." },
    },
    { name: "file", type: "upload", relationTo: "report-files", required: true },
    {
      name: "sponsor",
      type: "group",
      fields: [
        { name: "name", type: "text", admin: { description: "Leave empty when nobody paid for it." } },
        {
          name: "disclosure",
          type: "textarea",
          admin: { description: "For example Hydrotek Systems paid for this survey. H2 Economy wrote it." },
        },
      ],
    },
    topics,
    sample,
  ],
};

const mediaFields = (urlLabel: string): Field[] => [
  {
    name: "url",
    label: urlLabel,
    type: "text",
    required: true,
    admin: {
      description:
        "Where it's hosted (M9). For a file H2 Economy hosts, upload it in Video and audio files and paste its address here.",
    },
  },
  { name: "durationMinutes", type: "number" },
  {
    name: "publishedOn",
    label: "Published on",
    type: "date",
    index: true,
    admin: { date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" } },
  },
  {
    name: "people",
    label: "In this episode",
    type: "array",
    fields: [
      {
        type: "row",
        fields: [
          { name: "name", type: "text", required: true },
          { name: "role", type: "text", admin: { description: "For example CTO, Hydrotek Systems · guest." } },
        ],
      },
    ],
  },
  {
    name: "chapters",
    type: "array",
    fields: [
      {
        type: "row",
        fields: [
          { name: "at", label: "Starts at", type: "text", required: true, admin: { description: "mm:ss" } },
          { name: "title", type: "text", required: true },
        ],
      },
    ],
  },
  { name: "transcript", type: "textarea", admin: { description: "Speaker on its own line ending with a colon." } },
];

export const Videos: CollectionConfig = {
  slug: "videos",
  admin: { useAsTitle: "title", group: "Knowledge" },
  ...editorial,
  fields: [
    { name: "title", type: "text", required: true },
    slug("title"),
    { name: "series", type: "text", index: true },
    {
      name: "kind",
      type: "select",
      defaultValue: "Explainer",
      options: ["Explainer", "60-second explainer", "Interview", "Event highlight"],
      admin: { description: "The row it sits in on Videos (273:22177)." },
    },
    {
      name: "featured",
      type: "checkbox",
      admin: { position: "sidebar", description: "The big video at the top of Videos." },
    },
    { name: "language", type: "text", admin: { description: "For example English with Hindi subtitles." } },
    { name: "description", type: "textarea", required: true },
    ...mediaFields("Video address"),
    { name: "thumbnail", type: "upload", relationTo: "media" },
    topics,
    sample,
  ],
};

export const Podcasts: CollectionConfig = {
  slug: "podcasts",
  labels: { singular: "Podcast episode", plural: "Podcast episodes" },
  admin: { useAsTitle: "title", group: "Knowledge" },
  ...editorial,
  fields: [
    { name: "title", type: "text", required: true },
    slug("title"),
    {
      type: "row",
      fields: [
        { name: "show", type: "text", required: true },
        { name: "episode", type: "number" },
      ],
    },
    { name: "description", type: "textarea", required: true },
    { name: "guests", type: "text", hasMany: true },
    {
      name: "alsoOn",
      label: "Also on",
      type: "text",
      admin: { description: "For example Spotify, Apple Podcasts and YouTube." },
    },
    ...mediaFields("Audio address"),
    topics,
    sample,
  ],
};

/**
 * Gated report downloads (A33): who, whether the sponsor may contact them, when. Personal data, so only staff who
 * may export content (Editor-in-chief, Super admin) see them; they hand opted-in leads to sponsors (step 11.3).
 * Deleted 24 months after the download.
 */
export const ReportLeads: CollectionConfig = {
  slug: "report-leads",
  labels: { singular: "Report lead", plural: "Report leads" },
  admin: {
    useAsTitle: "email",
    group: "Knowledge",
    defaultColumns: ["report", "name", "company", "sponsorConsent", "createdAt"],
    hidden: ({ user }) => !(user as { permissions?: string[] } | null)?.permissions?.includes("content.export"),
  },
  access: {
    read: ({ req }) => has(req, "content.export"),
    create: () => false,
    update: () => false,
    delete: canDelete,
  },
  endpoints: [
    {
      // POST /api/cms/report-leads/purge-expired: the 24-month clean-up on demand (the worker runs it daily).
      path: "/purge-expired",
      method: "post",
      handler: async (req) => {
        if (!has(req, "content.delete"))
          return Response.json({ errors: [{ message: "Not allowed" }] }, { status: 403 });
        return Response.json({ deleted: await purgeReportLeads(req.payload) });
      },
    },
  ],
  fields: [
    { name: "report", type: "relationship", relationTo: "reports", required: true },
    { name: "name", type: "text", required: true },
    { name: "email", type: "email", required: true },
    { name: "company", type: "text", admin: { description: "Empty for signed-in members." } },
    { name: "role", type: "text" },
    { name: "sponsorConsent", label: "Sponsor may contact", type: "checkbox", defaultValue: false },
    { name: "consentText", type: "text", admin: { description: "The words they agreed to, as shown." } },
    { name: "consentVersion", type: "text", admin: { description: "The version of those words." } },
    {
      name: "userId",
      type: "text",
      admin: { description: "Set when a signed-in member downloaded it (never shared)." },
    },
  ],
};
