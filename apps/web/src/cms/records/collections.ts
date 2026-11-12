import type { CollectionConfig, Field } from "payload";
import { canEdit, canView } from "../roles";
import { istDate, recordCollection, slugField, sourceFields, statesField, topicsField } from "./common";
import { EXPERIENCE, JOB_FUNCTIONS, JOB_TYPES, WORK_MODES } from "@h2india/core/opportunities/rules";
import {
  eventStatus,
  GRANT_STATUS_OVERRIDES,
  grantStatus,
  jobStatus,
  SCHEME_STATUS_OVERRIDES,
  schemeStatus,
  tenderStatus,
} from "./status";
import { BENEFIT_TYPES, eligibilityRulesField } from "./eligibility";
import { GRANT_APPLICANTS, GRANT_THEMES, ISSUER_TYPES, TENDER_CATEGORIES, VALUE_BANDS } from "./opportunities";

// The five record types (step 4.3, A31) with fields from the admin editors (640:8 Scheme, 640:773 Tender, 643:8 Grant,
// 643:778 Event, 645:8 Job) and the public pages (416:1354, 457:3222, 459:3621, 463:5337, 465:6591, 729:11207).

const APPLICANTS = [
  "Green hydrogen producers",
  "Electrolyser manufacturers",
  "Project developers",
  "Research institutions",
  "Start-ups",
  "Manufacturers",
  "State agencies",
];

const list = (name: string, label: string, item = "text"): Field => ({
  name,
  label,
  type: "array",
  fields: [{ name: item, type: "text", required: true }],
});

const s = (doc: Record<string, unknown>, key: string) => doc[key] as string | null | undefined;

export const Schemes: CollectionConfig = recordCollection({
  slug: "schemes",
  labels: { singular: "Scheme", plural: "Schemes" },
  titleField: "name",
  status: (d) => schemeStatus({ nextDeadline: s(d, "nextDeadline"), override: s(d, "statusOverride") }),
  fields: [
    { name: "name", label: "Scheme name", type: "text", required: true },
    slugField("name"),
    {
      type: "row",
      fields: [
        {
          name: "runBy",
          label: "Run by",
          type: "text",
          required: true,
          admin: { description: "For example SECI, for MNRE." },
        },
        { name: "ministry", type: "text" },
      ],
    },
    { name: "whoCanApply", label: "Who can apply", type: "select", hasMany: true, options: APPLICANTS },
    statesField,
    istDate("nextDeadline", "Next deadline"),
    {
      name: "deadlineNote",
      type: "text",
      admin: { description: "When there's no single date, for example “Opens with each tranche”." },
    },
    {
      name: "statusOverride",
      label: "Scheme status",
      type: "select",
      options: [...SCHEME_STATUS_OVERRIDES],
      admin: { description: "Leave empty: Open or Closing soon come from the deadline." },
    },
    {
      type: "row",
      fields: [
        { name: "outlay", type: "text", admin: { description: "For example ₹13,050 crore for Component II." } },
        { name: "benefitTypes", label: "Benefit type", type: "select", hasMany: true, options: BENEFIT_TYPES },
      ],
    },
    {
      name: "howToApply",
      label: "How to apply",
      type: "textarea",
      admin: { description: "Shown in “At a glance” (416:1354). Applications always happen on the official portal." },
    },
    { name: "summary", label: "What applicants get", type: "textarea", required: true },
    { name: "purpose", type: "textarea" },
    {
      name: "tranches",
      label: "Modes and tranches",
      type: "array",
      fields: [
        { name: "mode", type: "text", required: true },
        { name: "tranche", type: "text" },
        { name: "product", type: "text" },
        { name: "capacity", type: "text" },
        { name: "state", type: "text", admin: { description: "For example Results declared, Closing soon." } },
        { name: "resultsUrl", label: "Results link", type: "text" },
      ],
    },
    list("eligibility", "Who can apply (conditions)", "condition"),
    { name: "benefits", type: "textarea" },
    {
      name: "benefitRates",
      label: "Benefit cards",
      type: "array",
      maxRows: 4,
      admin: { description: "The figures under Benefits (416:1354), for example Year 1 · ₹4 / kg." },
      fields: [
        { name: "label", type: "text", required: true },
        { name: "value", type: "text", required: true },
      ],
    },
    {
      name: "timeline",
      type: "array",
      fields: [
        { name: "when", type: "text", required: true },
        { name: "what", type: "text", required: true },
      ],
    },
    list("documentsNeeded", "Documents you'll need", "document"),
    {
      name: "faqs",
      label: "Questions",
      type: "array",
      fields: [
        { name: "question", type: "text", required: true },
        { name: "answer", type: "textarea", required: true },
      ],
    },
    ...sourceFields("Official page"),
    topicsField,
    eligibilityRulesField,
  ],
});

