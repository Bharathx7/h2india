import type { CollectionConfig } from "payload";
import { slugFrom } from "../slug";
import { newsroomHooks } from "../newsroom";
import { canDelete, canEdit } from "../roles";

// Authors (444:5431 staff, 444:5946 external contributor). Press releases are credited to the issuing organisation.
export const Authors: CollectionConfig = {
  slug: "authors",
  admin: { useAsTitle: "name", group: "People", defaultColumns: ["name", "kind", "title", "organisation"] },
  access: { read: () => true, create: canEdit, update: canEdit, delete: canDelete },
  hooks: newsroomHooks,
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      hooks: { beforeValidate: [slugFrom("name")] },
    },
    {
      name: "kind",
      type: "select",
      required: true,
      defaultValue: "staff",
      options: [
        { label: "Staff", value: "staff" },
        { label: "Contributor", value: "contributor" },
        { label: "Organisation", value: "organisation" },
      ],
    },
    { name: "title", type: "text", admin: { description: "For example Editor-in-chief, or Plant manager." } },
    { name: "organisation", type: "text", admin: { description: "A contributor's company." } },
    { name: "bio", type: "textarea", maxLength: 600 },
    { name: "photo", type: "upload", relationTo: "media" },
    {
      name: "links",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "url", type: "text", required: true },
      ],
    },
  ],
};
