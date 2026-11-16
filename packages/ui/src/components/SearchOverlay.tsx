"use client";

import { Dialog as RDialog } from "radix-ui";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { cx } from "../lib/cx";
import { buttonClasses } from "./Button";
import { CategoryChip } from "./Chips";
import { ArrowLink } from "./Links";

/* Figma "Search overlay" (372:7217; frames 372:16695 suggestions, 372:16870 no results, 372:16991 phones).
   Command-style search opened from the header search trigger or "/". Scope chips, grouped suggestions with keyboard
   focus (arrow keys move, Enter opens, Esc closes), "See all results". No results: related categories and a prefilled
   Request a quote. A 720 px panel 96 px from the top on desktop; the whole screen on phones. */

export interface SearchOverlayItem {
  id: string;
  title: string;
  meta: string;
  href: string;
}

export interface SearchOverlayGroup {
  /** The eyebrow, for example "Products". */
  label: string;
  icon: IconName;
  items: SearchOverlayItem[];
}

export type SearchOverlayState = "idle" | "loading" | "ready" | "error";

export interface SearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  scopes: { id: string; label: string }[];
  scope: string;
  onScopeChange: (scope: string) => void;
  groups: SearchOverlayGroup[];
  /** All matches in the scope, for "See all N results". */
  total: number;
  state: SearchOverlayState;
  /** Opens a result (navigate to its href). */
  onOpenItem: (item: SearchOverlayItem) => void;
  /** Runs the full search: Enter with nothing highlighted, or "See all results". */
  onSeeAll: () => void;
  onRetry?: () => void;
  /** "Related categories" chips when nothing matches. */
  related?: { label: string; href: string }[];
  /** The prefilled quote request for the typed words. */
  quoteHref: string;
  /** Renders links (for example Next.js Link). Defaults to <a>. */
  renderLink?: (props: { href: string; className: string; children: ReactNode; onClick?: () => void }) => ReactNode;
}

const plainLink: NonNullable<SearchOverlayProps["renderLink"]> = ({ href, className, children, onClick }) => (
  <a href={href} className={className} onClick={onClick}>
    {children}
  </a>
);

const fmt = (n: number) => n.toLocaleString("en-IN");

