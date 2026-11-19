"use client";

import { DropdownMenu as RMenu, Tabs as RTabs, ToggleGroup as RToggle } from "radix-ui";
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { cx } from "../lib/cx";
import { CountChip } from "./Badges";

/* Figma "Tabs" (21:186) and "Tab item" (21:185): underlined tabs, 24 px apart over a 1 px rule.
   Selected = 3 px ink-900 underline and ink-900 label; hover = 2 px border/control underline. */

export const Tabs = RTabs.Root;
export const TabPanel = RTabs.Content;

export function TabList({ className, ...rest }: ComponentProps<typeof RTabs.List>) {
  return <RTabs.List className={cx("flex gap-6 overflow-x-auto border-b border-default", className)} {...rest} />;
}

export function Tab({ className, ...rest }: ComponentProps<typeof RTabs.Trigger>) {
  return (
    <RTabs.Trigger
      className={cx(
        "-mb-px inline-flex shrink-0 items-center gap-2 border-b-3 border-transparent px-1 py-3 type-label whitespace-nowrap text-body",
        "hover:border-control data-[state=active]:border-focus data-[state=active]:text-primary",
        "focus-visible:outline-offset-0",
        className,
      )}
      {...rest}
    />
  );
}

/* Figma "Segmented control" (21:212): two to four options that switch a view, for example For buyers /
   For suppliers on the home page. */

export function SegmentedControl({
  options,
  value,
  onValueChange,
  label,
  className,
}: {
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <RToggle.Root
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onValueChange(v);
      }}
      aria-label={label}
      className={cx("inline-flex items-center gap-1 rounded-pill bg-subtle p-1", className)}
    >
      {options.map((o) => (
        <RToggle.Item
          key={o.value}
          value={o.value}
          className={cx(
            "inline-flex h-9 items-center justify-center rounded-pill px-4 type-label whitespace-nowrap text-body",
            "transition-[background-color,box-shadow,color] duration-(--motion-duration-fast) ease-standard",
            "data-[state=on]:bg-page data-[state=on]:text-primary data-[state=on]:shadow-soft",
          )}
        >
          {o.label}
        </RToggle.Item>
      ))}
    </RToggle.Root>
  );
}

/* Figma "Pagination" (21:224) and "Page item" (21:223): always at the bottom of a table; result count,
   rows per page (25, 50, 100) and page buttons. Links keep the page's other query parameters. */

export interface PaginationProps {
  page: number;
  perPage: number;
  total: number;
  /** The page's current query parameters, kept in every link. */
  query?: Record<string, string>;
  perPageOptions?: number[];
  /** Soft navigation (for example Next.js router.push). Defaults to a normal page load. */
  onNavigate?: (href: string) => void;
  className?: string;
  /** The address parameters this list's page and page size live in, when a page holds several lists. */
  pageParam?: string;
  perPageParam?: string;
}

