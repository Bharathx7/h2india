"use client";

import { Popover as RPopover } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { cx } from "../lib/cx";
import { StatusBadge } from "./Badges";
import { Button } from "./Button";
import { FormField } from "./Field";
import { IconButton } from "./IconButton";
import { Input } from "./Input";
import { Tab, TabList, Tabs } from "./Navigation";
import { Textarea } from "./Textarea";

/* Figma "Filter panel" (27:1467): facets come from the category's attribute schema. Each group is a titled
   block with a rule under it; ranges carry units. */

export function FilterPanel({
  onClear,
  children,
  className,
}: {
  onClear?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label="Filters" className={cx("flex w-full flex-col", className)}>
      <div className="flex items-center justify-between border-b border-default pb-4">
        <h2 className="type-h4">Filters</h2>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-control type-label-sm text-link hover:text-link-hover"
          >
            Clear all
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function FilterGroup({
  title,
  aside,
  children,
  note,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  note?: string;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3 border-b border-default py-4">
      <div className="flex items-center justify-between">
        <legend className="float-left type-label text-primary">{title}</legend>
        {aside}
      </div>
      {children}
      {note ? <p className="type-caption text-secondary">{note}</p> : null}
    </fieldset>
  );
}

/** A min and max pair with units, for example rated power in kW. */
export function RangeFilter({
  unit,
  min,
  max,
  onChange,
  label,
}: {
  unit: string;
  min: string;
  max: string;
  onChange: (range: { min: string; max: string }) => void;
  label: string;
}) {
  return (
    <div className="flex gap-2">
      <Input
        aria-label={`${label}, minimum (${unit})`}
        inputMode="decimal"
        placeholder="Min"
        suffix={unit}
        value={min}
        onChange={(e) => {
          onChange({ min: e.target.value, max });
        }}
      />
      <Input
        aria-label={`${label}, maximum (${unit})`}
        inputMode="decimal"
        placeholder="Max"
        suffix={unit}
        value={max}
        onChange={(e) => {
          onChange({ min, max: e.target.value });
        }}
      />
    </div>
  );
}

/* Figma "Review panel" (27:1623): shared admin decision panel for supplier and product review. Automatic
   checks, a note that is required for Request changes and Reject, then the next item opens. */

export interface ReviewCheck {
  ok: boolean;
  text: string;
}

export interface ReviewPanelProps {
  status: string;
  checks: ReviewCheck[];
  history: string[];
  onDecision: (decision: "approve" | "changes" | "reject", note: string) => void;
  busy?: boolean;
}

export function ReviewPanel({ status, checks, history, onDecision, busy }: ReviewPanelProps) {
  const [note, setNote] = useState("");
  const [needNote, setNeedNote] = useState(false);
  const decide = (d: "approve" | "changes" | "reject") => {
    if (d !== "approve" && note.trim() === "") {
      setNeedNote(true);
      return;
    }
    setNeedNote(false);
    onDecision(d, note.trim());
  };
  return (
    <section
      aria-label="Decision"
      className="flex w-full max-w-95 flex-col gap-4 rounded-card border border-default bg-page p-6"
    >
      <div className="flex items-center gap-2">
        <h2 className="flex-1 type-h3">Decision</h2>
        <StatusBadge status={status} />
      </div>
      <p className="type-eyebrow text-secondary">Checks</p>
      <ul className="flex flex-col gap-2">
        {checks.map((c) => (
          <li key={c.text} className="flex items-start gap-2 type-body-sm text-primary">
            <Icon
              name={c.ok ? "check-circle" : "alert-triangle"}
              size={18}
              label={c.ok ? "Passed" : "Needs attention"}
              className={cx("mt-0.5", c.ok ? "text-icon-success" : "text-icon-warning")}
            />
            {c.text}
          </li>
        ))}
      </ul>
      <FormField
        label="Note to the supplier (required to request changes or reject)"
        error={needNote ? "Write a note before you request changes or reject." : undefined}
      >
        <Textarea
          maxLength={1000}
          showCount
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
          }}
        />
      </FormField>
      <div className="flex flex-col gap-2">
        <Button
          className="w-full"
          onClick={() => {
            decide("approve");
          }}
          disabled={busy}
        >
          Approve
        </Button>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => {
            decide("changes");
          }}
          disabled={busy}
        >
          Request changes
        </Button>
        <Button
          className="w-full"
          variant="ghost"
          onClick={() => {
            decide("reject");
          }}
          disabled={busy}
        >
          Reject
        </Button>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-default pt-2">
        <p className="type-eyebrow text-secondary">History</p>
        <ul className="flex flex-col gap-1.5">
          {history.map((h) => (
            <li key={h} className="type-caption text-body">
              {h}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* Figma "Notification centre" (27:1692): bell popover in every shell. Quote, order and review events that
   match the emails already sent; unread items have a mint background and a dot. */

export interface NotificationItem {
  id: string;
  icon: IconName;
  iconColour?: "primary" | "success";
  title: string;
  detail: string;
  time: string;
  unread: boolean;
  href: string;
}

export function NotificationCentre({
  items,
  onMarkAllRead,
  allHref,
}: {
  items: NotificationItem[];
  onMarkAllRead: () => void;
  allHref: string;
}) {
  const [tab, setTab] = useState("all");
  const unread = items.filter((i) => i.unread);
  const shown = tab === "unread" ? unread : items;
  return (
    <RPopover.Root>
      <span className="relative inline-flex">
        <RPopover.Trigger asChild>
          <IconButton
            icon="bell"
            look="outline"
            label={unread.length > 0 ? `Notifications, ${String(unread.length)} unread` : "Notifications"}
          />
        </RPopover.Trigger>
        {unread.length > 0 ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1 right-1 size-2 rounded-pill bg-accent"
          />
        ) : null}
      </span>
      <RPopover.Portal>
        <RPopover.Content
          align="end"
          sideOffset={8}
          className="z-50 flex w-95 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-card border border-default bg-page shadow-ink-float-sm"
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h2 className="type-h4">Notifications</h2>
            <button
              type="button"
              onClick={onMarkAllRead}
              className="rounded-control type-label text-link hover:text-link-hover"
            >
              Mark all as read
            </button>
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabList aria-label="Show" className="gap-5 px-5">
              <Tab value="all">All</Tab>
              <Tab value="unread">
                Unread
                <span className="rounded-pill bg-subtle px-2 type-label-sm text-primary">{unread.length}</span>
              </Tab>
            </TabList>
          </Tabs>
          <ul className="max-h-[60vh] overflow-y-auto">
            {shown.length === 0 ? (
              <li className="px-5 py-8 text-center type-body-sm text-secondary">You are all caught up.</li>
            ) : (
              shown.map((n) => (
                <li key={n.id}>
                  <a
                    href={n.href}
                    className={cx(
                      "flex items-start gap-3 border-b border-default px-5 py-3.5 hover:bg-subtle",
                      n.unread && "bg-mint",
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-tint">
                      <Icon
                        name={n.icon}
                        size={18}
                        className={n.iconColour === "success" ? "text-icon-success" : "text-icon-primary"}
                      />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="type-label text-primary">{n.title}</span>
                      <span className="type-caption text-body">{n.detail}</span>
                      <span className="type-caption text-secondary">{n.time}</span>
                    </span>
                    {n.unread ? (
                      <span className="mt-1.5 size-2 shrink-0 rounded-pill bg-accent">
                        <span className="sr-only">Unread</span>
                      </span>
                    ) : null}
                  </a>
                </li>
              ))
            )}
          </ul>
          <div className="flex justify-center pt-3 pb-3.5">
            <a href={allHref} className="rounded-control type-label text-link hover:text-link-hover">
              View all notifications
            </a>
          </div>
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}
