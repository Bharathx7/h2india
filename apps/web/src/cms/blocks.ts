import type { Block } from "payload";
import { youtubeId } from "../lib/youtube";

// Article components from Figma page 02 that live inside the body (step 4.1): Key numbers box and Key facts box.
// Glossary hover-cards are automatic: terms from the glossary are linked when the article is shown (step 4.4).

export const KeyNumbers: Block = {
  slug: "keyNumbers",
  labels: { singular: "Key numbers", plural: "Key numbers" },
  fields: [
    { name: "heading", type: "text", defaultValue: "Key numbers" },
    {
      name: "items",
      type: "array",
      minRows: 1,
      maxRows: 4,
      required: true,
      fields: [
        { name: "value", type: "text", required: true, admin: { description: "For example 4,100 h or ₹38 lakh." } },
        { name: "label", type: "text", required: true },
      ],
    },
    { name: "source", type: "text", admin: { description: "Where the numbers come from." } },
  ],
};

/** Key facts box (434:2844): label and value pairs, for example ISSUER · SECI for MNRE. */
export const KeyFacts: Block = {
  slug: "keyFacts",
  labels: { singular: "Key facts", plural: "Key facts" },
  fields: [
    { name: "heading", type: "text", defaultValue: "Key facts" },
    {
      name: "items",
      type: "array",
      minRows: 1,
      maxRows: 8,
      required: true,
      fields: [
        { name: "label", type: "text", required: true, admin: { description: "For example Issuer, Bid due." } },
        { name: "value", type: "text", required: true },
      ],
    },
  ],
};

/** A YouTube video inside the body (founder, 19 Nov 2026, A196). Played from youtube-nocookie.com only. */
export const YouTube: Block = {
  slug: "youtube",
  labels: { singular: "YouTube video", plural: "YouTube videos" },
  fields: [
    {
      name: "url",
      label: "YouTube link",
      type: "text",
      required: true,
      admin: { description: "For example https://www.youtube.com/watch?v=… or https://youtu.be/…" },
      validate: (value: string | null | undefined) =>
        value && youtubeId(value) ? true : "Paste a link to a YouTube video.",
    },
    { name: "title", type: "text", required: true, admin: { description: "What the video is, for screen readers." } },
    { name: "caption", type: "text" },
  ],
};
