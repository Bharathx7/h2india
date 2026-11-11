"use client";

import { Tooltip as RTooltip } from "radix-ui";
import type { ReactNode } from "react";

// Figma "Tooltip" (20:136): a short hint on hover and keyboard focus. Never holds the only copy of important
// information. Caption on bg/inverse, radius 8, with a 12 x 6 arrow.

export interface TooltipProps {
  content: ReactNode;
  side?: "top" | "bottom";
  /** The element that shows the tooltip. It must be focusable (a button or link). */
  children: ReactNode;
}

export function Tooltip({ content, side = "top", children }: TooltipProps) {
  return (
    <RTooltip.Provider delayDuration={300}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content
            side={side}
            sideOffset={4}
            className="z-50 max-w-70 rounded-control bg-inverse px-2.5 py-1.5 type-caption text-inverse"
          >
            {content}
            <RTooltip.Arrow width={12} height={6} className="fill-ink-900" />
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}
