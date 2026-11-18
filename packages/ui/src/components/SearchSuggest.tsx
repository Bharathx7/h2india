"use client";

import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { cx } from "../lib/cx";
import { FIELD_BOX } from "./Field";

/* Figma "Search with suggestions" (29:1197): header and hero search. Suggestions group categories, products and
   suppliers; arrow keys move, Enter opens, Esc closes. Recent searches show when the field is empty. */

export interface Suggestion {
  id: string;
  label: string;
  meta?: string;
  icon: IconName;
  href: string;
}

export interface SuggestionGroup {
  label: string;
  items: Suggestion[];
}

export interface SearchSuggestProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Groups for the current text, in order: categories, products, suppliers. */
  groups: SuggestionGroup[];
  /** Shown when the field is empty. */
  recent?: Suggestion[];
  /** Opens a suggestion (navigate to its href). */
  onOpen: (item: Suggestion) => void;
  /** Runs the full search for the typed text. */
  onSubmit: (text: string) => void;
  /** Links under the list, for example "See all results" and "Request a quote". */
  footer?: ReactNode;
  placeholder?: string;
  label?: string;
}

export function SearchSuggest({
  value,
  onValueChange,
  groups,
  recent = [],
  onOpen,
  onSubmit,
  footer,
  placeholder = "Search electrolysers, fuel cells, suppliers",
  label = "Search",
}: SearchSuggestProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const shown: SuggestionGroup[] = useMemo(
    () =>
      value.trim() === ""
        ? recent.length
          ? [{ label: "Recent searches", items: recent }]
          : []
        : groups.filter((g) => g.items.length > 0),
    [value, groups, recent],
  );
  const flat = shown.flatMap((g) => g.items);
  const expanded = open && (flat.length > 0 || Boolean(footer && value.trim()));
  const optionId = (i: number) => `${id}-opt-${String(i)}`;

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (flat.length ? (a + 1) % flat.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (flat.length ? (a <= 0 ? flat.length - 1 : a - 1) : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[active];
      if (open && item) onOpen(item);
      else if (value.trim()) onSubmit(value.trim());
      setOpen(false);
    } else if (e.key === "Escape") {
      // Search fields clear themselves on Esc; here Esc only closes the list, as the design says.
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  let index = -1;
  return (
    <div className="relative h-fit w-full self-start">
      <div className={cx(FIELD_BOX, "h-11.5 w-full items-center gap-2 px-4")}>
        <Icon name="search" size={20} className="text-icon-secondary" />
        <input
          type="search"
          role="combobox"
          aria-label={label}
          aria-expanded={expanded}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onValueChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => {
            setOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => {
              setOpen(false);
            }, 120);
          }}
          onKeyDown={onKey}
          className="h-full min-w-0 flex-1 bg-transparent type-body text-primary placeholder:text-secondary focus-visible:outline-none"
        />
      </div>
      <div
        id={`${id}-list`}
        role="listbox"
        aria-label={`${label} suggestions`}
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-card border border-default bg-page py-2 shadow-ink-float-sm"
      >
        {shown.map((g) => (
          <div key={g.label} role="group" aria-labelledby={`${id}-${g.label}`}>
            <p id={`${id}-${g.label}`} className="px-4 pt-2 pb-1 type-label-sm text-secondary">
              {g.label}
            </p>
            {g.items.map((item) => {
              index += 1;
              const i = index;
              return (
                <div
                  key={item.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onOpen(item);
                    setOpen(false);
                  }}
                  onMouseEnter={() => {
                    setActive(i);
                  }}
                  className={cx("flex cursor-pointer items-center gap-3 px-4 py-2", i === active && "bg-subtle")}
                >
                  <Icon name={item.icon} size={20} className="text-icon-secondary" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate type-label text-primary">{item.label}</span>
                    {item.meta ? <span className="truncate type-caption text-secondary">{item.meta}</span> : null}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
        {footer && value.trim() ? (
          <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-default px-4 pt-3 pb-1.5 type-label">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
