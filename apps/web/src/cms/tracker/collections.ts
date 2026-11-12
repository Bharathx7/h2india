import { Money } from "@h2india/core";
import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
  type Field,
  type GlobalConfig,
} from "payload";
import { STATE_OPTIONS, verifyEndpoint } from "../records/common";
import { canDelete, canEdit, editorOf } from "../roles";
import { publicOrEditor, refuseSamplePublish } from "../sample";
import { slugFrom } from "../slug";
import { logChanges } from "./changes";
import type { TrackedField } from "./format";
import {
  FACTORY_PRODUCTS,
  METHODOLOGY_SOURCES,
  GST_BASIS,
  HUB_KINDS,
  PILOT_SECTORS,
  POLICY_TYPES,
  PRICE_PRODUCTS,
  PROJECT_PRODUCTS,
  SIGHT_TRANCHES,
  SOURCE_TIERS,
  STATUS_MEANINGS,
  STATUSES,
  TECHNOLOGIES,
  UNITS_NOTES,
  UPDATE_NOTE,
  type TrackerSlug,
} from "./options";

// The India Hydrogen Tracker (step 4.5): one collection per sub-view, each record sourced and dated (A34), with the
// source's tier as its confidence and an estimate tick per figure (A35), a status history, Last verified, owner and the
// sample flag (F9, A37). Publishing a record writes Recent changes. Editors publish tracker records, as other records
// (A30). Admin editor 643:1330; public pages come with Stage 5.

const options = (values: readonly string[]) => values.map((v) => ({ label: v, value: v }));
const monthPicker = { date: { pickerAppearance: "monthOnly" as const, displayFormat: "MMM yyyy" } };

function sourceGroup(): Field {
  return {
    name: "source",
    type: "group",
    admin: { description: "Every tracker value shows its source and as-of date." },
    fields: [
      {
        type: "row",
        fields: [
          {
            name: "name",
            label: "Source",
            type: "text",
            required: true,
            admin: { description: "For example Hydrotek commissioning note, 4 Oct 2026." },
          },
          {
            name: "url",
            label: "Link",
            type: "text",
            validate: (v: string | null | undefined) =>
              !v || /^https?:\/\/\S+\.\S+/.test(v.trim()) ? true : "Enter the full address, starting with https://",
          },
        ],
      },
      {
        type: "row",
        fields: [
          {
            name: "tier",
            label: "Source type",
            type: "select",
            required: true,
            options: SOURCE_TIERS.map((t) => ({ label: t.label, value: t.value })),
            admin: {
              description: "Its place in Which sources we trust (Methodology). This is the figure's confidence.",
            },
          },
          {
            name: "asOf",
            label: "As of",
            type: "date",
            required: true,
            admin: { date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" } },
          },
        ],
      },
    ],
  };
}

function statusFields(statuses: readonly string[]): Field[] {
  return [
    {
      type: "row",
      fields: [
        // "stage", not "status": Payload keeps "_status" for draft and published.
        { name: "stage", label: "Status", type: "select", required: true, index: true, options: options(statuses) },
        {
          name: "statusDate",
          label: "Status date",
          type: "date",
          admin: { ...monthPicker, description: "When it reached this status." },
        },
      ],
    },
    {
      name: "statusHistory",
      label: "Status history",
      type: "array",
      admin: { description: "A row is added when the status changes; add earlier steps by hand." },
      fields: [
        {
          type: "row",
          fields: [
            { name: "status", type: "select", required: true, options: options(statuses) },
            { name: "date", type: "date", required: true, admin: monthPicker },
            { name: "source", type: "text", required: true },
          ],
        },
      ],
    },
  ];
}

const placeFields: Field[] = [
  {
    type: "row",
    fields: [
      { name: "location", type: "text", admin: { description: "For example Mundra, Kutch, Gujarat." } },
      { name: "state", type: "select", options: STATE_OPTIONS, index: true },
    ],
  },
  {
    type: "row",
    fields: [
      { name: "latitude", type: "number", min: 6, max: 37, admin: { description: "For the map." } },
      { name: "longitude", type: "number", min: 68, max: 98 },
    ],
  },
];

const linkFields: Field[] = [
  {
    name: "linkedCompanies",
    label: "Linked companies",
    type: "array",
    fields: [
      {
        type: "row",
        fields: [
          { name: "name", type: "text", required: true },
          { name: "role", type: "text", admin: { description: "For example Developer, or Electrolyser supply." } },
        ],
      },
    ],
  },
  { name: "relatedArticles", label: "Related news", type: "relationship", relationTo: "articles", hasMany: true },
];

const sidebar: Field[] = [
  { name: "owner", type: "relationship", relationTo: "editors", admin: { position: "sidebar" } },
  {
    name: "enteredBy",
    label: "Entered by",
    type: "relationship",
    relationTo: "editors",
    admin: { position: "sidebar", readOnly: true, description: "Who last changed its figures." },
  },
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
    defaultValue: false,
    admin: { position: "sidebar", description: "Sample content (F9): never shown in production." },
  },
];

