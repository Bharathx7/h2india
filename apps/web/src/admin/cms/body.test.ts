import { describe, expect, it } from "vitest";
import { blocksToLexical, inlineToNodes, lexicalToBlocks, nodesToInline, type BodyBlock } from "./body";

describe("article body blocks ⇄ rich text", () => {
  it("keeps bold, italic and links", () => {
    const src = "SECI's **5 GW** tender, *first* round: [read it](https://seci.co.in/x).";
    expect(nodesToInline(inlineToNodes(src))).toBe(src);
  });

  it("round-trips every block kind", () => {
    const blocks: BodyBlock[] = [
      { kind: "heading", level: 2, text: "What changed" },
      { kind: "paragraph", text: "The bid was **₹397/kg**." },
      { kind: "list", ordered: false, items: ["One", "Two"] },
      { kind: "list", ordered: true, items: ["First"] },
      { kind: "quote", text: "We expect more rounds." },
      {
        kind: "keyNumbers",
        heading: "Key numbers",
        items: [{ value: "4,100 h", label: "Stack life" }],
        source: "MNRE",
      },
      { kind: "keyFacts", heading: "Key facts", items: [{ label: "Issuer", value: "SECI" }] },
    ];
    const back = lexicalToBlocks(blocksToLexical(blocks));
    expect(back).toEqual(blocks);
  });

  it("keeps nodes it doesn't edit exactly as they were", () => {
    const node = { type: "upload", value: 7, relationTo: "media", version: 1 };
    const back = lexicalToBlocks(blocksToLexical([{ kind: "kept", node, summary: "upload" }]));
    expect(back[0]).toEqual({ kind: "kept", node, summary: "upload" });
    expect(blocksToLexical(back).root.children[0]).toBe(node);
  });
});
