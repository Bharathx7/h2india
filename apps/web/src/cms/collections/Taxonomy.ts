import type { CollectionConfig } from "payload";
import { slugFrom } from "../slug";
import { canDelete, canEdit } from "../roles";

// Topics (the newsroom's sections, 430:1952) and free tags (639:8).
export const Topics: CollectionConfig = {
  slug: "topics",
  admin: { useAsTitle: "name", group: "Content" },
  access: { read: () => true, create: canEdit, update: canEdit, delete: canDelete },
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
    { name: "description", type: "textarea", maxLength: 300 },
  ],
};

export const Tags: CollectionConfig = {
  slug: "tags",
  admin: { useAsTitle: "name", group: "Content" },
  access: { read: () => true, create: canEdit, update: canEdit, delete: canDelete },
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
  ],
};
