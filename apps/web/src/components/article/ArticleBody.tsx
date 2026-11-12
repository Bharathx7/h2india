import type { DefaultTypedEditorState } from "@payloadcms/richtext-lexical";
import { RichText, type JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";
import { GlossaryTerm } from "@h2india/ui";
import type { ReactNode } from "react";
import { linkGlossary, type GlossaryNode, type LinkableTerm } from "@/cms/knowledge/glossary-links";

// Renders an article's body with the article components from Figma page 02: Key numbers box, Key facts box and the
// Glossary hover-card (first mention of each glossary term, step 4.4). Used by the CMS preview now and the public
// article page (step 5.3).

interface KeyNumbersBlock {
  blockType: "keyNumbers";
  heading?: string | null;
  items: { value: string; label: string }[];
  source?: string | null;
}
interface KeyFactsBlock {
  blockType: "keyFacts";
  heading?: string | null;
  items: { label: string; value: string }[];
}

function KeyNumbers({ block }: { block: KeyNumbersBlock }) {
  return (
    <aside className="my-6 rounded-card bg-mint p-5" aria-label={block.heading ?? "Key numbers"}>
      <p className="type-eyebrow text-secondary">{block.heading ?? "Key numbers"}</p>
      <dl className="mt-3 grid gap-4 sm:grid-cols-2">
        {block.items.map((item) => (
          <div key={`${item.value}-${item.label}`} className="flex flex-col gap-0.5">
            <dt className="order-2 type-body-sm text-body">{item.label}</dt>
            <dd className="order-1 type-h3 text-primary">{item.value}</dd>
          </div>
        ))}
      </dl>
      {block.source ? <p className="mt-3 type-caption text-secondary">Source: {block.source}</p> : null}
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
            <dt className="type-eyebrow text-secondary">{item.label}</dt>
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

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  glossaryTerm: ({ node }: { node: GlossaryNode }) => (
    <GlossaryTerm term={node.term} definition={node.definition} href={`/knowledge/glossary/${node.slug}`}>
      {formatted(node.text, node.format)}
    </GlossaryTerm>
  ),
  blocks: {
    keyNumbers: ({ node }: { node: { fields: KeyNumbersBlock } }) => <KeyNumbers block={node.fields} />,
    keyFacts: ({ node }: { node: { fields: KeyFactsBlock } }) => <KeyFacts block={node.fields} />,
  },
});

export function ArticleBody({ data, glossary = [] }: { data: DefaultTypedEditorState; glossary?: LinkableTerm[] }) {
  return (
    <RichText
      data={linkGlossary(data, glossary)}
      converters={converters}
      className="flex flex-col gap-4 type-body-lg text-body [&_h2]:mt-4 [&_h2]:type-h3 [&_h2]:text-primary [&_h3]:type-h4 [&_a:not([data-glossary])]:text-link [&_a:not([data-glossary])]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-(color:--border-color-accent) [&_blockquote]:pl-4 [&_blockquote]:type-h4"
    />
  );
}
