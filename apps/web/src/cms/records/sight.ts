import type { GlobalConfig } from "payload";
import { canEdit } from "../roles";

// The SIGHT programme tracker (418:2079, step 5.4): headline figures, every round SECI has run and the awardees. Kept by
// editors from SECI and MNRE documents; every figure carries its source. Open and upcoming rounds come from the tenders
// linked to the SIGHT schemes.

export const SIGHT_STATUSES = ["Closing soon", "Open", "Announced", "Results declared", "Upcoming"] as const;

export const SightTracker: GlobalConfig = {
  slug: "sight-tracker",
  label: "SIGHT tracker",
  admin: { group: "Records", description: "The SIGHT programme tracker page. Figures need their source." },
  access: { read: () => true, update: canEdit },
  versions: { max: 50 },
  fields: [
    { name: "intro", type: "textarea", required: true },
    {
      type: "row",
      fields: [
        { name: "verifiedAt", label: "Last verified", type: "date", admin: { date: { pickerAppearance: "dayOnly" } } },
        { name: "sourcesLine", label: "Sources", type: "text", admin: { description: "For example SECI, MNRE." } },
      ],
    },
    {
      name: "figures",
      type: "array",
      maxRows: 4,
      fields: [
        {
          type: "row",
          fields: [
            { name: "value", type: "text", required: true, admin: { description: "As readers see it: 8.62 lakh" } },
            { name: "label", type: "text", required: true },
          ],
        },
        { name: "source", type: "text", required: true },
      ],
    },
    {
      name: "rounds",
      label: "All rounds",
      type: "array",
      admin: { description: "Newest first, as on the page." },
      fields: [
        {
          type: "row",
          fields: [
            { name: "component", type: "text", required: true, admin: { description: "II · Production" } },
            { name: "mode", type: "text" },
            { name: "tranche", type: "text" },
            { name: "product", type: "text", required: true },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "offered", type: "text" },
            { name: "awarded", type: "text" },
            { name: "bidDue", label: "Bid due", type: "text" },
            { name: "result", type: "text" },
          ],
        },
        { name: "status", type: "select", required: true, options: [...SIGHT_STATUSES] },
      ],
    },
    {
      name: "awardees",
      type: "array",
      fields: [
        {
          type: "row",
          fields: [
            { name: "company", type: "text", required: true },
            { name: "round", type: "text", required: true },
            {
              name: "group",
              type: "select",
              options: ["Electrolysers", "Green hydrogen", "Green ammonia", "Green methanol"],
            },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "capacity", type: "text" },
            { name: "priceOrIncentive", label: "Price or incentive", type: "text" },
            {
              name: "profileSlug",
              label: "Company profile",
              type: "text",
              admin: { description: "The company's H2 Economy profile slug, if it has one." },
            },
          ],
        },
      ],
    },
    {
      name: "sources",
      label: "Official sources",
      type: "array",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "url", type: "text", required: true },
      ],
    },
    {
      name: "sample",
      type: "checkbox",
      admin: { position: "sidebar", description: "Sample figures (F9): hidden where sample content is off." },
    },
  ],
};
