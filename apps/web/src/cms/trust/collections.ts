import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
  type Field,
  type GlobalConfig,
} from "payload";
import { canDelete, canEdit, canPublish } from "../roles";
import { publicOrEditor, refuseSamplePublish } from "../sample";
import { slugFrom } from "../slug";

// Company, trust, legal and help content (step 5.8, Figma page 12). The company's legal details, the grievance
// officer and the final legal texts are decision M2 (founder and lawyer): until they're entered, pages show the
// bracketed placeholders the design uses ("[Registered office address]") and legal pages say the text is being
// finalised. Prices on the Pricing page are C1, C3 and M16: entered here by an editor, never written in code.

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

const day = { date: { pickerAppearance: "dayOnly" as const, displayFormat: "d MMM yyyy" } };

/** A figure readers see with its source and date (A45): "1,86,400 · monthly visitors · Oct 2026 · site analytics". */
const figures = (name: string, label: string, description: string): Field => ({
  name,
  label,
  type: "array",
  maxRows: 6,
  admin: { description },
  fields: [
    {
      type: "row",
      fields: [
        { name: "value", type: "text", required: true },
        { name: "label", type: "text", required: true },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "source", type: "text", required: true },
        { name: "asOf", label: "As of", type: "text", required: true, admin: { description: "Oct 2026, 31 Oct 2026" } },
      ],
    },
  ],
});

const faqs = (name: string, label: string): Field => ({
  name,
  label,
  type: "array",
  maxRows: 12,
  fields: [
    { name: "question", type: "text", required: true },
    { name: "answer", type: "textarea", required: true },
  ],
});

/** Legal texts are approved by an Editor-in-chief (they publish; editors draft), like editorial pieces (A32). */
const publishByChief: CollectionBeforeChangeHook = ({ data, req }) => {
  if ((data as { _status?: string })._status === "published" && req.user && !canPublish(req)) {
    throw new APIError("Only an Editor-in-chief can publish. Ask them to review it.", 403, null, true);
  }
  return data;
};

// ------------------------------------------------------------------------------------------ settings

export const TrustSettings: GlobalConfig = {
  slug: "trust-settings",
  label: "Company and legal details",
  admin: {
    group: "Company",
    description:
      "Who runs H2 India, the registered office and the grievance officer (M2), and the figures on About, Advertise and the Media kit. Empty fields show as [placeholders].",
  },
  access: { read: () => true, update: canEdit },
  versions: { max: 50 },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "operatingCompany",
          type: "text",
          admin: { description: "The legal name, for example Example Ventures Private Limited (M2)." },
        },
        { name: "gstin", label: "GSTIN", type: "text" },
      ],
    },
    { name: "registeredOffice", type: "textarea" },
    {
      name: "officeHours",
      type: "text",
      defaultValue: "Monday to Friday, 9:30 am to 6:00 pm IST. Visits by appointment only.",
    },
    {
      name: "disclosure",
      type: "textarea",
      admin: {
        description:
          "Who runs H2 India (66:4251), after the company name: for example whether any company in the group sells hydrogen products. Shown with the date below.",
      },
    },
    { name: "disclosureDate", type: "date", admin: day },
    {
      name: "grievanceOfficer",
      type: "group",
      fields: [
        {
          type: "row",
          fields: [
            { name: "name", type: "text" },
            { name: "designation", type: "text", defaultValue: "Grievance Officer, H2 India" },
            { name: "email", type: "email" },
          ],
        },
      ],
    },
    {
      name: "partnerships",
      label: "Partnerships and press contact",
      type: "group",
      admin: { description: "Named on Partner with H2 India (742:8) and the Media kit (741:6058)." },
      fields: [
        {
          type: "row",
          fields: [
            { name: "name", type: "text" },
            { name: "role", type: "text", defaultValue: "Head of Partnerships" },
          ],
        },
      ],
    },
    {
      name: "boilerplate",
      type: "textarea",
      defaultValue:
        "H2 India is India's hydrogen ecosystem platform. It brings products and companies, Indian hydrogen news, schemes, tenders, events and data into one place for the people building India's hydrogen economy.",
    },
    {
      name: "mediaKitUrl",
      label: "Media kit PDF link",
      type: "text",
      admin: { description: "The Download media kit (PDF) buttons are hidden until this is set." },
    },
    figures(
      "aboutFigures",
      "About: Why now figures",
      "The four tiles on About (66:4251), each with its source and date.",
    ),
    figures(
      "audience",
      "Audience figures",
      "Our audience (741:5605) and Audience at a glance (741:6058): from our own analytics and lists, never rounded up.",
    ),
    { ...sample, admin: { description: "Sample figures and names (F9): never shown in production." } },
  ],
};

// ------------------------------------------------------------------------------------------ legal pages

