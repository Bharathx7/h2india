import type { CollectionConfig } from "payload";
import { canDelete, canEdit, canView } from "./roles";

// Submissions (step 5.7): events, press releases, corrections and Write-for-us pitches sent from the public forms
// (501:8485, 504:8, 504:455, 504:985). Each gets a reference (EV-, PR-, COR-, WFU-) and waits here under review; an
// editor publishes the event or article from it, or replies. Personal data: only what the form shows. Nothing is
// created here by hand: the forms write through submitContent() (apps/web/src/submissions/submit.ts).

export const SUBMISSION_KINDS = [
  { value: "event", label: "Event" },
  { value: "press_release", label: "Press release" },
  { value: "correction", label: "Correction" },
  { value: "pitch", label: "Write for us" },
  { value: "contact", label: "Contact message" },
  { value: "partnership", label: "Partnership enquiry" },
  { value: "advertising", label: "Advertising enquiry" },
] as const;

export const Submissions: CollectionConfig = {
  slug: "submissions",
  labels: { singular: "Submission", plural: "Submissions" },
  admin: {
    useAsTitle: "title",
    group: "Queues",
    defaultColumns: ["reference", "kind", "title", "status", "createdAt"],
    description:
      "Events, press releases, corrections, pitches, contact messages and partnership and advertising enquiries from the public forms, newest first.",
  },
  defaultSort: "-createdAt",
  access: { read: canView, create: () => false, update: canEdit, delete: canDelete },
  fields: [
    {
      type: "row",
      fields: [
        { name: "reference", type: "text", required: true, unique: true, index: true, admin: { readOnly: true } },
        {
          name: "kind",
          type: "select",
          required: true,
          index: true,
          options: SUBMISSION_KINDS.map((k) => ({ label: k.label, value: k.value })),
          admin: { readOnly: true },
        },
        {
          name: "status",
          type: "select",
          required: true,
          defaultValue: "Under review",
          index: true,
          options: ["Under review", "Published", "Needs changes", "Declined", "Answered"],
        },
      ],
    },
    { name: "title", type: "text", required: true, admin: { readOnly: true } },
    {
      name: "details",
      type: "json",
      required: true,
      admin: { readOnly: true, description: "Everything the form asked, as sent." },
    },
    {
      type: "row",
      fields: [
        { name: "contactName", type: "text", admin: { readOnly: true } },
        { name: "contactEmail", type: "email", admin: { readOnly: true } },
        { name: "contactPhone", type: "text", admin: { readOnly: true } },
      ],
    },
    {
      name: "files",
      label: "Uploaded files",
      type: "text",
      hasMany: true,
      admin: { readOnly: true, description: "File ids (logo, images), opened through the files service." },
    },
    { name: "submittedBy", type: "text", admin: { readOnly: true, position: "sidebar" } },
    { name: "organisationId", type: "text", admin: { readOnly: true, position: "sidebar" } },
    { name: "reviewNote", label: "Note to the sender", type: "textarea" },
  ],
};
