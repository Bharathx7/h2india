import type { Block } from "payload";

// Article components from Figma page 02 that live inside the body (step 4.1): Key numbers box and Key facts box.
// Glossary hover-cards are added with the glossary in step 4.4.

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
      fields: [{ name: "fact", type: "text", required: true }],
    },
  ],
};