export const Tenders: CollectionConfig = recordCollection({
  slug: "tenders",
  labels: { singular: "Tender", plural: "Tenders" },
  titleField: "title",
  status: (d) =>
    tenderStatus({
      bidDueAt: s(d, "bidDueAt"),
      publishedAt: s(d, "publishedAt"),
      extendedFrom: s(d, "extendedFrom"),
      result: d.result as { declaredAt?: string | null } | null,
    }),
  fields: [
    { name: "title", type: "text", required: true },
    slugField("title"),
    {
      type: "row",
      fields: [
        { name: "issuer", type: "text", required: true },
        { name: "tenderId", label: "Tender ID", type: "text", required: true, index: true },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "issuerName",
          label: "Issuer's full name",
          type: "text",
          admin: { description: "For example Solar Energy Corporation of India." },
        },
        { name: "issuerType", label: "Issuer type", type: "select", options: [...ISSUER_TYPES] },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "mode", type: "text", admin: { description: "For example Open tender · two-bid system." } },
        { name: "category", type: "text", admin: { description: "For example Systems › Electrolysers." } },
      ],
    },
    {
      name: "sector",
      label: "Category (for the filters)",
      type: "select",
      options: [...TENDER_CATEGORIES],
      admin: { description: "The tenders list filters on this (455:1621)." },
    },
    statesField,
    {
      type: "row",
      fields: [
        { name: "value", type: "text", admin: { description: "Or “Not disclosed”." } },
        {
          name: "valueBand",
          label: "Value band",
          type: "select",
          options: [...VALUE_BANDS],
          admin: { description: "Leave empty when the value isn't published." },
        },
        { name: "emd", label: "EMD", type: "text" },
        { name: "documentFee", type: "text" },
      ],
    },
    {
      type: "row",
      fields: [
        istDate("publishedAt", "Published"),
        istDate("bidDueAt", "Bid due", true),
        {
          ...istDate("extendedFrom", "Bid due before the extension"),
          admin: {
            date: { pickerAppearance: "dayAndTime", displayFormat: "d MMM yyyy, h:mm a" },
            description: "Fill in when a corrigendum moves the bid due date: the tender shows as Extended.",
          },
        } as Field,
      ],
    },
    {
      name: "whoCanBid",
      label: "Who can bid (one line)",
      type: "text",
      admin: { description: "Key facts (457:3222), for example Green ammonia producers with plants in India." },
    },
    {
      name: "keyDates",
      label: "Other key dates",
      type: "array",
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
          admin: { description: "Pre-bid meeting, Technical bid opening…" },
        },
        { name: "at", type: "date", admin: { date: { pickerAppearance: "dayAndTime" } } },
        {
          name: "note",
          type: "text",
          admin: { description: "Instead of a date, or after it: “online”, “After technical evaluation”." },
        },
      ],
    },
    { name: "description", label: "What this tender is for", type: "textarea", required: true },
    {
      name: "schemes",
      label: "Under schemes",
      type: "relationship",
      relationTo: "schemes",
      hasMany: true,
      admin: { description: "Shows the tender on these schemes' pages and the SIGHT tracker (step 5.4)." },
    },
    list("eligibility", "Who can bid", "condition"),
    ...sourceFields("Tender portal link"),
    {
      name: "corrigenda",
      type: "array",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "date", type: "date", required: true },
        { name: "change", type: "text" },
      ],
    },
    {
      name: "result",
      label: "Result (when awarded)",
      type: "group",
      fields: [
        istDate("declaredAt", "Results declared"),
        {
          name: "dateLabel",
          label: "Result date as shown",
          type: "text",
          admin: { description: "When only the month or year is public, for example Aug 2025." },
        },
        {
          name: "winners",
          type: "array",
          fields: [
            { name: "name", type: "text", required: true },
            { name: "capacity", type: "text" },
            { name: "price", label: "Discovered price", type: "text" },
            { name: "place", type: "text", admin: { description: "For example Noida, Uttar Pradesh." } },
            { name: "about", type: "text", admin: { description: "For example Green ammonia · Producer." } },
            {
              name: "profileSlug",
              label: "H2 India profile",
              type: "text",
              admin: { description: "The company's profile address, when it has one." },
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "winnersLine",
              label: "Winners (results table)",
              type: "text",
              admin: { description: "When there are many, for example 9 companies, incl. L&T Energy GreenTech." },
            },
            {
              name: "capacityLine",
              label: "Capacity (results table)",
              type: "text",
              admin: { description: "For example 4,50,000 t/yr in total." },
            },
            {
              name: "price",
              label: "Discovered price (results table)",
              type: "text",
              admin: { description: "For example ₹52.25 per kg." },
            },
          ],
        },
        { name: "bidders", type: "text", admin: { description: "Number of bidders, or “Not public”." } },
        { name: "whatItMeans", label: "What it means", type: "textarea" },
        {
          name: "analysis",
          label: "Our analysis",
          type: "relationship",
          relationTo: "articles",
          admin: { description: "“What it means” links here (460:4147)." },
        },
        {
          name: "source",
          type: "text",
          admin: { description: "For example SECI e-reverse auction result, 8 Aug 2025." },
        },
      ],
    },
    topicsField,
  ],
});

