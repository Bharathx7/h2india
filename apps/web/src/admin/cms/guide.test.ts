import { describe, expect, it } from "vitest";
import type { ArticleForm } from "./articles";
import { articleChecklist, missingForReview, nextStep, requiredFields } from "./guide";

// Founder (20 Nov 2026): the article editor says what is missing and what happens next.
const form = (over: Partial<ArticleForm> = {}): ArticleForm => ({
  type: "news",
  title: "Green ammonia bids keep falling",
  dek: "Three auctions in a month.",
  whyItMatters: "",
  body: [{ kind: "paragraph", text: "The latest round closed lower." }],
  topics: [],
  tags: [],
  states: [],
  featured: false,
  authors: [1],
  editor: null,
  sources: [{ title: "SECI results", url: "", note: "", internal: false }],
  interviewee: { name: "", role: "", organisation: "" },
  issuer: "",
  sponsor: { name: "", about: "", disclosure: "" },
  legal: { flagged: false, note: "" },
  seo: { title: "", description: "" },
  heroImage: null,
  live: {
    status: "off",
    summary: [],
    summaryAt: null,
    keyNumbers: [],
    keyNumbersSource: "",
    meaning: [],
    updates: [],
  },
  ...over,
});

describe("the article checklist", () => {
  it("is ready for review with headline, standfirst, body, author and a source", () => {
    expect(missingForReview(form())).toEqual([]);
  });

  it("names what is missing", () => {
    expect(missingForReview(form({ title: " ", authors: [], sources: [] }))).toEqual([
      "Headline",
      "At least one author",
      "At least one source",
    ]);
  });

  it("asks a press release for its issuer and a sponsored piece for the sponsor and disclosure", () => {
    expect(missingForReview(form({ type: "press_release" }))).toEqual(["Who issued the press release"]);
    expect(missingForReview(form({ type: "sponsored" }))).toEqual(["Sponsor's name", "Sponsor disclosure"]);
  });

  it("never blocks on the nice-to-haves", () => {
    const advice = articleChecklist(form()).filter((i) => !i.required);
    expect(advice.map((i) => i.key)).toEqual(["hero", "topics", "seo"]);
    expect(advice.every((i) => !i.done)).toBe(true);
  });
});

describe("the next step", () => {
  const base = { saved: true, type: "news", legalFlagged: false, legalPassed: false, canPublish: false };
  it("follows the workflow for a writer", () => {
    expect(nextStep({ ...base, saved: false, status: "Draft" }).title).toBe("Write, then save a draft");
    expect(nextStep({ ...base, status: "Draft" }).title).toMatch(/Submit for review/);
    expect(nextStep({ ...base, status: "In review" }).title).toBe("Waiting for the Editor-in-chief");
  });

  it("tells an Editor-in-chief to publish or schedule", () => {
    expect(nextStep({ ...base, canPublish: true, status: "In review" }).title).toBe("Publish now, or schedule it");
  });

  it("sends sponsored and flagged pieces to legal check first", () => {
    expect(nextStep({ ...base, type: "sponsored", status: "In review" }).title).toBe("Send to legal check");
    expect(nextStep({ ...base, legalFlagged: true, status: "In review", canPublish: true }).title).toBe(
      "Send to legal check",
    );
    expect(
      nextStep({ ...base, legalFlagged: true, legalPassed: true, status: "In review", canPublish: true }).title,
    ).toBe("Publish now, or schedule it");
  });
});

describe("a record's required fields", () => {
  const fields = [
    { name: "name", label: "Name", kind: "text", required: true, readOnly: false },
    { name: "summary", label: "Summary", kind: "textarea", required: false, readOnly: false },
    { name: "states", label: "States", kind: "select", required: true, readOnly: false },
    { name: "createdBy", label: "Created by", kind: "text", required: true, readOnly: true },
    {
      name: "source",
      label: "Source",
      kind: "group",
      required: false,
      readOnly: false,
      fields: [{ name: "url", label: "Link", kind: "text", required: true, readOnly: false }],
    },
  ];

  it("lists only required, editable fields, groups included", () => {
    expect(requiredFields(fields, {}).map((f) => f.label)).toEqual(["Name", "States", "Source: Link"]);
  });

  it("ticks the filled ones", () => {
    const done = requiredFields(fields, { name: "PLI tranche II", states: [], source: { url: "https://mnre.gov.in" } });
    expect(done.map((f) => [f.label, f.done])).toEqual([
      ["Name", true],
      ["States", false],
      ["Source: Link", true],
    ]);
  });
});