/** Editors publish; the status history gains a row when the status changes; the last editor is recorded. */
function trackerHooks(hasStatus: boolean): CollectionBeforeChangeHook[] {
  return [
    ({ data, req }) => {
      if (
        (data as { _status?: string })._status === "published" &&
        req.user &&
        !editorOf(req)?.permissions?.includes("content.edit")
      ) {
        throw new APIError("Only editors can publish tracker records.", 403, null, true);
      }
      return data;
    },
    refuseSamplePublish,
    ({ data, originalDoc, req }) => {
      const d = data as Record<string, unknown>;
      const editor = editorOf(req);
      if (editor) d.enteredBy = Number(editor.id);
      if (!hasStatus || typeof d.stage !== "string") return d;
      const before = (originalDoc as { stage?: string } | undefined)?.stage;
      const history = Array.isArray(d.statusHistory) ? (d.statusHistory as { status: string }[]) : [];
      if (d.stage !== before && history.at(-1)?.status !== d.stage) {
        const source = (d.source as { name?: string } | undefined)?.name ?? "";
        const date = typeof d.statusDate === "string" ? d.statusDate : new Date().toISOString();
        d.statusHistory = [...history, { status: d.stage, date, source }];
      }
      return d;
    },
  ];
}

/** The tracked figures of each view, in the order they show (Recent changes, record pages, preview). */
export const TRACKED: Partial<Record<TrackerSlug, TrackedField[]>> = {};

function trackerCollection(input: {
  slug: TrackerSlug;
  labels: { singular: string; plural: string };
  titleField: string;
  fields: Field[];
  tracked: TrackedField[];
  statuses?: readonly string[];
  estimable?: string[];
  defaultColumns: string[];
  beforeChange?: CollectionBeforeChangeHook[];
}): CollectionConfig {
  const statuses = input.statuses;
  TRACKED[input.slug] = input.tracked;
  return {
    slug: input.slug,
    labels: input.labels,
    admin: { useAsTitle: input.titleField, group: "Tracker", defaultColumns: input.defaultColumns },
    versions: { drafts: true, maxPerDoc: 100 },
    access: { read: publicOrEditor, create: canEdit, update: canEdit, delete: canDelete, readVersions: canEdit },
    endpoints: [verifyEndpoint(input.slug)],
    hooks: {
      beforeChange: [...(input.beforeChange ?? []), ...trackerHooks(Boolean(statuses))],
      afterChange: [logChanges(input.slug, input.tracked, input.titleField)],
    },
    fields: [
      ...input.fields,
      {
        name: "slug",
        type: "text",
        required: true,
        unique: true,
        index: true,
        hooks: { beforeValidate: [slugFrom(input.titleField)] },
        admin: { position: "sidebar", description: "Part of the address. Don't change it once published." },
      },
      ...(statuses ? statusFields(statuses) : []),
      sourceGroup(),
      ...(input.estimable?.length
        ? [
            {
              name: "estimates",
              label: "Estimated figures",
              type: "select",
              hasMany: true,
              options: options(input.estimable),
              admin: { description: "Figures that are estimates; shown as, for example, 2028 (company estimate)." },
            } satisfies Field,
          ]
        : []),
      ...sidebar,
    ],
  };
}

