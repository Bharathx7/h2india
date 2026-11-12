import type { CollectionConfig } from "payload";
import { canEdit, canView } from "../roles";

// The Corrections queue (step 4.2; Corrections policy 521:754; Suggest a correction 504:455 in step 5.7). An editor's
// correction adds a dated note to the article and a resolved entry here; a reader's suggestion arrives open.
export const Corrections: CollectionConfig = {
  slug: "corrections",
  admin: { useAsTitle: "description", group: "Content", defaultColumns: ["article", "status", "source", "createdAt"] },
  access: { read: canView, create: canEdit, update: canEdit, delete: () => false },
  fields: [
    { name: "article", type: "relationship", relationTo: "articles", required: true },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "Open",
      options: ["Open", "Resolved", "Rejected"],
    },
    { name: "source", type: "select", required: true, defaultValue: "reader", options: ["reader", "editor"] },
    { name: "description", type: "textarea", required: true, maxLength: 2000 },
    {
      name: "reporterEmail",
      type: "email",
      admin: { condition: (d) => (d as { source?: string }).source === "reader" },
    },
    { name: "resolution", type: "textarea" },
    { name: "resolvedAt", type: "date", admin: { date: { pickerAppearance: "dayAndTime" } } },
  ],
};
