"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "../icons/Icon";
import { cx } from "../lib/cx";

// Figma "Chip" (20:127). Height is 32 (44 on touch layouts); the unselected 1.5 px border sits inside,
// so selected and unselected chips line up (Figma draws the unselected one 3 px taller).

export interface CategoryChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  touch?: boolean;
  children: ReactNode;
}

/** Switches a sub-category. Announces its state with aria-pressed. */
export function CategoryChip({ selected = false, touch = false, className, children, ...rest }: CategoryChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        "inline-flex items-center rounded-pill border-[1.5px] type-label whitespace-nowrap",
        "transition-[background-color,border-color,color] duration-(--motion-duration-fast) ease-standard",
        touch ? "h-11 px-3.75" : "h-8 px-2.75",
        selected
          ? "border-transparent bg-inverse text-inverse"
          : "border-control bg-page text-primary hover:border-focus",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface FilterChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** The applied filter, for example "Pressure: 30–350 bar". */
  label: string;
  onRemove: () => void;
}

/** An applied filter. The whole chip removes it. */
export function FilterChip({ label, onRemove, className, ...rest }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove filter: ${label}`}
      className={cx(
        "inline-flex h-8 items-center gap-1.5 rounded-pill bg-inverse pr-2 pl-3 type-label whitespace-nowrap text-inverse",
        "transition-colors duration-(--motion-duration-fast) ease-standard hover:bg-ink-700",
        className,
      )}
      {...rest}
    >
      {label}
      <Icon name="x" size={16} className="text-icon-inverse" />
    </button>
  );
}