export const Grants: CollectionConfig = recordCollection({
  slug: "grants",
  labels: { singular: "Grant", plural: "Grants" },
  titleField: "title",
  status: (d) =>
    grantStatus({
      deadline: s(d, "deadline"),
      nextCallExpected: s(d, "nextCallExpected"),
      override: s(d, "statusOverride"),
    }),
  fields: [
    { name: "title", type: "text", required: true },
    slugField("title"),
    {
      type: "row",
      fields: [
        { name: "funder", type: "text", required: true, admin: { description: "Short name: ANRF, MNRE, DST." } },
        {
          name: "funderName",
          label: "Funder's full name",
          type: "text",
          admin: { description: "For example Anusandhan National Research Foundation." },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "amountPerProject",
          label: "Amount per project",
          type: "text",
          admin: { description: "For example Up to ₹1.5 crore per project, over 3 years." },
        },
        {
          name: "summary",
          label: "Card line",
          type: "text",
          admin: { description: "Under the title on cards; the amount is used when empty." },
        },
      ],
    },
    { name: "themes", type: "select", hasMany: true, options: [...GRANT_THEMES] },
    { name: "whoCanApply", label: "Who can apply", type: "select", hasMany: true, options: [...GRANT_APPLICANTS] },
    {
      name: "whoText",
      label: "Who can apply (as written)",
      type: "textarea",
      admin: { description: "At a glance (463:5337), for example Researchers at recognised Indian institutions." },
    },
    istDate("deadline", "Deadline", true),
    {
      name: "statusOverride",
      label: "Call status",
      type: "select",
      options: [...GRANT_STATUS_OVERRIDES],
      admin: { description: "Leave empty: it follows the deadline. Announced: dates are out, applications aren't." },
    },
    {
      name: "focusAreas",
      label: "Themes (chips)",
      type: "text",
      hasMany: true,
      admin: { description: "The research areas drawn as chips, for example Low-iridium PEM anodes." },
    },
    { name: "focusNote", label: "Themes note", type: "textarea" },
    {
      name: "steps",
      label: "How to apply (steps)",
      type: "array",
      admin: { description: "Steps before the first future date show as done; the next one as current." },
      fields: [
        { name: "step", type: "text", required: true },
        { name: "at", type: "date", admin: { date: { pickerAppearance: "dayOnly" } } },
      ],
    },
    {
      name: "howToApply",
      label: "How to apply (note)",
      type: "textarea",
      required: true,
      admin: { description: "Shown under the steps, for example An industry partner is optional." },
    },
    ...sourceFields("Official link"),
    {
      type: "row",
      fields: [
        { name: "pastCallLabel", label: "Past call", type: "text", admin: { description: "For example 2025 call." } },
        { name: "pastCallUrl", label: "Past call link", type: "text" },
      ],
    },
    {
      name: "pastAwardees",
      type: "array",
      fields: [
        { name: "name", label: "Institution", type: "text", required: true },
        { name: "project", type: "text" },
        { name: "amount", label: "Grant", type: "text" },
        { name: "year", type: "text" },
      ],
    },
    {
      name: "nextCallExpected",
      label: "When it's closed, next call expected",
      type: "text",
      admin: { description: "Shown once the call closes, for example mid-2027. Announced calls show it too." },
    },
    statesField,
    topicsField,
  ],
});

