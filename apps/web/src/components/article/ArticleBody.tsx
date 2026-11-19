import type { DefaultTypedEditorState } from "@payloadcms/richtext-lexical";
import { RichText, type JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";
import { GlossaryTerm } from "@h2india/ui";
import type { ReactNode } from "react";
import { linkGlossary, type GlossaryNode, type LinkableTerm } from "@/cms/knowledge/glossary-links";
import { youtubeId } from "@/lib/youtube";
import { YouTubeVideo } from "./YouTubeVideo";

// Renders an article's body with the article components from Figma page 02: Key numbers box, Key facts box and the
// Glossary hover-card (first mention of each glossary term, step 4.4). Used by the CMS preview now and the public
// article page (step 5.3).

export interface KeyNumbersBlock {
  blockType: "keyNumbers";
  heading?: string | null;
  items: { value: string; label: string }[];
  source?: string | null;
}
interface YouTubeBlock {
  blockType: "youtube";
  url: string;
  title: string;
  caption?: string | null;
}
/** A picture from the media library, filled in by the read (depth 1 or more). */
interface MediaValue {
  url?: string | null;
  alt?: string | null;
  caption?: string | null;
  credit?: string | null;
  sizes?: { hero?: { url?: string | null } | null } | null;
}
interface KeyFactsBlock {
  blockType: "keyFacts";
  heading?: string | null;
  items: { label: string; value: string }[];
}

/** Key numbers box (424:7480): up to three figures in a row, with the source in green. */
export function KeyNumbers({ block }: { block: KeyNumbersBlock }) {
  return (
    <aside className="my-2 flex flex-col gap-4 rounded-card bg-subtle p-6" aria-label={block.heading ?? "Key numbers"}>
      <p className="type-label-sm text-secondary">{block.heading ?? "Key numbers"}</p>
      <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {block.items.map((item) => (
          <div key={`${item.value}-${item.label}`} className="flex flex-col gap-1">
            <dt className="order-2 type-body-sm text-body">{item.label}</dt>
            <dd className="order-1 type-h3 text-primary">{item.value}</dd>
          </div>
        ))}
      </dl>
      {block.source ? <p className="type-caption text-link">{block.source}</p> : null}
    </aside>
  );
}

/** Key facts box (424:7495): eyebrow labels over values. */
function KeyFacts({ block }: { block: KeyFactsBlock }) {
  return (
    <aside
      className="my-6 flex flex-col gap-3 rounded-card border border-default p-5"
      aria-label={block.heading ?? "Key facts"}
    >
      <p className="type-h4 text-primary">{block.heading ?? "Key facts"}</p>
      <dl className="flex flex-col gap-3">
        {block.items.map((item) => (
          <div key={`${item.label}-${item.value}`} className="flex flex-col gap-0.5">
            <dt className="type-label-sm text-secondary">{item.label}</dt>
            <dd className="type-body-sm text-primary">{item.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

const BOLD = 1;
const ITALIC = 2;

function formatted(text: string, format: number): ReactNode {
  let out: ReactNode = text;
  if (format & ITALIC) out = <em>{out}</em>;
  if (format & BOLD) out = <strong>{out}</strong>;
  return out;
}

/** The plain text of a Lexical node. */
export function textOf(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { text?: unknown; children?: unknown[] };
  return (typeof n.text === "string" ? n.text : "") + (n.children ?? []).map(textOf).join("");
}

/** The anchor of a heading, so "In this explainer" (437:3872) can link to it. */
export const headingId = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** The article's H2 headings, in order, for a contents box. */
export function headingsOf(data: unknown): { id: string; text: string }[] {
  const root = (data as { root?: { children?: unknown[] } } | null)?.root;
  return (root?.children ?? [])
    .filter((c) => (c as { type?: string; tag?: string }).type === "heading" && (c as { tag?: string }).tag === "h2")
    .map((c) => {
      const text = textOf(c);
      return { id: headingId(text), text };
    });
}

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  heading: ({ node, nodesToJSX }) => {
    const Tag = node.tag;
    const id = node.tag === "h2" ? headingId(textOf(node)) : undefined;
    return (
      <Tag id={id} className="scroll-mt-24">
        {nodesToJSX({ nodes: node.children })}
      </Tag>
    );
  },
  glossaryTerm: ({ node }: { node: GlossaryNode }) => (
    <GlossaryTerm term={node.term} definition={node.definition} href={`/knowledge/glossary/${node.slug}`}>
      {formatted(node.text, node.format)}
    </GlossaryTerm>
  ),
  upload: ({ node }: { node: { relationTo?: string; value?: unknown } }) => {
    const m = node.value as MediaValue | number | null | undefined;
    if (!m || typeof m !== "object") return null;
    const src = m.sizes?.hero?.url ?? m.url;
    if (!src) return null;
    const note = [m.caption, m.credit].filter(Boolean).join(" · ");
    return (
      <figure className="my-2 flex flex-col gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- CMS images come from the storage domain. */}
        <img src={src} alt={m.alt ?? ""} loading="lazy" className="w-full rounded-card" />
        {note ? <figcaption className="type-caption text-secondary">{note}</figcaption> : null}
      </figure>
    );
  },
  blocks: {
    keyNumbers: ({ node }: { node: { fields: KeyNumbersBlock } }) => <KeyNumbers block={node.fields} />,
    keyFacts: ({ node }: { node: { fields: KeyFactsBlock } }) => <KeyFacts block={node.fields} />,
    youtube: ({ node }: { node: { fields: YouTubeBlock } }) => {
      const id = youtubeId(node.fields.url);
      return id ? <YouTubeVideo id={id} title={node.fields.title} caption={node.fields.caption} /> : null;
    },
  },
});

export function ArticleBody({ data, glossary = [] }: { data: DefaultTypedEditorState; glossary?: LinkableTerm[] }) {
  return (
    <RichText
      data={linkGlossary(data, glossary)}
      converters={converters}
      className="flex flex-col gap-4 type-body-lg text-body [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:marker:text-link [&_li]:marker:type-label [&_h2]:mt-4 [&_h2]:type-h3 [&_h2]:text-primary [&_h3]:type-h4 [&_a:not([data-glossary])]:text-link [&_a:not([data-glossary])]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-(color:--border-color-accent) [&_blockquote]:pl-4 [&_blockquote]:type-h4"
    />
  );
}
