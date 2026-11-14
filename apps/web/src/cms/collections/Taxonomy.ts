import type { CollectionConfig } from "payload";
import { slugFrom } from "../slug";
import { canDelete, canEdit } from "../roles";
import { newsroomHooks, topicSlugFree } from "../newsroom";

// Topics (the newsroom's sections, 430:1952) and free tags (639:8).
export const Topics: CollectionConfig = {
  slug: "topics",
  admin: { useAsTitle: "name", group: "Content" },
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
      validate: topicSlugFree,
      admin: { description: "The section's address, /news/<slug>. Don't change it once published." },
    },
    { name: "description", type: "textarea", maxLength: 300 },
    {
      name: "order",
      type: "number",
      admin: { description: "Where the section sits in the news tabs and on the news home (428:473); lowest first." },
    },
  ],
};

export const Tags: CollectionConfig = {
  slug: "tags",
  admin: { useAsTitle: "name", group: "Content" },
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
  ],
};
