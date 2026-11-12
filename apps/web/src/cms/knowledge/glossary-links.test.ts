import { describe, expect, it } from "vitest";
import { definitionOf, linkGlossary, type LinkableTerm } from "./glossary-links";

const terms: LinkableTerm[] = [
  {
    term: "RfS",
    slug: "rfs",
    expansion: "Request for Selection",
    short: "the tender document SECI issues.",
    match: ["RfS"],
  },
  {
    term: "Electrolyser",
    slug: "electrolyser",
    short: "A machine that splits water.",
    match: ["Electrolyser", "electrolyzer"],
  },
  {
    term: "Green ammonia",
    slug: "green-ammonia",
    short: "Ammonia made with green hydrogen.",
    match: ["Green ammonia"],
  },
  { term: "Ammonia", slug: "ammonia", short: "NH3.", match: ["Ammonia"] },
];

const text = (t: string, format = 0) => ({
  type: "text",
  text: t,
  format,
  version: 1,
  detail: 0,
  mode: "normal",
  style: "",
});
const para = (...children: object[]) => ({ type: "paragraph", version: 1, children });
const doc = (...children: object[]) => ({ root: { type: "root", version: 1, children } });

type Out = { root: { children: { type: string; children: { type: string; text: string; slug?: string }[] }[] } };

describe("glossary links", () => {
  it("links the first mention only, keeping the text around it", () => {
    const out = linkGlossary(doc(para(text("SECI issued the RfS. The RfS closes soon."))), terms) as unknown as Out;
    const nodes = out.root.children[0]?.children ?? [];
    expect(nodes.map((n) => [n.type, n.text])).toEqual([
      ["text", "SECI issued the "],
      ["glossaryTerm", "RfS"],
      ["text", ". The RfS closes soon."],
    ]);
  });

  it("matches acronyms exactly, words in any case, aliases, and whole words only", () => {
    const out = linkGlossary(
      doc(
        para(text("An rfs, an RFS and a 10 MW electrolyzer; electrolysers is a different word.")),
        para(text("ELECTROLYSER again")),
      ),
      terms,
    ) as unknown as Out;
    const linked = out.root.children.flatMap((p) => p.children).filter((n) => n.type === "glossaryTerm");
    expect(linked.map((n) => [n.text, n.slug])).toEqual([["electrolyzer", "electrolyser"]]);
  });

  it("prefers the longest term and leaves headings, links and code alone", () => {
    const out = linkGlossary(
      doc(
        { type: "heading", tag: "h2", children: [text("Green ammonia")] },
        para({ type: "link", children: [text("RfS")] }, text(" and "), text("RfS", 16)),
        para(text("Green ammonia prices and ammonia")),
      ),
      terms,
    ) as unknown as Out;
    expect(out.root.children[0]?.children[0]?.type).toBe("text");
    expect(out.root.children[1]?.children.some((n) => n.type === "glossaryTerm")).toBe(false);
    const linked = out.root.children[2]?.children.filter((n) => n.type === "glossaryTerm") ?? [];
    expect(linked.map((n) => n.slug)).toEqual(["green-ammonia", "ammonia"]);
  });

  it("builds the card text from the expansion", () => {
    expect(definitionOf(terms[0] as LinkableTerm)).toBe("Request for Selection: the tender document SECI issues.");
    expect(definitionOf(terms[1] as LinkableTerm)).toBe("A machine that splits water.");
  });

  it("does not change the input", () => {
    const input = doc(para(text("The RfS")));
    const before = JSON.stringify(input);
    linkGlossary(input, terms);
    expect(JSON.stringify(input)).toBe(before);
  });
});
