import { audit, getDb } from "@h2india/core";
import { PRODUCT_CLASSES } from "@h2india/core/catalogue";
import type { CollectionConfig, GlobalAfterChangeHook, GlobalConfig } from "payload";
import { canDelete, canEdit, has } from "../roles";

// Home page and pre-launch content (step 5.1).
// - Home figures (A45): editors enter each headline figure with its source and as-of date; counts we hold ourselves
//   (open tenders, verified listings) are counted live by the page.
// - Pre-launch (A44, A48): the Coming soon launch line and the allow-list of people who see the real site. Super admin
//   only (settings.edit); every change is versioned and audited.
// - Early listing requests (A47): the Coming soon supplier form. Personal data: read and export like report leads.

const dateOnly = { date: { pickerAppearance: "dayOnly" as const, displayFormat: "d MMM yyyy" } };

const sourced = (description: string) => [
  {
    type: "row" as const,
    fields: [
      {
        name: "source",
        type: "text" as const,
        required: true,
        admin: { description, width: "50%" },
      },
      { name: "asOf", label: "As of", type: "date" as const, required: true, admin: { ...dateOnly, width: "50%" } },
    ],
  },
];

const bars = (name: string, label: string, valueDescription: string) => ({
  name,
  label,
  type: "array" as const,
  maxRows: 4,
  admin: { description: "One bar per tranche, in order. The total is added up for you." },
  fields: [
    {
      type: "row" as const,
      fields: [
        {
          name: "label",
          type: "text" as const,
          required: true,
          admin: { description: "For example Tranche I · awarded Jan 2024.", width: "60%" },
        },
        {
          name: "value",
          type: "number" as const,
          required: true,
          min: 0,
          admin: { description: valueDescription, width: "40%" },
        },
      ],
    },
  ],
});

export const HomeFigures: GlobalConfig = {
  slug: "home-figures",
  label: "Home figures",
  admin: {
    group: "Home",
    description:
      "The figures on the home page. Every figure needs its source and the date it was true; readers see both.",
  },
  access: { read: () => true, update: canEdit },
  versions: { max: 50 },
  fields: [
    {
      name: "figures",
      label: "India's hydrogen sector, live",
      type: "array",
      maxRows: 3,
      admin: {
        description:
          "Up to three figures. Open tenders are counted live and added after these; verified listings join in Stage 6.",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "value",
              type: "text",
              required: true,
              admin: { description: "As readers see it, for example 8.62 or ~8,000.", width: "30%" },
            },
            {
              name: "label",
              type: "text",
              required: true,
              admin: { description: "For example lakh tonnes a year of green H₂ awarded under SIGHT.", width: "70%" },
            },
          ],
        },
        ...sourced("For example SECI or MNRE."),
      ],
    },
    {
      name: "sight",
      label: "What SIGHT has awarded so far",
      type: "group",
      fields: [
        bars("production", "Green hydrogen production (lakh t a year)", "Lakh tonnes a year, for example 4.12."),
        bars("manufacturing", "Electrolyser manufacturing (MW a year)", "MW a year, for example 1500."),
        {
          name: "source",
          type: "text",
          admin: { description: "The source line, for example SECI award results under the SIGHT programme." },
        },
        { name: "asOf", label: "As of", type: "date", admin: dateOnly },
      ],
    },
    {
      name: "sample",
      type: "checkbox",
      admin: {
        position: "sidebar",
        description: "Sample figures (F9): shown only where sample content is switched on, never in production.",
      },
    },
  ],
};

const auditGlobal =
  (slug: string): GlobalAfterChangeHook =>
  async ({ doc, previousDoc, req }) => {
    const strip = (d: Record<string, unknown> | undefined) =>
      d
        ? Object.fromEntries(
            Object.entries(d).filter(([k]) => !["updatedAt", "createdAt", "globalType", "id"].includes(k)),
          )
        : null;
    await audit(getDb(), {
      actorId: (req.user as { h2UserId?: string } | null)?.h2UserId ?? null,
      action: "setting.change",
      resourceType: "setting",
      resourceId: slug,
      before: strip(previousDoc as Record<string, unknown> | undefined),
      after: strip(doc as Record<string, unknown>),
    });
    return doc as unknown;
  };

export const LAUNCH_LINE = "Launching early 2027 · built for India's hydrogen economy";

export const Prelaunch: GlobalConfig = {
  slug: "prelaunch",
  label: "Pre-launch",
  admin: {
    group: "Settings",
    description:
      "While the Coming soon flag is on, visitors see the pre-launch page. Signed-in operators and the emails below see the real site.",
    hidden: ({ user }) => !(user as { permissions?: string[] } | null)?.permissions?.includes("settings.edit"),
  },
  access: {
    read: ({ req }) => has(req, "settings.edit"),
    update: ({ req }) => has(req, "settings.edit"),
  },
  versions: { max: 50 },
  hooks: { afterChange: [auditGlobal("prelaunch")] },
  fields: [
    {
      name: "launchLine",
      label: "Launch line",
      type: "text",
      required: true,
      defaultValue: LAUNCH_LINE,
      admin: { description: "Top right of the Coming soon page (743:6880)." },
    },
    {
      name: "allowList",
      label: "Who else sees the real site",
      type: "array",
      admin: { description: "People who sign in with one of these emails skip the Coming soon page." },
      fields: [
        {
          type: "row",
          fields: [
            { name: "email", type: "email", required: true, admin: { width: "50%" } },
            { name: "note", type: "text", admin: { description: "Who and why.", width: "50%" } },
          ],
        },
      ],
    },
  ],
};

export const EARLY_LISTING_CONSENT =
  "H2 Economy may use these details to contact you about setting up your company profile before launch.";

export const EarlyListings: CollectionConfig = {
  slug: "early-listings",
  labels: { singular: "Early listing request", plural: "Early listing requests" },
  admin: {
    useAsTitle: "company",
    group: "Home",
    defaultColumns: ["company", "name", "email", "sells", "createdAt"],
    description: "Suppliers who asked to be listed before launch (the Coming soon page).",
    hidden: ({ user }) => !(user as { permissions?: string[] } | null)?.permissions?.includes("content.export"),
  },
  access: {
    read: ({ req }) => has(req, "content.export"),
    create: () => false,
    update: canEdit,
    delete: canDelete,
  },
  fields: [
    { name: "company", type: "text", required: true },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "email", label: "Work email", type: "email", required: true },
    { name: "mobile", type: "text", required: true },
    {
      name: "sells",
      label: "What they sell",
      type: "select",
      required: true,
      options: PRODUCT_CLASSES.map((c) => ({ label: c.label, value: c.id })),
    },
    {
      name: "consentText",
      type: "text",
      admin: { readOnly: true, description: "The words they agreed to, as shown." },
    },
    {
      name: "status",
      type: "select",
      defaultValue: "New",
      options: ["New", "Contacted", "Listed", "Not a fit"],
      admin: { position: "sidebar" },
    },
  ],
};