function pageWindow(page: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set([1, count, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

const PAGE_ITEM = "inline-flex size-9 items-center justify-center rounded-control type-label tabular-nums";

export function Pagination({
  page,
  perPage,
  total,
  query = {},
  perPageOptions = [25, 50, 100],
  onNavigate,
  className,
  pageParam = "page",
  perPageParam = "perPage",
}: PaginationProps) {
  const count = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const href = (p: number, pp = perPage) =>
    `?${new URLSearchParams({ ...query, [pageParam]: String(p), [perPageParam]: String(pp) }).toString()}`;
  const nav = (target: string) => {
    if (onNavigate) onNavigate(target);
    else window.location.assign(target);
  };
  const fmt = (n: number) => n.toLocaleString("en-IN");

  const item = (
    p: number,
    label: ReactNode,
    extra?: { rel?: string; aria?: string; disabled?: boolean; current?: boolean },
  ) =>
    extra?.disabled ? (
      <span role="link" aria-disabled="true" aria-label={extra.aria} className={cx(PAGE_ITEM, "text-secondary")}>
        {label}
      </span>
    ) : (
      <a
        href={href(p)}
        rel={extra?.rel}
        aria-label={extra?.aria}
        aria-current={extra?.current ? "page" : undefined}
        onClick={(e) => {
          if (onNavigate) {
            e.preventDefault();
            onNavigate(href(p));
          }
        }}
        className={cx(
          PAGE_ITEM,
          extra?.current ? "bg-inverse text-inverse" : "border border-default text-primary hover:bg-subtle",
        )}
      >
        {label}
      </a>
    );

  return (
    <nav aria-label="Pagination" className={cx("flex flex-wrap items-center justify-between gap-4", className)}>
      <div className="flex items-center gap-4">
        <p className="type-body-sm text-body tabular-nums">
          Showing {fmt(from)}–{fmt(to)} of {fmt(total)}
        </p>
        <label className="relative inline-flex h-9 items-center rounded-control border border-default">
          <span className="sr-only">Rows per page</span>
          <select
            value={perPage}
            onChange={(e) => {
              nav(href(1, Number(e.target.value)));
            }}
            className="h-full cursor-pointer appearance-none bg-transparent pr-8 pl-2.5 type-body-sm text-primary focus-visible:outline-none"
          >
            {perPageOptions.map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size={16} className="pointer-events-none absolute right-2 text-icon-primary" />
        </label>
      </div>
      <div className="flex items-center gap-1.5">
        {item(page - 1, <Icon name="chevron-left" size={16} />, {
          rel: "prev",
          aria: "Previous page",
          disabled: page <= 1,
        })}
        {pageWindow(page, count).map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${String(i)}`} aria-hidden="true" className={cx(PAGE_ITEM, "text-secondary")}>
              …
            </span>
          ) : (
            <span key={p}>{item(p, p, { aria: `Page ${String(p)}`, current: p === page })}</span>
          ),
        )}
        {item(page + 1, <Icon name="chevron-right" size={16} />, {
          rel: "next",
          aria: "Next page",
          disabled: page >= count,
        })}
      </div>
    </nav>
  );
}

/* Figma "Step" (21:284) and the two steppers (21:285 horizontal, 21:314 vertical), for example supplier
   verification: Company profile, Documents, Submitted, Review, Decision. */

export type StepStatus = "complete" | "current" | "upcoming";

export interface StepItem {
  label: string;
  /** Second line, vertical stepper only. */
  detail?: string;
  status: StepStatus;
}

function Marker({ status, n }: { status: StepStatus; n: number }) {
  return (
    <span
      className={cx(
        "flex size-7 shrink-0 items-center justify-center rounded-pill type-label-sm",
        status === "complete" && "bg-accent text-icon-primary",
        status === "current" && "bg-inverse text-inverse",
        status === "upcoming" && "border-[1.5px] border-control bg-page text-secondary",
      )}
    >
      {status === "complete" ? <Icon name="check" size={16} /> : n}
    </span>
  );
}

const STATUS_WORD: Record<StepStatus, string> = { complete: "done", current: "current step", upcoming: "not started" };

export function Stepper({
  steps,
  orientation = "horizontal",
  className,
}: {
  steps: StepItem[];
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  if (orientation === "vertical") {
    return (
      <ol className={cx("flex flex-col gap-5", className)}>
        {steps.map((s, i) => (
          <li key={s.label} aria-current={s.status === "current" ? "step" : undefined} className="flex gap-2.5">
            <Marker status={s.status} n={i + 1} />
            <span className="flex flex-col gap-0.5">
              <span className={cx("type-label", s.status === "upcoming" ? "text-secondary" : "text-primary")}>
                {s.label}
                <span className="sr-only">, {STATUS_WORD[s.status]}</span>
              </span>
              {s.detail ? <span className="type-caption text-secondary">{s.detail}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className={cx("flex flex-wrap items-center gap-3", className)}>
      {steps.map((s, i) => (
        <li
          key={s.label}
          aria-current={s.status === "current" ? "step" : undefined}
          className="flex items-center gap-3"
        >
          {i > 0 ? (
            <span
              aria-hidden="true"
              className={cx("h-0.5 w-12 rounded-pill", s.status === "upcoming" ? "bg-ink-200" : "bg-fresh-500")}
            />
          ) : null}
          <span className="flex items-center gap-2.5">
            <Marker status={s.status} n={i + 1} />
            <span
              className={cx(
                "type-label whitespace-nowrap",
                s.status === "upcoming" ? "text-secondary" : "text-primary",
              )}
            >
              {s.label}
              <span className="sr-only">, {STATUS_WORD[s.status]}</span>
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/* Figma "Menu" (21:372) and "Menu item" (21:371): dropdown for row actions, sort, the user menu and select
   options. Float small shadow. */

export const Menu = RMenu.Root;
export const MenuTrigger = RMenu.Trigger;

export function MenuContent({ className, children, ...rest }: ComponentProps<typeof RMenu.Content>) {
  return (
    <RMenu.Portal>
      <RMenu.Content
        sideOffset={6}
        align="end"
        className={cx(
          "z-50 flex min-w-64 flex-col gap-0.5 rounded-card border border-default bg-page p-2 shadow-ink-float-sm",
          className,
        )}
        {...rest}
      >
        {children}
      </RMenu.Content>
    </RMenu.Portal>
  );
}

const MENU_ITEM = cx(
  "flex h-10 cursor-pointer items-center gap-2.5 rounded-control px-3 type-body-sm text-primary outline-none select-none",
  "data-highlighted:bg-subtle data-disabled:cursor-not-allowed data-disabled:text-secondary",
);

export function MenuItem({
  icon,
  destructive,
  className,
  children,
  ...rest
}: ComponentProps<typeof RMenu.Item> & { icon?: IconName; destructive?: boolean }) {
  return (
    <RMenu.Item className={cx(MENU_ITEM, destructive && "text-error", className)} {...rest}>
      {icon ? (
        <Icon
          name={icon}
          size={20}
          className={destructive ? "text-icon-error" : "text-icon-primary in-data-disabled:text-icon-secondary"}
        />
      ) : null}
      {children}
    </RMenu.Item>
  );
}

/** A choice in a menu (sort order, single select). Selected shows bg/mint and a check. */
export function MenuChoice({
  icon,
  className,
  children,
  ...rest
}: ComponentProps<typeof RMenu.RadioItem> & { icon?: IconName }) {
  return (
    <RMenu.RadioItem className={cx(MENU_ITEM, "data-[state=checked]:bg-mint", className)} {...rest}>
      {icon ? <Icon name={icon} size={20} className="text-icon-primary" /> : null}
      <span className="flex-1">{children}</span>
      <RMenu.ItemIndicator>
        <Icon name="check" size={20} className="text-icon-link" />
      </RMenu.ItemIndicator>
    </RMenu.RadioItem>
  );
}

export const MenuChoices = RMenu.RadioGroup;

export function MenuDivider() {
  return <RMenu.Separator className="my-1 h-px bg-ink-200" />;
}

/* Figma "Side nav item" (21:431): workspace sidebar link with an icon and an optional count of waiting items.
   Sits on the bg/subtle sidebar: hover lifts to bg/page, active is bg/tint. */

export interface SideNavItemProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  icon: IconName;
  active?: boolean;
  count?: number;
  children: ReactNode;
}

export function SideNavItem({ icon, active = false, count, className, children, ...rest }: SideNavItemProps) {
  return (
    <a
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex h-10 items-center gap-3 rounded-control px-3 type-label",
        active ? "bg-tint text-primary" : "text-body hover:bg-page",
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={20} className={active ? "text-icon-primary" : "text-icon-secondary"} />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count ? <CountChip>{count}</CountChip> : null}
    </a>
  );
}

/* Figma "Nav link" (21:444): public header link. The bg/accent underline grows from the left on hover
   (200 ms, standard easing); the open state (mega menu showing) keeps it. */

export function NavLinkStyle({
  open = false,
  chevron = false,
  children,
}: {
  open?: boolean;
  chevron?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      data-open={open || undefined}
      className={cx(
        "relative inline-flex h-9 items-center gap-1 rounded-pill px-3 type-label text-primary",
        "after:absolute after:right-3 after:bottom-px after:left-3 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-[1px] after:bg-accent",
        "after:transition-transform after:duration-(--motion-duration-base) after:ease-standard",
        "group-hover/nav:after:scale-x-100 data-open:after:scale-x-100",
      )}
    >
      {children}
      {chevron ? <Icon name="chevron-down" size={16} className="text-icon-primary" /> : null}
    </span>
  );
}

/** A header link: wrap the framework link with class "group/nav" and put NavLinkStyle inside it. */
export function NavLink({
  open,
  chevron,
  className,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { open?: boolean; chevron?: boolean }) {
  return (
    <a className={cx("group/nav inline-flex rounded-pill", className)} {...rest}>
      <NavLinkStyle open={open} chevron={chevron}>
        {children}
      </NavLinkStyle>
    </a>
  );
}
