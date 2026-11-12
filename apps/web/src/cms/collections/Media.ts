import type { CollectionConfig } from "payload";
import { canDelete, canEdit } from "../roles";

// Images for articles and records (step 4.1). Alt text is required: media without it can't be saved. Stored in the
// public bucket under cms/ and served from the storage domain. SVG isn't accepted (it can carry script).
export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Image", plural: "Media" },
  admin: { useAsTitle: "alt", group: "Content", defaultColumns: ["filename", "alt", "credit"] },
  access: { read: () => true, create: canEdit, update: canEdit, delete: canDelete },
  upload: {
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    imageSizes: [
      { name: "thumb", width: 320, formatOptions: { format: "webp", options: { quality: 80 } } },
      { name: "card", width: 640, formatOptions: { format: "webp", options: { quality: 80 } } },
      { name: "hero", width: 1280, formatOptions: { format: "webp", options: { quality: 82 } } },
    ],
    adminThumbnail: "thumb",
    focalPoint: true,
  },
  fields: [
    {
      name: "alt",
      label: "Alt text",
      type: "text",
      required: true,
      admin: { description: "What the image shows, for people who can't see it." },
      validate: (value: string | null | undefined) =>
        typeof value === "string" && value.trim().length > 0 ? true : "Add alt text: describe what the image shows.",
    },
    { name: "caption", type: "text" },
    { name: "credit", type: "text", admin: { description: "Photographer or source, shown under the image." } },
  ],
};