export const LEGAL_PAGES = [
  { value: "terms", label: "Terms of use", href: "/legal/terms" },
  { value: "privacy", label: "Privacy policy", href: "/legal/privacy" },
  { value: "cookies", label: "Cookie policy", href: "/legal/cookies" },
  { value: "editorial-policy", label: "Editorial policy", href: "/legal/editorial-policy" },
  { value: "corrections", label: "Corrections policy", href: "/legal/corrections" },
  { value: "sponsored-content", label: "Sponsored content policy", href: "/legal/sponsored-content" },
] as const;

export const LegalPages: CollectionConfig = {
  slug: "legal-pages",
  labels: { singular: "Legal page", plural: "Legal pages" },
  admin: {
    useAsTitle: "title",
    group: "Company",
    defaultColumns: ["title", "version", "effectiveOn", "_status"],
    description:
      "Terms, privacy, cookies, editorial, corrections and sponsored content (66:5004, 521:305…). Final texts come from our lawyers (M2). Each published change adds a version history row.",
  },
  versions: { drafts: true, maxPerDoc: 100 },
  access: { read: publicOrEditor, create: canEdit, update: canEdit, delete: canDelete, readVersions: canEdit },
  hooks: { beforeChange: [publishByChief, refuseSamplePublish] },
  fields: [
    {
      name: "slug",
      label: "Page",
      type: "select",
      required: true,
      unique: true,
      index: true,
      options: LEGAL_PAGES.map((p) => ({ label: p.label, value: p.value })),
    },
    { name: "title", type: "text", required: true },
    {
      type: "row",
      fields: [
        {
          name: "version",
          type: "text",
          required: true,
          admin: { description: "For example 1.1. People who accept the terms are recorded against this." },
        },
        { name: "effectiveOn", label: "Last updated", type: "date", required: true, admin: day },
      ],
    },
    {
      name: "sections",
      type: "array",
      minRows: 1,
      admin: { description: "Numbered in order; the Contents list is made from the headings." },
      fields: [
        { name: "heading", type: "text", required: true },
        { name: "body", type: "textarea" },
      ],
    },
    {
      name: "history",
      label: "Version history",
      type: "array",
      admin: { description: "Newest first: version, date and what changed." },
      fields: [
        {
          type: "row",
          fields: [
            { name: "version", type: "text", required: true },
            { name: "date", type: "date", required: true, admin: day },
            { name: "changed", label: "What changed", type: "text", required: true },
          ],
        },
      ],
    },
    sample,
  ],
};

// ------------------------------------------------------------------------------------------ help centre

export const HELP_CATEGORIES = [
  { value: "getting-started", label: "Getting started", icon: "info" },
  { value: "buying", label: "Buying", icon: "shopping-cart" },
  { value: "selling", label: "Selling", icon: "package" },
  { value: "payments", label: "Payments & invoices", icon: "file-text" },
  { value: "verification", label: "Verification", icon: "shield-check" },
  { value: "alerts", label: "Alerts & newsletter", icon: "mail" },
  { value: "account", label: "Account & security", icon: "lock" },
] as const;

export const HelpArticles: CollectionConfig = {
  slug: "help-articles",
  labels: { singular: "Help article", plural: "Help centre" },
  admin: {
    useAsTitle: "title",
    group: "Company",
    defaultColumns: ["title", "category", "popular", "_status"],
    description: "Help centre articles (96:1942, 278:23978).",
  },
  versions: { drafts: true, maxPerDoc: 30 },
  access: { read: publicOrEditor, create: canEdit, update: canEdit, delete: canDelete, readVersions: canEdit },
  hooks: { beforeChange: [refuseSamplePublish] },
  defaultSort: "title",
  fields: [
    { name: "title", type: "text", required: true },
    slug("title"),
    {
      type: "row",
      fields: [
        {
          name: "category",
          type: "select",
          required: true,
          index: true,
          options: HELP_CATEGORIES.map((c) => ({ label: c.label, value: c.value })),
        },
        { name: "readMinutes", type: "number", min: 1, max: 30, defaultValue: 2 },
        {
          name: "popular",
          type: "number",
          min: 1,
          max: 6,
          admin: { description: "1 to 6 puts it in Popular articles, in that order." },
        },
        {
          name: "featured",
          type: "number",
          min: 1,
          max: 3,
          admin: { description: "1 to 3 lists it on its category card." },
        },
      ],
    },
    { name: "intro", type: "textarea", required: true },
    {
      name: "sections",
      type: "array",
      fields: [
        { name: "heading", type: "text", required: true },
        { name: "steps", type: "array", fields: [{ name: "text", type: "textarea", required: true }] },
        { name: "text", type: "textarea", admin: { description: "A paragraph instead of, or after, the steps." } },
      ],
    },
    {
      name: "callout",
      type: "group",
      admin: { description: "The grey box, for example What each role can do." },
      fields: [
        { name: "title", type: "text" },
        { name: "text", type: "textarea" },
      ],
    },
    { name: "related", type: "relationship", relationTo: "help-articles", hasMany: true, maxRows: 4 },
    {
      name: "keywords",
      type: "text",
      hasMany: true,
      admin: { description: "Other words people search for, for example GST invoice, NEFT." },
    },
    sample,
  ],
};

