import type { CollectionConfig } from "payload";
import { canDelete, canEdit } from "../roles";
import { publicOrEditor, refuseSamplePublish } from "../sample";

// Past newsletter issues for the archive (445:5885) and the issue page (446:6106), step 5.9. The composer and
// sending arrive with step 11.3 (647:8, 648:312); until then editors enter an issue after it goes out. Each issue's
// eight sections ("In every issue") are rich text.

export const NEWSLETTER_LISTS = [
  { value: "weekly", label: "India H₂ Weekly" },
  { value: "tender-digest", label: "Tender Alert digest" },
] as const;

export const IN_EVERY_ISSUE = [
  "This week in Indian hydrogen",
  "Opportunities closing this week",
  "Number of the week",
  "Explainer of the week",
  "New on the marketplace",
  "People and jobs",
  "Events this month",
  "Global to India",
];

export const NewsletterIssues: CollectionConfig = {
  slug: "newsletter-issues",
  labels: { singular: "Newsletter issue", plural: "Newsletter issues" },
  admin: {
    useAsTitle: "title",
    group: "Newsroom",
    defaultColumns: ["list", "number", "title", "sentOn", "_status"],
    description: "Past issues shown in the newsletter archive. Sending arrives with step 11.3.",
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: { read: publicOrEditor, create: canEdit, update: canEdit, delete: canDelete, readVersions: canEdit },
  hooks: { beforeChange: [refuseSamplePublish] },
  defaultSort: "-sentOn",
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "list",
          type: "select",
          required: true,
          defaultValue: "weekly",
          options: NEWSLETTER_LISTS.map((l) => ({ label: l.label, value: l.value })),
        },
        { name: "number", type: "number", required: true, min: 1 },
        {
          name: "sentOn",
          type: "date",
          required: true,
          admin: { date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" } },
        },
        { name: "readMinutes", type: "number", min: 1, defaultValue: 6 },
      ],
    },
    { name: "title", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: { position: "sidebar", description: "For example india-h2-weekly-4." },
    },
    {
      name: "highlights",
      type: "array",
      maxRows: 3,
      admin: { description: "The three lines under the title in the archive." },
      fields: [{ name: "text", type: "text", required: true }],
    },
    {
      name: "sections",
      type: "array",
      fields: [
        { name: "heading", type: "select", required: true, options: IN_EVERY_ISSUE },
        { name: "body", type: "richText" },
      ],
    },
    { name: "sample", type: "checkbox", admin: { position: "sidebar", description: "Sample content (F9)." } },
  ],
};