const sourceTracked: TrackedField[] = [{ name: "source.name", label: "Source" }];
const statusTracked: TrackedField[] = [
  { name: "stage", label: "Status" },
  { name: "statusDate", label: "Status date", kind: "month" },
];

export const TrackerProjects = trackerCollection({
  slug: "tracker-projects",
  labels: { singular: "Project", plural: "Projects" },
  titleField: "name",
  statuses: STATUSES["tracker-projects"],
  estimable: ["Hydrogen capacity", "Product capacity", "Electrolysers", "Expected start-up"],
  defaultColumns: ["name", "company", "state", "capacityTpa", "stage", "_status"],
  tracked: [
    { name: "name", label: "Project" },
    { name: "company", label: "Company" },
    { name: "location", label: "Location" },
    { name: "state", label: "State" },
    { name: "capacityTpa", label: "Capacity (t/yr)", kind: "number", unit: "t/yr" },
    { name: "product", label: "Product" },
    { name: "productCapacityTpa", label: "Product capacity (t/yr)", kind: "number", unit: "t/yr" },
    { name: "electrolyserMw", label: "Electrolysers (MW)", kind: "number", unit: "MW" },
    { name: "technology", label: "Technology" },
    { name: "renewablePower", label: "Renewable power" },
    { name: "scheme", label: "Scheme" },
    { name: "expectedStartYear", label: "Expected start-up" },
    ...statusTracked,
    ...sourceTracked,
  ],
  fields: [
    { name: "name", label: "Project name", type: "text", required: true },
    {
      type: "row",
      fields: [
        { name: "company", type: "text", required: true, admin: { description: "The developer." } },
        { name: "product", type: "select", defaultValue: "Green hydrogen", options: options(PROJECT_PRODUCTS) },
      ],
    },
    ...placeFields,
    {
      type: "row",
      fields: [
        {
          name: "capacityTpa",
          label: "Capacity (t/yr, nameplate)",
          type: "number",
          required: true,
          min: 0,
          admin: { description: "Hydrogen, tonnes a year." },
        },
        {
          name: "productCapacityTpa",
          label: "Product capacity (t/yr)",
          type: "number",
          min: 0,
          admin: { description: "Ammonia or methanol, when that is the product." },
        },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "electrolyserMw", label: "Electrolysers (MW)", type: "number", min: 0 },
        { name: "technology", type: "select", options: options(TECHNOLOGIES) },
      ],
    },
    {
      name: "renewablePower",
      label: "Renewable power",
      type: "text",
      admin: { description: "For example Solar and wind hybrid, 600 MW." },
    },
    {
      type: "row",
      fields: [
        { name: "scheme", type: "text", admin: { description: "For example SIGHT Mode 2A, Tranche I." } },
        { name: "underSight", label: "Awarded under SIGHT", type: "checkbox", defaultValue: false },
      ],
    },
    { name: "expectedStartYear", label: "Expected start-up (year)", type: "number", min: 2020, max: 2060 },
    ...linkFields,
  ],
});

export const TrackerFactories = trackerCollection({
  slug: "tracker-factories",
  labels: { singular: "Factory", plural: "Manufacturing" },
  titleField: "name",
  statuses: STATUSES["tracker-factories"],
  estimable: ["Capacity"],
  defaultColumns: ["name", "company", "product", "capacityMwPerYear", "stage", "_status"],
  tracked: [
    { name: "name", label: "Factory" },
    { name: "company", label: "Company" },
    { name: "product", label: "Product" },
    { name: "capacityMwPerYear", label: "Capacity (MW/yr)", kind: "number", unit: "MW/yr" },
    { name: "technology", label: "Technology" },
    { name: "tranche", label: "Tranche" },
    { name: "location", label: "Location" },
    ...statusTracked,
    ...sourceTracked,
  ],
  fields: [
    {
      name: "name",
      label: "Factory",
      type: "text",
      required: true,
      admin: { description: "For example Hydrotek Systems factory." },
    },
    {
      type: "row",
      fields: [
        { name: "company", type: "text", required: true },
        {
          name: "product",
          type: "select",
          required: true,
          defaultValue: "Electrolyser",
          options: options(FACTORY_PRODUCTS),
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "capacityMwPerYear",
          label: "Capacity (MW/yr)",
          type: "number",
          required: true,
          min: 0,
          admin: { description: "Nameplate MW of electrolysers a year." },
        },
        { name: "technology", type: "select", options: options(TECHNOLOGIES) },
      ],
    },
    { name: "tranche", type: "select", defaultValue: "Not under SIGHT", options: options(SIGHT_TRANCHES) },
    ...placeFields,
    ...linkFields,
  ],
});