// ------------------------------------------------------------------------------------------ team

export const TeamMembers: CollectionConfig = {
  slug: "team-members",
  labels: { singular: "Team member", plural: "Team and advisors" },
  admin: {
    useAsTitle: "name",
    group: "Company",
    defaultColumns: ["order", "name", "role", "group", "_status"],
    description: "Management team and advisors (66:3923). Only people who agreed to be shown.",
  },
  versions: { drafts: true, maxPerDoc: 10 },
  access: { read: publicOrEditor, create: canEdit, update: canEdit, delete: canDelete, readVersions: canEdit },
  hooks: { beforeChange: [refuseSamplePublish] },
  defaultSort: "order",
  fields: [
    {
      type: "row",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "role", type: "text", required: true },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "group",
          type: "select",
          required: true,
          defaultValue: "Management",
          options: ["Management", "Advisors"],
        },
        { name: "order", type: "number", required: true, defaultValue: 10 },
        { name: "linkedin", label: "LinkedIn link", type: "text" },
      ],
    },
    {
      name: "founder",
      type: "checkbox",
      admin: { description: "Shown as Founder on the Media kit (741:6058)." },
    },
    { name: "bio", type: "textarea", admin: { description: "One line for the Media kit." } },
    sample,
  ],
};

// ------------------------------------------------------------------------------------------ pricing

export const Pricing: GlobalConfig = {
  slug: "pricing",
  label: "Pricing",
  admin: {
    group: "Company",
    description:
      "The Pricing page (512:148). Prices, the launch offer and the rate card version are decisions C1, C3 and M16: enter them only when confirmed. Sections without prices say they're being finalised.",
  },
  access: { read: () => true, update: canEdit },
  versions: { max: 50 },
  fields: [
    {
      name: "rateCardNote",
      type: "text",
      admin: { description: "Rate card version 1.0 · effective 1 December 2026 · all prices exclude GST" },
    },
    {
      name: "plans",
      type: "array",
      maxRows: 3,
      fields: [
        {
          type: "row",
          fields: [
            { name: "name", type: "text", required: true, admin: { description: "Free listing, Growth…" } },
            { name: "price", type: "text", required: true, admin: { description: "₹0, ₹4,999, Custom" } },
            { name: "period", type: "text", admin: { description: "always, a month, yearly contract" } },
          ],
        },
        { name: "summary", type: "text", required: true },
        { name: "features", type: "array", fields: [{ name: "text", type: "text", required: true }] },
        {
          type: "row",
          fields: [
            { name: "cta", label: "Button", type: "text", required: true },
            { name: "href", label: "Button link", type: "text", required: true },
            { name: "highlight", type: "checkbox" },
          ],
        },
      ],
    },
    {
      name: "commission",
      type: "group",
      fields: [
        {
          type: "row",
          fields: [
            { name: "launchValue", type: "text", admin: { description: "₹0" } },
            { name: "launchNote", type: "text", admin: { description: "until 30 June 2027 (C1)" } },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "afterValue", type: "text", admin: { description: "3%" } },
            { name: "afterNote", type: "text", admin: { description: "of each order paid through H2 India" } },
          ],
        },
        { name: "afterDetail", type: "text", admin: { description: "Capped at … per order. GST is added…" } },
        {
          name: "examples",
          type: "array",
          fields: [
            {
              type: "row",
              fields: [
                { name: "order", type: "text", required: true },
                { name: "commission", type: "text", required: true },
              ],
            },
          ],
        },
        { name: "footnote", type: "textarea" },
      ],
    },
    {
      name: "addOns",
      type: "array",
      maxRows: 6,
      fields: [
        {
          type: "row",
          fields: [
            { name: "name", type: "text", required: true },
            { name: "price", type: "text", required: true, admin: { description: "from ₹40,000" } },
            { name: "unit", type: "text", admin: { description: "a year" } },
          ],
        },
        { name: "text", type: "text", required: true },
      ],
    },
    faqs("faqs", "Pricing questions"),
    { ...sample, admin: { description: "Sample prices (F9): never shown in production." } },
  ],
};

/** The questions on For Buyers (93:906) and For Suppliers (93:1331). */
export const AudienceFaqs: GlobalConfig = {
  slug: "audience-faqs",
  label: "For Buyers and Suppliers questions",
  admin: { group: "Company" },
  access: { read: () => true, update: canEdit },
  versions: { max: 20 },
  fields: [faqs("buyers", "Questions buyers ask"), faqs("suppliers", "Questions suppliers ask")],
};
