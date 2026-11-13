import type { CollectionBeforeValidateHook, CollectionConfig, Field } from "payload";
import { canDelete, canEdit } from "../roles";
import { publicOrEditor, refuseSamplePublish } from "../sample";
import { slugFrom } from "../slug";

// The people and associations in the directory (step 6.6; people 756:12213 and 756:12711, associations 498:8).
// People (M24, open): until the founder and lawyer decide who may appear, only profiles an editor creates with a
// recorded consent document are shown. A person can't be published without it, and lists, search and maps read only
// people whose consent is recorded.

const sample: Field = {
  name: "sample",
  type: "checkbox",
  admin: { position: "sidebar", description: "Sample content (F9): never shown in production." },
};

const slug = (from: string): Field => ({
  name: "slug",
  type: "text",
  required: true,
  unique: true,
  index: true,
  hooks: { beforeValidate: [slugFrom(from)] },
  admin: { position: "sidebar" },
});

export const PERSON_EXPERTISE = [
  "Electrolysers",
  "Fuel cells",
  "Storage and compression",
  "Safety and approvals",
  "Policy and finance",
  "Research and testing",
] as const;
export const PERSON_AFFILIATION = ["Company", "Research institution", "Government or PSU", "Independent"] as const;
export const PERSON_AVAILABLE = ["Speaking", "Consulting", "Research collaboration"] as const;

/** M24 safe default: a published person must have a recorded consent document. */
const consentBeforePublishing: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  const d = {
    ...(originalDoc as Record<string, unknown> | undefined),
    ...(data as Record<string, unknown> | undefined),
  };
  if (
    d._status === "published" &&
    (!d.consentRecorded || !(typeof d.consentEvidence === "string" && d.consentEvidence.trim()))
  ) {
    throw new Error("Record the person's consent (where and when they agreed) before publishing their profile.");
  }
  return data;
};

export const People: CollectionConfig = {
  slug: "people",
  labels: { singular: "Person", plural: "People" },
  admin: {
    useAsTitle: "name",
    group: "Directory",
    defaultColumns: ["name", "role", "organisation", "consentRecorded", "_status"],
    description: "People in the directory (756:12213). Only people who agreed to be listed (M24).",
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: { read: publicOrEditor, create: canEdit, update: canEdit, delete: canDelete, readVersions: canEdit },
  hooks: { beforeValidate: [consentBeforePublishing], beforeChange: [refuseSamplePublish] },
  fields: [
    { name: "name", type: "text", required: true },
    slug("name"),
    {
      type: "row",
      fields: [
        { name: "role", type: "text", required: true, admin: { description: "For example CTO or Senior scientist." } },
        { name: "organisation", type: "text", admin: { description: "Leave empty for independents." } },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "city", type: "text" },
        { name: "state", type: "text" },
      ],
    },
    { name: "affiliation", type: "select", required: true, options: [...PERSON_AFFILIATION] },
    { name: "expertise", type: "select", hasMany: true, options: [...PERSON_EXPERTISE] },
    {
      name: "topics",
      type: "text",
      hasMany: true,
      admin: { description: "The chips on the card, for example PEM electrolysers, Plant sizing." },
    },
    { name: "availableFor", type: "select", hasMany: true, options: [...PERSON_AVAILABLE] },
    { name: "bio", type: "textarea" },
    {
      type: "collapsible",
      label: "Consent (M24)",
      fields: [
        { name: "consentRecorded", type: "checkbox", label: "This person agreed to be listed" },
        {
          name: "consentEvidence",
          type: "text",
          admin: { description: "Where and when they agreed, for example signed form 12 Nov 2026 (file in Drive: …)." },
        },
      ],
    },
    sample,
  ],
};

export const ASSOCIATION_KINDS = [
  { value: "industry", label: "Industry body", plural: "Industry bodies" },
  { value: "alliance", label: "Alliance", plural: "Alliances" },
  { value: "chamber", label: "Chamber", plural: "Chambers" },
  { value: "government", label: "Government body", plural: "Government bodies" },
] as const;

export const Associations: CollectionConfig = {
  slug: "associations",
  labels: { singular: "Association", plural: "Associations and bodies" },
  admin: {
    useAsTitle: "name",
    group: "Directory",
    defaultColumns: ["name", "kind", "city", "_status"],
    description: "Industry bodies, alliances, chambers and government bodies (498:8).",
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: { read: publicOrEditor, create: canEdit, update: canEdit, delete: canDelete, readVersions: canEdit },
  hooks: { beforeChange: [refuseSamplePublish] },
  fields: [
    { name: "name", type: "text", required: true },
    slug("name"),
    {
      type: "row",
      fields: [
        {
          name: "kind",
          type: "select",
          required: true,
          options: ASSOCIATION_KINDS.map((k) => ({ value: k.value, label: k.label })),
        },
        { name: "city", type: "text" },
      ],
    },
    { name: "summary", type: "textarea", required: true },
    { name: "memberCompanies", type: "number", min: 0, admin: { description: "As the body states it, if it does." } },
    { name: "website", type: "text", required: true },
    sample,
  ],
};