export const Jobs: CollectionConfig = recordCollection({
  slug: "jobs",
  labels: { singular: "Job", plural: "Jobs" },
  titleField: "role",
  status: (d) => jobStatus({ closesAt: s(d, "closesAt") }),
  defaultColumns: ["role", "company", "post.state", "status", "updatedAt"],
  fields: [
    { name: "role", type: "text", required: true },
    slugField("role"),
    {
      type: "row",
      fields: [
        {
          name: "company",
          type: "text",
          required: true,
        },
        { name: "function", type: "select", options: [...JOB_FUNCTIONS] },
        { name: "jobType", label: "Job type", type: "select", options: [...JOB_TYPES], defaultValue: "Full-time" },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "companySlug",
          label: "Company profile",
          type: "text",
          admin: { description: "The company's H2 India profile address, when it has one." },
        },
        {
          name: "companyLine",
          label: "Company line",
          type: "text",
          admin: { description: "Under the name, for example Electrolyser manufacturer · Ratnagiri." },
        },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "location", type: "text", required: true },
        { name: "workMode", type: "select", options: [...WORK_MODES], defaultValue: "On site" },
        { name: "locationNote", type: "text", admin: { description: "For example 60% travel." } },
      ],
    },
    statesField,
    {
      type: "row",
      fields: [
        { name: "experience", type: "select", options: EXPERIENCE.map((e) => e.value) },
        {
          name: "salaryBand",
          label: "Salary band (optional)",
          type: "text",
          admin: { description: "₹ lakh a year, for example 12–16; or as written, starting with ₹." },
        },
      ],
    },
    { name: "description", label: "About the role", type: "textarea", required: true },
    list("duties", "What you'll do", "item"),
    list("needs", "What you'll need", "item"),
    { name: "skills", type: "text", hasMany: true },
    {
      name: "howToApply",
      type: "radio",
      required: true,
      defaultValue: "link",
      options: [
        { label: "External link", value: "link" },
        { label: "Email", value: "email" },
        { label: "H2 India form", value: "form" },
      ],
    },
    {
      name: "applyEmail",
      type: "email",
      admin: { condition: (d) => (d as { howToApply?: string }).howToApply === "email" },
    },
    istDate("postedAt", "Posted"),
    istDate("closesAt", "Closes", true),
    {
      name: "featured",
      label: "Featured job",
      type: "checkbox",
      admin: { description: "Editors only (A69): pinned at the top of the jobs list." },
    },
    ...sourceFields("Job page or company careers page"),
    topicsField,
    {
      name: "post",
      label: "Posted by a company",
      type: "group",
      admin: {
        position: "sidebar",
        description: "Jobs companies post (467:7472) wait here as drafts. Publishing approves them.",
      },
      fields: [
        {
          name: "state",
          type: "select",
          options: ["Draft", "Submitted for review"],
          admin: { readOnly: true },
        },
        { name: "reference", type: "text", index: true, admin: { readOnly: true } },
        { name: "organisationId", type: "text", index: true, admin: { readOnly: true } },
        { name: "submittedBy", type: "text", admin: { readOnly: true } },
        { name: "submittedAt", type: "date", admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } } },
      ],
    },
  ],
});

