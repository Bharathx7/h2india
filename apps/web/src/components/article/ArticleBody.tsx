import type { DefaultTypedEditorState } from "@payloadcms/richtext-lexical";
import { RichText, type JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";

// Renders an article's body with the article components from Figma page 02: Key numbers box and Key facts box.
// Used by the CMS preview now and the public article page (step 5.3).

interface KeyNumbersBlock {
  blockType: "keyNumbers";
  heading?: string | null;
  items: { value: string; label: string }[];
  source?: string | null;
}
interface KeyFactsBlock {
  blockType: "keyFacts";
  heading?: string | null;
  items: { fact: string }[];
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

function KeyFacts({ block }: { block: KeyFactsBlock }) {
  return (
    <aside className="my-6 rounded-card border border-default p-5" aria-label={block.heading ?? "Key facts"}>
      <p className="type-eyebrow text-secondary">{block.heading ?? "Key facts"}</p>
      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 type-body text-body">
        {block.items.map((item) => (
          <li key={item.fact}>{item.fact}</li>
        ))}
      </ul>
    </aside>
  );
}

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  blocks: {
    keyNumbers: ({ node }: { node: { fields: KeyNumbersBlock } }) => <KeyNumbers block={node.fields} />,
    keyFacts: ({ node }: { node: { fields: KeyFactsBlock } }) => <KeyFacts block={node.fields} />,
  },
});

export function ArticleBody({ data }: { data: DefaultTypedEditorState }) {
  return (
    <RichText
      data={data}
      converters={converters}
      className="flex flex-col gap-4 type-body-lg text-body [&_h2]:mt-4 [&_h2]:type-h3 [&_h2]:text-primary [&_h3]:type-h4 [&_a]:text-link [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-(color:--border-color-accent) [&_blockquote]:pl-4 [&_blockquote]:type-h4"
    />
  );
}
