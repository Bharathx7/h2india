"use client";

import type { ButtonHTMLAttributes } from "react";
import { Icon } from "../icons/Icon";
import { cx } from "../lib/cx";

/** Figma "Back to top" (151:117). Scrolls to the top and moves focus to the page's first heading or main. */
export function BackToTop({ className, onClick, ...rest }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-10 items-center gap-2 rounded-pill border border-default bg-page pr-3.75 pl-3.25 type-label text-primary shadow-soft",
        "transition-[background-color,box-shadow] duration-(--motion-duration-base) ease-standard hover:bg-mint hover:shadow-ink-float-sm",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        const target = document.querySelector<HTMLElement>("main h1, main");
        if (target) {
          if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        }
      }}
      {...rest}
    >
      <Icon name="chevron-up" size={16} />
      Back to top
    </button>
  );
}
