"use client";

import { HoverCard } from "radix-ui";
import type { ReactNode } from "react";

// Figma "Glossary hover-card" (424:7500): a glossary term in an article shows its short definition on hover and on
// keyboard focus. The term itself links to the glossary page, so the card never holds the only copy.

export interface GlossaryTermProps {
  term: string;
  definition: string;
  href: string;
  /** The words as they appear in the text. */
  children: ReactNode;
}

export function GlossaryTerm({ term, definition, href, children }: GlossaryTermProps) {
  return (
    <HoverCard.Root openDelay={200} closeDelay={150}>
      <HoverCard.Trigger asChild>
        <a
          href={href}
          data-glossary=""
          className="text-inherit underline decoration-ink-500 decoration-dotted decoration-1 underline-offset-4 hover:decoration-ink-900"
        >
          {children}
        </a>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="top"
          sideOffset={6}
          collisionPadding={16}
          className="z-50 flex w-80 max-w-[calc(100vw-32px)] flex-col gap-2 rounded-card border border-default bg-page p-4 shadow-ink-float-sm"
        >
          <p className="type-label text-primary">{term}</p>
          <p className="type-body-sm text-body">{definition}</p>
          <a href={href} className="type-label-sm text-link hover:text-link-hover">
            Open in glossary →
          </a>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