export const TrackerPilots = trackerCollection({
  slug: "tracker-pilots",
  labels: { singular: "Pilot", plural: "Pilots" },
  titleField: "name",
  statuses: STATUSES["tracker-pilots"],
  estimable: ["Vehicles or units"],
  defaultColumns: ["name", "sector", "leadPartner", "stage", "_status"],
  tracked: [
    { name: "name", label: "Pilot" },
    { name: "sector", label: "Sector" },
    { name: "leadPartner", label: "Lead partner" },
    { name: "routeOrSite", label: "Route or site" },
    { name: "units", label: "Vehicles or units" },
    { name: "funding", label: "Funding" },
    ...statusTracked,
    ...sourceTracked,
  ],
  fields: [
    {
      name: "name",
      label: "Pilot",
      type: "text",
      required: true,
      admin: { description: "For example Harbour tug, Kandla." },
    },
    {
      type: "row",
      fields: [
        { name: "sector", type: "select", required: true, options: options(PILOT_SECTORS) },
        { name: "leadPartner", label: "Lead partner", type: "text", required: true },
      ],
    },
    { name: "routeOrSite", label: "Route or site", type: "text", required: true },
    {
      type: "row",
      fields: [
        {
          name: "units",
          label: "Vehicles or units",
          type: "text",
          admin: { description: "For example 10 buses, or 5% blend." },
        },
        {
          name: "vehicles",
          type: "number",
          min: 0,
          admin: { description: "Number of vehicles, for the mobility total." },
        },
      ],
    },
    { name: "funding", type: "text", admin: { description: "For example NGHM pilot scheme." } },
    ...placeFields,
    {
      name: "route",
      type: "array",
      admin: { description: "Points along the route, for the map's pilot routes." },
      fields: [
        {
          type: "row",
          fields: [
            { name: "latitude", type: "number", required: true, min: 6, max: 37 },
            { name: "longitude", type: "number", required: true, min: 68, max: 98 },
          ],
        },
      ],
    },
    ...linkFields,
  ],
});

export const TrackerStations = trackerCollection({
  slug: "tracker-stations",
  labels: { singular: "Station", plural: "Stations" },
  titleField: "name",
  statuses: STATUSES["tracker-stations"],
  estimable: ["Capacity"],
  defaultColumns: ["name", "operator", "capacityKgPerDay", "stage", "_status"],
  tracked: [
    { name: "name", label: "Location" },
    { name: "operator", label: "Operator" },
    { name: "pressures", label: "Pressure (bar)", kind: "list" },
    { name: "capacityKgPerDay", label: "Capacity (kg/day)", kind: "number", unit: "kg/day" },
    { name: "vehiclesServed", label: "Vehicles served" },
    { name: "closingDate", label: "Closing date", kind: "day" },
    ...statusTracked,
    ...sourceTracked,
  ],
  fields: [
    {
      name: "name",
      label: "Location",
      type: "text",
      required: true,
      admin: { description: "For example Bus depot, Bengaluru." },
    },
    { name: "operator", type: "text", required: true },
    {
      type: "row",
      fields: [
        {
          name: "pressures",
          label: "Pressure (bar)",
          type: "number",
          hasMany: true,
          admin: { description: "For example 350 and 700." },
        },
        { name: "capacityKgPerDay", label: "Capacity (kg/day)", type: "number", min: 0 },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "vehiclesServed", label: "Vehicles served", type: "text" },
        {
          name: "closingDate",
          label: "Tender closing date",
          type: "date",
          admin: {
            date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" },
            description: "While the tender is open.",
          },
        },
      ],
    },
    ...placeFields,
    ...linkFields,
  ],
});