export function SearchOverlay({
  open,
  onOpenChange,
  query,
  onQueryChange,
  scopes,
  scope,
  onScopeChange,
  groups,
  total,
  state,
  onOpenItem,
  onSeeAll,
  onRetry,
  related = [],
  quoteHref,
  renderLink = plainLink,
}: SearchOverlayProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(-1);
  const flat = groups.flatMap((g) => g.items);
  const typed = query.trim() !== "";
  const noResults = typed && state === "ready" && flat.length === 0;
  const optionId = (i: number) => `${id}-opt-${String(i)}`;

  // A new list starts with nothing highlighted, so Enter runs the full search unless someone chose a row.
  useEffect(() => {
    setActive(-1);
  }, [query, scope, groups]);

  useEffect(() => {
    if (active >= 0) document.getElementById(`${id}-opt-${String(active)}`)?.scrollIntoView({ block: "nearest" });
  }, [id, active]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (flat.length ? (a + 1) % flat.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (flat.length ? (a <= 0 ? flat.length - 1 : a - 1) : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[active];
      if (item) onOpenItem(item);
      else if (typed) onSeeAll();
    }
  };

  const close = () => {
    onOpenChange(false);
  };

  let index = -1;
  const list = (
    <div
      id={`${id}-list`}
      role="listbox"
      aria-label="Search suggestions"
      className="flex flex-col gap-3 p-2 md:px-3 md:pt-2 md:pb-3"
    >
      {groups.map((g) => (
        <div key={g.label} role="group" aria-labelledby={`${id}-${g.label}`} className="flex flex-col">
          <p id={`${id}-${g.label}`} className="px-3 pt-2 pb-1 type-eyebrow text-secondary">
            {g.label}
          </p>
          {g.items.map((item) => {
            index += 1;
            const i = index;
            const on = i === active;
            return (
              <div
                key={`${g.label}-${item.id}`}
                id={optionId(i)}
                role="option"
                aria-selected={on}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onOpenItem(item);
                }}
                onMouseEnter={() => {
                  setActive(i);
                }}
                className={cx("flex cursor-pointer items-center gap-3 rounded-card px-3 py-2", on && "bg-subtle")}
              >
                <Icon name={g.icon} size={20} className="text-icon-primary" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="type-label text-primary">{item.title}</span>
                  {item.meta ? <span className="type-caption text-secondary">{item.meta}</span> : null}
                </span>
                {on ? <Icon name="arrow-right" size={16} className="hidden text-icon-primary md:block" /> : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  const empty = (
    <div className="flex flex-col gap-4 p-5 md:p-8" role="status">
      <p className="type-h4 text-primary">No matches for “{query.trim()}”</p>
      <p className="type-body-sm text-body">Check the spelling or try a broader term.</p>
      {related.length ? (
        <div className="flex flex-col gap-2">
          <p className="type-eyebrow text-secondary">Related categories</p>
          <div className="flex flex-wrap gap-2">
            {related.map((r) =>
              renderLink({
                href: r.href,
                onClick: close,
                className:
                  "inline-flex h-8 items-center rounded-pill border-[1.5px] border-control bg-page px-2.75 type-label text-primary hover:border-focus",
                children: r.label,
              }),
            )}
          </div>
        </div>
      ) : null}
      <div className="flex flex-col items-start gap-4 rounded-card bg-mint p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="type-label-lg text-primary">Tell suppliers what you need</p>
          <p className="type-caption text-body">
            We&apos;ll prefill a request with your search and send it to up to 5 verified suppliers.
          </p>
        </div>
        {renderLink({
          href: quoteHref,
          onClick: close,
          className: buttonClasses({ variant: "primary", size: "sm" }),
          children: "Request a quote",
        })}
      </div>
    </div>
  );

  const problem = (
    <div className="flex flex-col items-start gap-3 p-5 md:p-8" role="alert">
      <p className="type-h4 text-primary">We couldn’t load search results</p>
      <p className="type-body-sm text-body">
        Check your connection and try again. If it keeps happening, contact support.
      </p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className={buttonClasses({ variant: "outline", size: "sm" })}>
          Try again
        </button>
      ) : null}
    </div>
  );

  const loading = (
    <div aria-hidden="true" className="flex flex-col gap-2 p-2 md:px-3 md:pt-2 md:pb-3">
      {[0, 1, 2].map((n) => (
        <div key={n} className="flex items-center gap-3 px-3 py-2">
          <span className="size-5 rounded-control shimmer" />
          <span className="flex flex-1 flex-col gap-1.5">
            <span className="block h-3.5 w-3/5 rounded-[6px] shimmer" />
            <span className="block h-3 w-2/5 rounded-[6px] shimmer" />
          </span>
        </div>
      ))}
    </div>
  );

  const body = !typed
    ? null
    : state === "error"
      ? problem
      : noResults
        ? empty
        : state === "loading" && flat.length === 0
          ? loading
          : list;
  const showFooter = typed && flat.length > 0;
  const seeAll = `See all ${fmt(total)} results`;

  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-40 hidden bg-ink-900/45 md:block" />
        <RDialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            input.current?.focus();
            input.current?.select();
          }}
          className={cx(
            "fixed z-50 flex flex-col overflow-hidden bg-page",
            "inset-0 md:inset-auto md:top-24 md:left-1/2 md:max-h-[calc(100dvh-8rem)] md:w-180 md:max-w-[calc(100vw-2rem)] md:-translate-x-1/2",
            "md:rounded-modal md:border md:border-default md:shadow-ink-float",
          )}
        >
          <RDialog.Title className="sr-only">Search H2 Economy</RDialog.Title>
          <div className="flex items-center gap-3 border-b border-default px-4 py-3 md:px-5 md:py-4">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-pill border border-input px-3 md:h-auto md:gap-3 md:rounded-none md:border-0 md:px-0">
              <Icon name="search" size={24} className="hidden shrink-0 text-icon-primary md:block" />
              <Icon name="search" size={20} className="shrink-0 text-icon-primary md:hidden" />
              <span className="sr-only">Search</span>
              <input
                ref={input}
                type="search"
                role="combobox"
                aria-expanded={showFooter}
                aria-controls={`${id}-list`}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 ? optionId(active) : undefined}
                value={query}
                onChange={(e) => {
                  onQueryChange(e.target.value);
                }}
                onKeyDown={onKey}
                placeholder="Search products, companies, news, schemes"
                maxLength={200}
                className="h-full min-w-0 flex-1 bg-transparent type-body text-primary placeholder:text-secondary focus-visible:outline-none md:type-body-lg [&::-webkit-search-cancel-button]:hidden"
              />
              {typed ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    onQueryChange("");
                    input.current?.focus();
                  }}
                  className="rounded-control text-icon-primary md:hidden"
                >
                  <Icon name="x" size={18} />
                </button>
              ) : null}
            </label>
            <RDialog.Close asChild>
              <button
                type="button"
                aria-label="Close search"
                className="hidden rounded-control bg-subtle px-2 py-1 type-spec text-secondary md:block"
              >
                Esc
              </button>
            </RDialog.Close>
            <RDialog.Close asChild>
              <button type="button" className={cx(buttonClasses({ variant: "ghost", size: "sm" }), "md:hidden")}>
                Cancel
              </button>
            </RDialog.Close>
          </div>
          <div
            role="group"
            aria-label="Search in"
            className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] md:flex-wrap md:overflow-visible md:px-5"
          >
            {scopes.map((s) => (
              <CategoryChip
                key={s.id}
                selected={s.id === scope}
                onClick={() => {
                  onScopeChange(s.id);
                  input.current?.focus();
                }}
                className="shrink-0"
              >
                {s.label}
              </CategoryChip>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite" aria-busy={state === "loading"}>
            {body}
          </div>
          {showFooter ? (
            <div className="flex items-center justify-between border-t border-default bg-subtle px-4 pt-3 pb-6 md:px-5 md:pb-3">
              <p className="hidden type-caption text-secondary md:block">↑ ↓ to move · Enter to open · Esc to close</p>
              <span className="hidden md:block">
                <ArrowLink asChild>
                  <button type="button" onClick={onSeeAll}>
                    {seeAll}
                  </button>
                </ArrowLink>
              </span>
              <button
                type="button"
                onClick={onSeeAll}
                className={cx(buttonClasses({ variant: "outline", size: "md" }), "w-full md:hidden")}
              >
                {seeAll}
              </button>
            </div>
          ) : null}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
