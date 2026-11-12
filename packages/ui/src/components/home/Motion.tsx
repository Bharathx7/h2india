"use client";

import { useEffect, useRef, useState, type ElementType, type HTMLAttributes } from "react";
import { Icon } from "../../icons/Icon";
import { cx } from "../../lib/cx";

// Shared pieces of the home motion spec (781:7247).

/** True when the visitor asked for reduced motion. Updates if the setting changes. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => {
      setReduced(query.matches);
    };
    query.addEventListener("change", onChange);
    return () => {
      query.removeEventListener("change", onChange);
    };
  }, []);
  return reduced;
}

/**
 * Section reveal: fades up 16 px the first time it scrolls into view; items marked data-reveal-item follow 40 ms
 * apart (set --reveal-index on each). Content already on screen at load, and reduced motion, are shown at once.
 */
export function Reveal({
  as: Tag = "div",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: ElementType }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight) return; // already in view: no reveal
    // Cards in a row follow 40 ms apart: number each item among its siblings.
    for (const item of el.querySelectorAll<HTMLElement>("[data-reveal-item]")) {
      const siblings = Array.from(item.parentElement?.children ?? []).filter((c) => c.hasAttribute("data-reveal-item"));
      item.style.setProperty("--reveal-index", String(siblings.indexOf(item)));
    }
    el.dataset.reveal = "armed";
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.reveal = "shown";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);
  return (
    <Tag ref={ref} className={cx("reveal-section", className)} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * The pause control the motion spec asks for on anything that moves for more than 5 seconds (WCAG 2.2.2, F6):
 * 32 px round button, "Pause animation" / "Play animation" for screen readers.
 */
export function PauseButton({
  paused,
  onToggle,
  tone = "light",
  className,
}: {
  paused: boolean;
  onToggle: () => void;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={paused ? "Play animation" : "Pause animation"}
      aria-pressed={paused}
      className={cx(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-pill border",
        "transition-colors duration-(--motion-duration-fast) ease-[cubic-bezier(0.4,0,0,1)]",
        tone === "light"
          ? "border-control bg-page text-icon-primary hover:border-focus"
          : "border-neutral-0/24 text-icon-inverse hover:border-neutral-0/64",
        className,
      )}
    >
      <Icon name={paused ? "play" : "pause"} size={14} />
    </button>
  );
}
