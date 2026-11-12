import type { CollectionConfig, Field } from "payload";
import { canEdit, canView } from "../roles";
import { istDate, recordCollection, slugField, sourceFields, statesField, topicsField } from "./common";
import { eventStatus, grantStatus, jobStatus, schemeStatus, tenderStatus } from "./status";

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
      options: ["Closed", "Next round expected"],
      admin: { description: "Leave empty: Open or Closing soon come from the deadline." },
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
      ],
    },
    list("eligibility", "Who can apply (conditions)", "condition"),
    { name: "benefits", type: "textarea" },
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
  ],
});

export const Tenders: CollectionConfig = recordCollection({
  slug: "tenders",
  labels: { singular: "Tender", plural: "Tenders" },
  titleField: "title",
  status: (d) =>
    tenderStatus({ bidDueAt: s(d, "bidDueAt"), result: d.result as { declaredAt?: string | null } | null }),
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
        { name: "mode", type: "text", admin: { description: "For example Open tender · two-bid system." } },
        { name: "category", type: "text", admin: { description: "For example Systems › Electrolysers." } },
      ],
    },
    statesField,
    {
      type: "row",
      fields: [
        { name: "value", type: "text", admin: { description: "Or “Not disclosed”." } },
        { name: "emd", label: "EMD", type: "text" },
        { name: "documentFee", type: "text" },
      ],
    },
    istDate("bidDueAt", "Bid due", true),
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
        { name: "at", type: "date", required: true, admin: { date: { pickerAppearance: "dayAndTime" } } },
      ],
    },
    { name: "description", label: "What this tender is for", type: "textarea", required: true },
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
          name: "winners",
          type: "array",
          fields: [
            { name: "name", type: "text", required: true },
            { name: "capacity", type: "text" },
            { name: "price", label: "Discovered price", type: "text" },
          ],
        },
        { name: "bidders", type: "text", admin: { description: "Number of bidders, or “Not public”." } },
        { name: "whatItMeans", label: "What it means", type: "textarea" },
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
        { name: "funder", type: "text", required: true },
        {
          name: "amountPerProject",
          label: "Amount per project",
          type: "text",
          admin: { description: "For example Up to ₹5,00,00,000." },
        },
      ],
    },
    {
      name: "themes",
      type: "select",
      hasMany: true,
      options: ["Electrolysers", "Storage", "Fuel cells", "Safety and standards", "Materials", "Transport", "Industry"],
    },
    { name: "whoCanApply", label: "Who can apply", type: "select", hasMany: true, options: APPLICANTS },
    istDate("deadline", "Deadline", true),
    {
      name: "statusOverride",
      label: "Call status",
      type: "select",
      options: ["Closed"],
      admin: { description: "Leave empty: it follows the deadline." },
    },
    { name: "howToApply", label: "How to apply", type: "textarea", required: true },
    ...sourceFields("Official link"),
    {
      name: "pastAwardees",
      type: "array",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "project", type: "text" },
        { name: "year", type: "text" },
      ],
    },
    {
      name: "nextCallExpected",
      label: "When it's closed, next call expected",
      type: "text",
      admin: { description: "Shown once the call closes, for example Q3 2027." },
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
          admin: { description: "Links to the company profile in Stage 6." },
        },
        { name: "function", type: "text", admin: { description: "For example Engineering · commissioning." } },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "location", type: "text", required: true },
        { name: "workMode", type: "select", options: ["On site", "Hybrid", "Remote"], defaultValue: "On site" },
      ],
    },
    statesField,
    {
      type: "row",
      fields: [
        { name: "experience", type: "select", options: ["0–2 years", "3–6 years", "7–10 years", "10+ years"] },
        {
          name: "salaryBand",
          label: "Salary band (optional)",
          type: "text",
          admin: { description: "₹ lakh a year, for example 12–16." },
        },
      ],
    },
    { name: "description", type: "textarea", required: true },
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
    { name: "featured", label: "Featured job (paid)", type: "checkbox" },
    ...sourceFields("Job page or company careers page"),
    topicsField,
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