/** "397.00" as typed → paise per kg, without floats. */
const priceToPaise: CollectionBeforeChangeHook = ({ data }) => {
  const d = data as { price?: string | null; pricePaise?: number | null };
  // Field validation reports a badly typed price; here we only convert a good one.
  if (typeof d.price === "string" && /^\d{1,7}(\.\d{1,2})?$/.test(d.price.trim().replace(/,/g, ""))) {
    d.pricePaise = Number(Money.parse(d.price));
  }
  return d;
};

export const TrackerPrices = trackerCollection({
  slug: "tracker-prices",
  beforeChange: [priceToPaise],
  labels: { singular: "Price", plural: "Prices" },
  titleField: "name",
  defaultColumns: ["name", "product", "price", "discoveredOn", "_status"],
  tracked: [
    { name: "name", label: "Auction or tender" },
    { name: "product", label: "Product" },
    { name: "pricePaise", label: "Price (₹/kg)", kind: "paise" },
    { name: "gstBasis", label: "GST basis" },
    { name: "discoveredOn", label: "Date", kind: "month" },
    { name: "winner", label: "Winner" },
    { name: "buyer", label: "Buyer" },
    ...sourceTracked,
  ],
  fields: [
    { name: "name", label: "Auction or tender", type: "text", required: true },
    {
      type: "row",
      fields: [
        { name: "product", type: "select", required: true, options: options(PRICE_PRODUCTS) },
        {
          name: "price",
          label: "Price (₹/kg)",
          type: "text",
          required: true,
          admin: { description: "As discovered, for example 397.00." },
          validate: (v: string | null | undefined) =>
            typeof v === "string" && /^\d{1,7}(\.\d{1,2})?$/.test(v.trim().replace(/,/g, ""))
              ? true
              : "Enter rupees per kg, for example 397.00",
        },
        {
          name: "gstBasis",
          label: "GST basis",
          type: "select",
          required: true,
          defaultValue: "Excl. GST",
          options: options(GST_BASIS),
        },
      ],
    },
    { name: "pricePaise", type: "number", admin: { hidden: true } },
    {
      type: "row",
      fields: [
        { name: "discoveredOn", label: "Date", type: "date", required: true, admin: monthPicker },
        { name: "winner", type: "text" },
        { name: "buyer", type: "text" },
      ],
    },
    { name: "state", type: "select", options: STATE_OPTIONS },
    { name: "relatedArticles", label: "Related news", type: "relationship", relationTo: "articles", hasMany: true },
  ],
});

/** The incentive rows on Compare states (751:7856), in the drawn order. */
export const INCENTIVE_CATEGORIES = [
  "Capital subsidy",
  "Power and wheeling",
  "Land",
  "Electricity duty",
  "Mobility support",
  "Equipment buyers",
  "Other",
] as const;

