import type { CollectionBeforeValidateHook, CollectionConfig } from "payload";
import { canDelete, canEdit } from "../roles";
import { publicOrEditor, refuseSamplePublish } from "../sample";

// Application pages (step 6.2, F4 safe default: one template for all seven applications). The page is drawn once,
// for Refuelling & mobility (754:14685, phones 754:15141); each application's words, headline figures and the
// "What goes into" chain are entered here by editors. Figures always carry their source and as-of date: nothing is
// written in code. An application without a published page still renders its categories and the quote request.

/** The applications in core.catalogue_applications (migration 0022). */
export const APPLICATION_OPTIONS = [
  { value: "production", label: "Green hydrogen production" },
  { value: "storage-transport", label: "Storage & transport" },
  { value: "refuelling-mobility", label: "Refuelling & mobility" },
  { value: "fuel-cells-power", label: "Fuel cells for power" },
  { value: "industrial-use", label: "Industrial decarbonisation" },
  { value: "ports-shipping", label: "Ports & shipping" },
  { value: "safety-testing", label: "Safety & testing" },
];

/** Figures without a source can't be saved: every number on the page says where it came from. */
const figuresNeedSource: CollectionBeforeValidateHook = ({ data }) => {
  const d = data as { figures?: unknown[]; figuresSource?: string | null; figuresAsOf?: string | null } | undefined;
  if (d?.figures?.length && (!d.figuresSource?.trim() || !d.figuresAsOf)) {
    throw new Error("Add the source and the as-of date for the headline figures.");
  }
  return data;
};

export const ApplicationPages: CollectionConfig = {
  slug: "application-pages",
  labels: { singular: "Application page", plural: "Application pages" },
  admin: {
    useAsTitle: "title",
    group: "Marketplace",
    defaultColumns: ["title", "application", "_status"],
    description: "The page for each browse-by-application entry (754:14685).",
  },
  versions: { drafts: true, maxPerDoc: 30 },
  access: { read: publicOrEditor, create: canEdit, update: canEdit, delete: canDelete, readVersions: canEdit },
  hooks: {
    beforeValidate: [figuresNeedSource],
    beforeChange: [refuseSamplePublish],
  },
  fields: [
    {
      name: "application",
      type: "select",
      required: true,
      unique: true,
      index: true,
      options: APPLICATION_OPTIONS,
    },
    { name: "title", type: "text", required: true, admin: { description: "The page heading (H1)." } },
    { name: "intro", type: "textarea", required: true },
    {
      name: "figures",
      type: "array",
      maxRows: 4,
      admin: { description: "Up to four headline figures, for example 18 · refuelling stations tracked." },
      fields: [
        {
          type: "row",
          fields: [
            { name: "value", type: "text", required: true },
            { name: "label", type: "text", required: true },
          ],
        },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "figuresSource", type: "text", admin: { description: "Where the figures come from." } },
        { name: "figuresAsOf", type: "date", admin: { date: { pickerAppearance: "dayOnly" } } },
      ],
    },
    {
      name: "chain",
      type: "group",
      admin: { description: "What goes into it: blocks left to right, each opening its category." },
      fields: [
        { name: "title", type: "text" },
        { name: "note", type: "text" },
        {
          name: "steps",
          type: "array",
          maxRows: 8,
          fields: [
            {
              type: "row",
              fields: [
                { name: "label", type: "text", required: true },
                {
                  name: "category",
                  type: "text",
                  admin: { description: "The category's address word, for example compression-systems." },
                },
              ],
            },
            {
              name: "note",
              type: "text",
              admin: { description: "Shown instead of the category for a block with no category (H₂ supply)." },
            },
          ],
        },
      ],
    },
    {
      name: "topics",
      type: "relationship",
      relationTo: "topics",
      hasMany: true,
      admin: { description: "Schemes, tenders, events and news on these topics are listed on the page." },
    },
    { name: "guide", type: "relationship", relationTo: "guides", admin: { description: "The buyer's guide card." } },
    {
      name: "cta",
      type: "group",
      fields: [
        { name: "title", type: "text", admin: { description: "For example Planning a station?" } },
        { name: "text", type: "textarea" },
      ],
    },
    { name: "sample", type: "checkbox", admin: { position: "sidebar", description: "Sample content (F9)." } },
  ],
};
