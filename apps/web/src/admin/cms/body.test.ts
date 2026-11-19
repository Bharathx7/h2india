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
    const node = { type: "horizontalrule", version: 1 };
    const back = lexicalToBlocks(blocksToLexical([{ kind: "kept", node, summary: "horizontalrule" }]));
    expect(back[0]).toEqual({ kind: "kept", node, summary: "horizontalrule" });
    expect(blocksToLexical(back).root.children[0]).toBe(node);
  });

  it("round-trips pictures and YouTube videos", () => {
    const blocks: BodyBlock[] = [
      { kind: "image", mediaId: 7 },
      { kind: "youtube", url: "https://youtu.be/dQw4w9WgXcQ", title: "Electrolyser tour", caption: "Pune, 2026" },
    ];
    const lexical = blocksToLexical(blocks);
    expect(lexical.root.children[0]).toMatchObject({ type: "upload", relationTo: "media", value: 7 });
    expect(lexicalToBlocks(lexical)).toEqual(blocks);
  });

  it("reads a picture whose media record was filled in, and drops an empty picture block", () => {
    const filled = { root: { children: [{ type: "upload", relationTo: "media", value: { id: 9, url: "/x.webp" } }] } };
    expect(lexicalToBlocks(filled)).toEqual([{ kind: "image", mediaId: 9 }]);
    expect(blocksToLexical([{ kind: "image", mediaId: null }]).root.children).toEqual([]);
  });
});
