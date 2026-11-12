"use client";

import { useState } from "react";
import { Icon } from "../../icons/Icon";
import { cx } from "../../lib/cx";
import { PauseButton } from "./Motion";

// Logo marquee (161:1657) with Logo tiles (845:10885): brands listed on H2 India, a continuous sideways scroll (90 s a
// loop, linear, 781:7247). It stops on hover, on keyboard focus and with the pause button (F6); reduced motion shows a
// still row. Brand marks are a placeholder until the brands approve their logos.

export interface MarqueeBrand {
  name: string;
  href: string;
}

export function LogoMarquee({
  brands,
  label,
  className,
}: {
  brands: MarqueeBrand[];
  label: string;
  className?: string;
}) {
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  // Enough copies to fill a wide screen before the loop repeats.
  const copies = brands.length < 6 ? 4 : 2;
  const set = (copy: number) =>
    brands.map((b) => (
      <li key={`${b.href}-${String(copy)}`} className="shrink-0 pr-16">
        <a
          href={b.href}
          tabIndex={copy === 0 ? 0 : -1}
          aria-hidden={copy === 0 ? undefined : true}
          className="group flex h-14 items-center gap-2 rounded-control text-ink-500 transition-colors duration-(--motion-duration-fast) hover:text-ink-900"
        >
          <Icon name="package" size={22} />
          <span className="type-h4 whitespace-nowrap">{b.name}</span>
        </a>
      </li>
    ));
  return (
    <div className={cx("relative", className)}>
      <PauseButton
        paused={paused}
        onToggle={() => {
          setPaused((p) => !p);
        }}
        className="absolute -top-14 right-0"
      />
      <div
        className="overflow-hidden"
        onMouseEnter={() => {
          setHeld(true);
        }}
        onMouseLeave={() => {
          setHeld(false);
        }}
        onFocus={() => {
          setHeld(true);
        }}
        onBlur={() => {
          setHeld(false);
        }}
      >
        <ul
          aria-label={label}
          data-testid="logo-marquee"
          data-paused={paused || held}
          className="marquee-track flex w-max"
        >
          {Array.from({ length: copies }, (_, i) => set(i))}
        </ul>
      </div>
    </div>
  );
}
