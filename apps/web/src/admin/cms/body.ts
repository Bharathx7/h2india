// The article body in our editor (step 4.6, Doc 1 §11.4 "Article editor (blocks …)"): simple blocks that convert to
// and from Payload's rich-text JSON (Lexical). Text inside a block uses **bold**, *italic* and [label](https://…).
// Anything the editor doesn't know (made in the advanced editor) is kept exactly as it was. Pure: unit-tested.

export type BodyBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "keyNumbers"; heading: string; items: { value: string; label: string }[]; source: string }
  | { kind: "keyFacts"; heading: string; items: { label: string; value: string }[] }
  | { kind: "kept"; node: unknown; summary: string };

type Node = Record<string, unknown> & { type?: string; children?: Node[] };

const BOLD = 1;
const ITALIC = 2;
const base = { format: "", indent: 0, version: 1, direction: "ltr" };

// ------------------------------------------------------------------------------------------------ inline text

function textNode(text: string, format: number): Node {
  return { type: "text", text, format, detail: 0, mode: "normal", style: "", version: 1 };
}

/** **bold**, *italic* and [label](url) to Lexical children. */
export function inlineToNodes(src: string): Node[] {
  const out: Node[] = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m.index > last) out.push(textNode(src.slice(last, m.index), 0));
    if (m[1] !== undefined && m[2] !== undefined)
      out.push({
        type: "link",
        ...base,
        version: 3,
        fields: { url: m[2], newTab: false, linkType: "custom" },
        children: [textNode(m[1], 0)],
      });
    else if (m[3] !== undefined) out.push(textNode(m[3], BOLD));
    else if (m[4] !== undefined) out.push(textNode(m[4], ITALIC));
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push(textNode(src.slice(last), 0));
  return out;
}

/** Lexical children back to **bold**, *italic* and [label](url). */
export function nodesToInline(children: Node[] | undefined): string {
  return (children ?? [])
    .map((n) => {
      if (n.type === "text") {
        const t = typeof n.text === "string" ? n.text : "";
        const f = typeof n.format === "number" ? n.format : 0;
        return f & BOLD ? `**${t}**` : f & ITALIC ? `*${t}*` : t;
      }
      if (n.type === "link" || n.type === "autolink") {
        const url = (n.fields as { url?: string } | undefined)?.url ?? "";
        return `[${nodesToInline(n.children)}](${url})`;
      }
      if (n.type === "linebreak") return " ";
      return nodesToInline(n.children);
    })
    .join("");
}

// ------------------------------------------------------------------------------------------------ blocks

let counter = 0;
const blockId = () => `blk${Date.now().toString(36)}${String(counter++)}`;

export function blocksToLexical(blocks: BodyBlock[]) {
  const children: unknown[] = blocks.map((b) => {
    switch (b.kind) {
      case "paragraph":
        return { type: "paragraph", ...base, textFormat: 0, children: inlineToNodes(b.text) };
      case "heading":
        return { type: "heading", ...base, tag: `h${String(b.level)}`, children: inlineToNodes(b.text) };
      case "quote":
        return { type: "quote", ...base, children: inlineToNodes(b.text) };
      case "list":
        return {
          type: "list",
          ...base,
          listType: b.ordered ? "number" : "bullet",
          tag: b.ordered ? "ol" : "ul",
          start: 1,
          children: b.items.map((t, i) => ({ type: "listitem", ...base, value: i + 1, children: inlineToNodes(t) })),
        };
      case "keyNumbers":
        return {
          type: "block",
          ...base,
          version: 2,
          fields: {
            id: blockId(),
            blockName: "",
            blockType: "keyNumbers",
            heading: b.heading,
            items: b.items,
            source: b.source,
          },
        };
      case "keyFacts":
        return {
          type: "block",
          ...base,
          version: 2,
          fields: { id: blockId(), blockName: "", blockType: "keyFacts", heading: b.heading, items: b.items },
        };
      case "kept":
        return b.node;
    }
  });
  return { root: { type: "root", ...base, children } };
}

export function lexicalToBlocks(value: unknown): BodyBlock[] {
  const root = (value as { root?: Node } | null | undefined)?.root;
  if (!root?.children) return [];
  return root.children.map((n): BodyBlock => {
    switch (n.type) {
      case "paragraph":
        return { kind: "paragraph", text: nodesToInline(n.children) };
      case "heading":
        return { kind: "heading", level: n.tag === "h3" || n.tag === "h4" ? 3 : 2, text: nodesToInline(n.children) };
      case "quote":
        return { kind: "quote", text: nodesToInline(n.children) };
      case "list":
        return {
          kind: "list",
          ordered: n.listType === "number",
          items: (n.children ?? []).map((li) => nodesToInline(li.children)),
        };
      case "block": {
        const f = (n.fields ?? {}) as Record<string, unknown>;
        if (f.blockType === "keyNumbers")
          return {
            kind: "keyNumbers",
            heading: typeof f.heading === "string" ? f.heading : "Key numbers",
            items: Array.isArray(f.items)
              ? (f.items as { value: string; label: string }[]).map((x) => ({ value: x.value, label: x.label }))
              : [],
            source: typeof f.source === "string" ? f.source : "",
          };
        if (f.blockType === "keyFacts")
          return {
            kind: "keyFacts",
            heading: typeof f.heading === "string" ? f.heading : "Key facts",
            items: Array.isArray(f.items)
              ? (f.items as { label: string; value: string }[]).map((x) => ({ label: x.label, value: x.value }))
              : [],
          };
        return {
          kind: "kept",
          node: n,
          summary: `Block: ${typeof f.blockType === "string" ? f.blockType : "unknown"}`,
        };
      }
      default:
        return { kind: "kept", node: n, summary: n.type ?? "Content" };
    }
  });
}