export const TrackerPolicies = trackerCollection({
  slug: "tracker-policies",
  labels: { singular: "State policy", plural: "State policies" },
  titleField: "name",
  defaultColumns: ["name", "policy", "type", "year", "_status"],
  tracked: [
    { name: "policy", label: "Policy" },
    { name: "type", label: "Type" },
    { name: "keyIncentives", label: "Key incentives" },
    { name: "year", label: "Year" },
    { name: "officialUrl", label: "Link" },
    ...sourceTracked,
  ],
  fields: [
    {
      type: "row",
      fields: [
        { name: "state", type: "select", required: true, options: STATE_OPTIONS, index: true },
        {
          name: "name",
          label: "Record name",
          type: "text",
          required: true,
          admin: { description: "Usually the state, for example Uttar Pradesh." },
        },
      ],
    },
    { name: "policy", type: "text", required: true, admin: { description: "For example Green Hydrogen Policy." } },
    {
      type: "row",
      fields: [
        { name: "type", type: "select", required: true, options: options(POLICY_TYPES) },
        { name: "year", type: "number", required: true, min: 2000, max: 2100 },
      ],
    },
    {
      name: "keyIncentives",
      label: "Key incentives",
      type: "textarea",
      required: true,
      admin: { description: "Our summary, for example Capital subsidy; land and stamp duty relief." },
    },
    {
      name: "officialUrl",
      label: "Official policy",
      type: "text",
      required: true,
      validate: (v: string | null | undefined) =>
        typeof v === "string" && /^https?:\/\/\S+\.\S+/.test(v.trim())
          ? true
          : "Enter the full address, starting with https://",
    },
    { name: "scheme", label: "In the schemes hub", type: "relationship", relationTo: "schemes" },
    // State pages (751:7362) and Compare states (751:7856), step 5.4.
    {
      name: "summary",
      label: "Policy summary",
      type: "textarea",
      admin: {
        description: "Two lines under the policy name on the state page. Our summary; the policy text decides.",
      },
    },
    {
      name: "incentives",
      type: "array",
      admin: {
        description:
          "One row per incentive the policy text covers. Anything left out shows “Not specified” on Compare states.",
      },
      fields: [
        {
          type: "row",
          fields: [
            { name: "category", type: "select", required: true, options: [...INCENTIVE_CATEGORIES] },
            { name: "for", label: "For", type: "text", admin: { description: "For example Producers." } },
          ],
        },
        { name: "summary", type: "text", required: true },
      ],
    },
    {
      name: "nodalAgency",
      label: "Nodal agency",
      type: "group",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "name",
              type: "text",
              admin: { description: "For example Maharashtra Energy Development Agency." },
            },
            { name: "short", type: "text", admin: { description: "For example MEDA." } },
          ],
        },
        { name: "url", label: "Official website", type: "text" },
      ],
    },
  ],
});

export const TrackerHubs = trackerCollection({
  slug: "tracker-hubs",
  labels: { singular: "Hub or valley", plural: "Hubs and valleys" },
  titleField: "name",
  defaultColumns: ["name", "kind", "state", "_status"],
  tracked: [
    { name: "name", label: "Name" },
    { name: "kind", label: "Kind" },
    { name: "description", label: "Description" },
    ...sourceTracked,
  ],
  fields: [
    {
      type: "row",
      fields: [
        { name: "name", type: "text", required: true, admin: { description: "For example Deendayal Port." } },
        { name: "kind", type: "select", required: true, options: options(HUB_KINDS) },
      ],
    },
    { name: "description", type: "textarea" },
    // The valley drawer on Hubs and valleys (751:8302), step 5.4.
    {
      type: "row",
      fields: [
        {
          name: "status",
          type: "text",
          admin: { description: "For example Foundation set up; demonstrations starting." },
        },
        { name: "lead", label: "Lead organisation", type: "text" },
      ],
    },
    { name: "focus", label: "Focus areas", type: "text" },
    ...placeFields,
  ],
});

/** Methodology page (740:469): editable text, filled with the drawn wording. */
export const TrackerMethodology: GlobalConfig = {
  slug: "tracker-methodology",
  label: "Tracker methodology",
  admin: { group: "Tracker" },
  access: { read: () => true, update: canEdit },
  versions: { max: 50 },
  fields: [
    {
      name: "statusMeanings",
      label: "What each status means",
      type: "array",
      defaultValue: STATUS_MEANINGS.map((s) => ({ ...s })),
      fields: [
        { name: "status", type: "text", required: true },
        { name: "meaning", type: "text", required: true },
        { name: "evidence", label: "Evidence we need", type: "text", required: true },
      ],
    },
    {
      name: "sources",
      label: "Which sources we trust, in order",
      type: "array",
      defaultValue: METHODOLOGY_SOURCES.map((text) => ({ text })),
      fields: [{ name: "text", type: "text", required: true }],
    },
    {
      name: "units",
      label: "Units and conversions",
      type: "array",
      defaultValue: UNITS_NOTES.map((text) => ({ text })),
      fields: [{ name: "text", type: "textarea", required: true }],
    },
    { name: "updateNote", label: "How often we update", type: "textarea", defaultValue: UPDATE_NOTE },
  ],
};