export const Events: CollectionConfig = recordCollection({
  slug: "events",
  labels: { singular: "Event", plural: "Events" },
  titleField: "name",
  status: (d) => eventStatus({ startsAt: s(d, "startsAt"), endsAt: s(d, "endsAt") }),
  fields: [
    { name: "name", label: "Event name", type: "text", required: true },
    slugField("name"),
    {
      type: "row",
      fields: [
        { name: "organiser", type: "text", required: true },
        {
          name: "format",
          type: "select",
          required: true,
          options: ["Conference · in person", "Workshop · in person", "Expo · in person", "Webinar · online", "Hybrid"],
        },
      ],
    },
    {
      type: "row",
      fields: [istDate("startsAt", "Starts", true), istDate("endsAt", "Ends")],
    },
    { name: "venue", type: "text", admin: { description: "Leave empty for online events." } },
    statesField,
    {
      type: "row",
      fields: [
        { name: "tickets", type: "select", options: ["Free", "Paid"], defaultValue: "Free" },
        { name: "priceText", label: "Price", type: "text", admin: { description: "For example ₹3,500 to ₹6,000." } },
      ],
    },
    { name: "registrationUrl", label: "Registration link", type: "text" },
    { name: "description", type: "textarea" },
    { name: "sponsoredPlacement", label: "Sponsored placement (shown with a “Sponsored” label)", type: "checkbox" },
    { name: "inNewsletter", label: "Show in the weekly newsletter", type: "checkbox" },
    ...sourceFields("Organiser's page"),
    topicsField,
  ],
});

/** Possible updates (646:733): changes spotted on the official sources we watch, to confirm or dismiss. */
export const SourceChanges: CollectionConfig = {
  slug: "source-changes",
  labels: { singular: "Possible update", plural: "Possible updates" },
  admin: { useAsTitle: "title", group: "Records", defaultColumns: ["title", "record", "status", "detectedAt"] },
  access: { read: canView, create: canEdit, update: canEdit, delete: () => false },
  fields: [
    {
      name: "record",
      type: "relationship",
      relationTo: ["schemes", "tenders", "grants", "jobs", "events"],
      required: true,
    },
    {
      name: "title",
      type: "text",
      required: true,
      admin: { description: "For example New corrigendum: Corrigendum 2 posted." },
    },
    { name: "source", type: "text", required: true },
    { name: "before", type: "text" },
    { name: "now", label: "Now on source", type: "text" },
    { name: "detectedAt", type: "date", required: true, admin: { date: { pickerAppearance: "dayAndTime" } } },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "Open",
      options: ["Open", "Dismissed", "Confirmed"],
    },
    { name: "decidedBy", type: "relationship", relationTo: "editors", admin: { readOnly: true } },
  ],
};

export const RECORD_COLLECTIONS = ["schemes", "tenders", "grants", "jobs", "events"] as const;
