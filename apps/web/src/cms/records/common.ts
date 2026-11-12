import { audit, getDb } from "@h2india/core";
import { GST_STATES } from "@h2india/core/companies/client";
import { APIError, type CollectionConfig, type Endpoint, type Field } from "payload";
import { canDelete, canEdit, editorOf } from "../roles";
import { publicOrEditor, refuseSamplePublish } from "../sample";
import { slugFrom } from "../slug";
import { searchHooks } from "../../search/hooks";

// What every record shares (step 4.3, A30, A31): an official source and documents, "last verified" with who and a
// note (Records not verified for 30 days move to Data quality), owner, states, topics, a sample flag (F9), drafts and
// versions. Content editors publish record changes (A30).

export const STATE_OPTIONS = [
  { label: "All India", value: "all-india" },
  ...[...new Set(Object.values(GST_STATES))]
    .filter((s) => s !== "Other Territory" && s !== "Centre Jurisdiction")
    .sort()
    .map((s) => ({ label: s, value: s.toLowerCase().replace(/[^a-z0-9]+/g, "-") })),
];

/** Date fields shown and entered in India time (deadlines have a time: a tender closing "2 Dec" closes at an hour). */
export function istDate(name: string, label: string, required = false): Field {
  return {
    name,
    label,
    type: "date",
    required,
    index: true,
    admin: {
      date: { pickerAppearance: "dayAndTime", displayFormat: "d MMM yyyy, h:mm a" },
      description: "India time (IST).",
    },
  };
}

export function sourceFields(label = "Official page"): Field[] {
  return [
    {
      name: "sourceUrl",
      label,
      type: "text",
      required: true,
      admin: {
        description: "The official page or portal. Readers confirm details there (A29: no applying on H2 India).",
      },
      validate: (v: string | null | undefined) =>
        typeof v === "string" && /^https?:\/\/\S+\.\S+/.test(v.trim())
          ? true
          : "Enter the full address, starting with https://",
    },
    {
      name: "documents",
      type: "array",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "url", type: "text", required: true },
        { name: "kind", type: "select", defaultValue: "PDF", options: ["PDF", "Word", "Excel", "Web page"] },
        { name: "checkedAt", type: "date" },
      ],
    },
  ];
}

export const sidebarFields: Field[] = [
  {
    name: "status",
    type: "text",
    virtual: true,
    admin: { position: "sidebar", readOnly: true, description: "From the dates; nobody needs to change it." },
  },
  { name: "owner", type: "relationship", relationTo: "editors", admin: { position: "sidebar" } },
  {
    name: "verification",
    label: "Last verified",
    type: "group",
    admin: { position: "sidebar" },
    fields: [
      { name: "at", type: "date", admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } } },
      { name: "by", type: "relationship", relationTo: "editors", admin: { readOnly: true } },
      { name: "note", type: "textarea", admin: { readOnly: true } },
    ],
  },
  {
    name: "sample",
    type: "checkbox",
    admin: { position: "sidebar", description: "Sample content (F9): never shown in production." },
  },
];

export function slugField(from: string): Field {
  return {
    name: "slug",
    type: "text",
    required: true,
    unique: true,
    index: true,
    hooks: { beforeValidate: [slugFrom(from)] },
    admin: { position: "sidebar", description: "Part of the address. Don't change it once published." },
  };
}

export const statesField: Field = { name: "states", type: "select", hasMany: true, options: STATE_OPTIONS };
export const topicsField: Field = { name: "topics", type: "relationship", relationTo: "topics", hasMany: true };

/** POST /api/cms/<records>/:id/verify { note }: "Mark verified now" (640:8). */
export function verifyEndpoint(slug: string): Endpoint {
  return {
    path: "/:id/verify",
    method: "post",
    handler: async (req) => {
      const editor = editorOf(req);
      if (!editor?.permissions?.includes("content.edit")) {
        return Response.json({ errors: [{ message: "Only editors can verify records." }] }, { status: 403 });
      }
      const body = (req.json ? await req.json().catch(() => ({})) : {}) as { note?: string };
      const id = req.routeParams?.id;
      if (typeof id !== "string" && typeof id !== "number") {
        return Response.json({ errors: [{ message: "No such record" }] }, { status: 404 });
      }
      const at = new Date().toISOString();
      const doc = await req.payload.update({
        collection: slug as "schemes",
        id,
        data: { verification: { at, by: Number(editor.id), note: body.note?.trim() || null } },
        overrideAccess: true,
      });
      await audit(getDb(), {
        actorId: (req.user as { h2UserId?: string } | null)?.h2UserId ?? null,
        action: "record.verified",
        resourceType: slug,
        resourceId: String(id),
        after: { at, note: body.note ?? null },
      });
      return Response.json({ doc });
    },
  };
}

/** A record collection with the shared fields, access, drafts and the derived status. */
export function recordCollection(input: {
  slug: string;
  labels: { singular: string; plural: string };
  titleField: string;
  status: (doc: Record<string, unknown>) => string;
  fields: Field[];
  defaultColumns?: string[];
}): CollectionConfig {
  return {
    slug: input.slug,
    labels: input.labels,
    admin: {
      useAsTitle: input.titleField,
      group: "Records",
      defaultColumns: input.defaultColumns ?? [input.titleField, "status", "verification.at", "updatedAt"],
    },
    versions: { drafts: true, maxPerDoc: 50 },
    access: { read: publicOrEditor, create: canEdit, update: canEdit, delete: canDelete, readVersions: canEdit },
    endpoints: [verifyEndpoint(input.slug)],
    hooks: {
      // Search (step 5.2): saves and deletes queue an index change in the same transaction.
      ...searchHooks,
      afterRead: [
        ({ doc }) => {
          const d = doc as Record<string, unknown>;
          d.status = input.status(d);
          return d;
        },
      ],
      beforeChange: [
        ({ data, req }) => {
          if (
            (data as { _status?: string })._status === "published" &&
            !editorOf(req)?.permissions?.includes("content.edit") &&
            req.user
          ) {
            throw new APIError("Only editors can publish records.", 403, null, true);
          }
          return data;
        },
        refuseSamplePublish,
      ],
    },
    fields: [...input.fields, ...sidebarFields],
  };
}
