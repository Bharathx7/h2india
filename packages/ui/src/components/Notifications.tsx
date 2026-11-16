"use client";

import { Popover as RPopover } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { cx } from "../lib/cx";

/* Figma "Notifications" section (365:27773): rows on the notification centre (97:2564, phones 100:4631) and the
   bell panel (97:3168). Unread rows are mint with a green dot; icon, words and dot carry the state, not colour. */

export interface NotificationRowData {
  id: string;
  icon: IconName;
  title: string;
  body?: string | null;
  /** "10:06" today, "3 Nov" before. */
  time: string;
  unread: boolean;
  href?: string | null;
  actionLabel?: string | null;
}

function Dot({ unread }: { unread: boolean }) {
  return unread ? (
    <span className="size-2 shrink-0 rounded-pill bg-accent">
      <span className="sr-only">Unread</span>
    </span>
  ) : null;
}

/** One notification. "page" is the centre's row (with its action link); "panel" is the bell's. */
export function NotificationRow({
  item,
  layout = "page",
  onOpen,
}: {
  item: NotificationRowData;
  layout?: "page" | "panel";
  /** Marks it read when the person follows its link. */
  onOpen?: (id: string) => void;
}) {
  const page = layout === "page";
  return (
    <div
      className={cx(
        "relative flex items-start gap-3.5",
        page ? "px-4 py-4 md:px-6 md:py-4.5" : "px-4 py-3.5",
        item.unread && "bg-mint",
      )}
    >
      <span
        className={cx(
          "flex shrink-0 items-center justify-center rounded-pill border border-default bg-page",
          page ? "size-8 md:size-9" : "size-9",
        )}
      >
        <Icon name={item.icon} size={page ? 18 : 18} className="text-icon-primary" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={cx("text-primary", item.unread ? "type-label" : "type-body-sm")}>
          {item.href && !page ? (
            <a
              href={item.href}
              onClick={() => onOpen?.(item.id)}
              className="rounded-control after:absolute after:inset-0 hover:underline"
            >
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </p>
        {item.body ? <p className="type-body-sm text-secondary">{item.body}</p> : null}
        {page ? <p className="type-caption text-secondary md:hidden">{item.time}</p> : null}
        {page && item.href && item.actionLabel ? (
          <a
            href={item.href}
            onClick={() => onOpen?.(item.id)}
            className="mt-1 inline-flex items-center gap-1 self-start rounded-control type-label text-link hover:text-link-hover"
          >
            {item.actionLabel}
            <Icon name="arrow-right" size={16} />
          </a>
        ) : null}
      </div>
      <div className={cx("flex shrink-0 items-center gap-2", page && "pt-0.5")}>
        <span className={cx("type-caption text-secondary", page && "hidden md:inline")}>{item.time}</span>
        <Dot unread={item.unread} />
      </div>
    </div>
  );
}

/** A card of rows with dividers (97:2564 lists). */
export function NotificationList({ children, label }: { children: ReactNode; label: string }) {
  return (
    <ul
      aria-label={label}
      className="divide-y divide-(color:--border-color-default) overflow-hidden rounded-card border border-default bg-page"
    >
      {children}
    </ul>
  );
}

export interface BellPanelProps {
  items: NotificationRowData[];
  unread: number;
  onMarkAllRead: () => void;
  onOpenChange?: (open: boolean) => void;
  onOpen?: (id: string) => void;
  allHref: string;
  /** While the latest items load. */
  loading?: boolean;
  /** "outline": the public site header's round bordered bell (public QC 4); the workspace top bar is plain. */
  look?: "plain" | "outline";
}

/** The bell in the top bar with its red count, and the panel it opens (97:3168). */
export function BellPanel({
  items,
  unread,
  onMarkAllRead,
  onOpenChange,
  onOpen,
  allHref,
  loading,
  look = "plain",
}: BellPanelProps) {
  const [open, setOpen] = useState(false);
  return (
    <RPopover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        onOpenChange?.(o);
      }}
    >
      <span className="relative inline-flex">
        <RPopover.Trigger asChild>
          <button
            type="button"
            aria-label={unread > 0 ? `Notifications, ${String(unread)} unread` : "Notifications"}
            className={
              look === "outline"
                ? "flex size-10 items-center justify-center rounded-pill border border-control text-icon-primary hover:border-focus hover:bg-subtle"
                : "flex size-10 items-center justify-center rounded-pill text-icon-secondary hover:bg-subtle"
            }
          >
            <Icon name="bell" size={look === "outline" ? 18 : 22} />
          </button>
        </RPopover.Trigger>
        {unread > 0 ? (
          <span
            aria-hidden="true"
            data-testid="bell-count"
            className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-pill border-2 border-page bg-error-strong px-1 type-label-sm text-inverse"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </span>
      <RPopover.Portal>
        <RPopover.Content
          align="end"
          sideOffset={8}
          aria-label="Notifications"
          className="z-50 flex w-100 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-card border border-default bg-page shadow-ink-float-sm"
        >
          <div className="flex items-center justify-between gap-3 border-b border-default px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="type-h4">Notifications</h2>
              {unread > 0 ? (
                <span className="rounded-pill bg-subtle px-2 py-0.5 type-label-sm text-primary">{unread} new</span>
              ) : null}
            </div>
            {unread > 0 ? (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="rounded-control type-label text-link hover:text-link-hover"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <ul
            className="max-h-[60vh] divide-y divide-(color:--border-color-default) overflow-y-auto"
            aria-busy={loading}
          >
            {items.length === 0 ? (
              <li className="px-5 py-8 text-center type-body-sm text-secondary">
                {loading ? "Loading…" : "You're all caught up."}
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <NotificationRow item={n} layout="panel" onOpen={onOpen} />
                </li>
              ))
            )}
          </ul>
          <div className="flex justify-center border-t border-default py-3.5">
            <a
              href={allHref}
              className="inline-flex items-center gap-1 rounded-control type-label text-link hover:text-link-hover"
            >
              See all notifications
              <Icon name="arrow-right" size={16} />
            </a>
          </div>
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}
