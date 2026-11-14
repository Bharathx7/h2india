import { describe, expect, it } from "vitest";
import { describeFields, labelOf, relationsOf, toStored } from "./fields";

describe("describeFields", () => {
  const raw = [
    { name: "title", type: "text", required: true, maxLength: 140 },
    {
      type: "row",
      fields: [
        { name: "issuer", type: "text" },
        { name: "value", type: "number", min: 0 },
      ],
    },
    { name: "status", type: "text", virtual: true },
    { name: "createdAt", type: "date" },
    { name: "secret", type: "text", admin: { hidden: true } },
    { name: "bidDueAt", type: "date", admin: { date: { pickerAppearance: "dayAndTime" }, description: "India time" } },
    { name: "kind", type: "select", options: ["PDF", { label: "Web page", value: "web" }] },
    { name: "topics", type: "relationship", relationTo: "topics", hasMany: true },
    { name: "record", type: "relationship", relationTo: ["schemes", "tenders"] },
    { name: "owner", type: "relationship", relationTo: "editors", admin: { position: "sidebar" } },
    {
      name: "documents",
      type: "array",
      fields: [
        { name: "url", type: "text" },
        { name: "title", type: "text" },
      ],
    },
    { name: "note", type: "ui" },
  ];
  const specs = describeFields(raw);

  it("flattens rows and drops virtual, hidden, system and UI fields", () => {
    expect(specs.map((s) => s.name)).toEqual([
      "title",
      "issuer",
      "value",
      "bidDueAt",
      "kind",
      "topics",
      "record",
      "owner",
      "documents",
    ]);
  });

  it("keeps limits, times, options and where each field sits", () => {
    const by = Object.fromEntries(specs.map((s) => [s.name, s]));
    expect(by.title).toMatchObject({ required: true, maxLength: 140, label: "Title" });
    expect(by.bidDueAt).toMatchObject({ withTime: true, description: "India time", label: "Bid due at" });
    expect(by.kind?.options).toEqual([
      { value: "PDF", label: "PDF" },
      { value: "web", label: "Web page" },
    ]);
    expect(by.owner?.sidebar).toBe(true);
    expect(by.record?.kind).toBe("unsupported");
    // Inside an array, "url" is a real field (only top-level upload metadata is skipped).
    expect(by.documents?.fields?.map((f) => f.name)).toEqual(["url", "title"]);
  });

  it("lists the collections a form points to", () => {
    expect(relationsOf(specs).sort()).toEqual(["editors", "topics"]);
  });
});

describe("toStored", () => {
  const specs = describeFields([
    { name: "title", type: "text" },
    { name: "value", type: "number" },
    { name: "states", type: "select", hasMany: true, options: ["a"] },
    { name: "at", type: "date", admin: { readOnly: true } },
    { name: "links", type: "array", fields: [{ name: "label", type: "text" }] },
  ]);
  it("turns empty text into null, numbers into numbers and leaves read-only fields alone", () => {
    expect(
      toStored(specs, {
        title: "  ",
        value: "12.5",
        states: undefined,
        at: "2026-01-01",
        links: [{ id: "x", label: "" }, { label: "Site" }],
      }),
    ).toEqual({ title: null, value: 12.5, states: [], links: [{ id: "x", label: null }, { label: "Site" }] });
  });
  it("labels camelCase names in plain words", () => {
    expect(labelOf("sourceUrl")).toBe("Source url");
  });
});
