import type { CollectionConfig } from "payload";
import { canDelete, canEdit } from "../roles";
import { scanUpload } from "../scan";

// Video and audio files hosted by H2 Economy (A176, the M9 stand-in until a video host is chosen). Stored in the public
// bucket under cms/av and virus-checked like every CMS upload. Copy a file's address into a video's or podcast's
// address: the media adapter plays it in the browser's own player, with no third-party script (@h2india/core/media).
export const MediaFiles: CollectionConfig = {
  slug: "media-files",
  labels: { singular: "Video or audio file", plural: "Video and audio files" },
  admin: {
    useAsTitle: "title",
    group: "Content",
    defaultColumns: ["title", "filename", "mimeType"],
    description: "MP4, WebM, MP3 or M4A. After uploading, copy the file's address into the video or podcast.",
  },
  access: { read: () => true, create: canEdit, update: canEdit, delete: canDelete },
  hooks: { beforeOperation: [scanUpload] },
  upload: { mimeTypes: ["video/mp4", "video/webm", "audio/mpeg", "audio/mp4", "audio/x-m4a"] },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "transcript",
      type: "textarea",
      admin: { description: "Optional. Shown under the player for people who can't listen or watch." },
    },
  ],
};
