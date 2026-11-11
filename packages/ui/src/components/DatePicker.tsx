"use client";

import { Popover as RPopover } from "radix-ui";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "../icons/Icon";
import { cx } from "../lib/cx";
import { useField } from "./Field";
import { Input } from "./Input";

/* Figma "Date picker" (29:1270): single date, used for "Quotes due by" and report ranges. Past dates are muted;
   today has a ring; the selected day is ink-900; typing a date also works. Weeks start on Monday.
   Range mode (span in fresh-200) is added with the reports screens. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const LONG_MONTH = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
const LONG_DAY = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** "12 Nov 2026", the format the design uses. */
export function formatDate(d: Date): string {
  return `${String(d.getDate())} ${MONTHS[d.getMonth()] ?? ""} ${String(d.getFullYear())}`;
}

/** Reads "12 Nov 2026", "12 November 2026", "12/11/2026" or "2026-11-12". Returns undefined if unclear. */
export function parseDate(text: string): Date | undefined {
  const t = text.trim();
  let m = /^(\d{1,2})[\s-]+([A-Za-z]{3,})[\s-]+(\d{4})$/.exec(t);
  if (m) {
    const month = MONTHS.findIndex((x) => x.toLowerCase() === (m?.[2] ?? "").slice(0, 3).toLowerCase());
    if (month >= 0) return valid(Number(m[3]), month, Number(m[1]));
  }
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (m) return valid(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m) return valid(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return undefined;
}

function valid(y: number, mo: number, d: number): Date | undefined {
  const date = new Date(y, mo, d);
  return date.getFullYear() === y && date.getMonth() === mo && date.getDate() === d ? date : undefined;
}

export interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  /** Earliest choosable day. Defaults to today (past dates are muted and disabled). */
  min?: Date;
  placeholder?: string;
  invalid?: boolean;
}

export function DatePicker({ value, onChange, min, placeholder = "12 Nov 2026", invalid }: DatePickerProps) {
  const field = useField();
  const today = useMemo(() => startOfDay(new Date()), []);
  const earliest = min ? startOfDay(min) : today;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value ? formatDate(value) : "");
  const [focusDay, setFocusDay] = useState<Date>(value ?? today);
  const grid = useRef<HTMLDivElement>(null);

  const monthStart = new Date(focusDay.getFullYear(), focusDay.getMonth(), 1);
  const lead = (monthStart.getDay() + 6) % 7; // Monday first
  const days = Array.from({ length: 42 }, (_, i) => addDays(monthStart, i - lead));

  const choose = (d: Date) => {
    if (d < earliest) return;
    onChange(d);
    setText(formatDate(d));
    setOpen(false);
  };

  const move = (d: Date) => {
    setFocusDay(d);
    requestAnimationFrame(() =>
      grid.current?.querySelector<HTMLButtonElement>(`[data-day="${d.toDateString()}"]`)?.focus(),
    );
  };

  const onGridKey = (e: KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const n = step[e.key];
    if (n !== undefined) {
      e.preventDefault();
      move(addDays(focusDay, n));
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      move(new Date(focusDay.getFullYear(), focusDay.getMonth() + (e.key === "PageUp" ? -1 : 1), focusDay.getDate()));
    }
  };

  return (
    <RPopover.Root open={open} onOpenChange={setOpen}>
      <RPopover.Anchor asChild>
        <div>
          <Input
            value={text}
            placeholder={placeholder}
            invalid={invalid}
            autoComplete="off"
            onChange={(e) => {
              setText(e.target.value);
              const parsed = parseDate(e.target.value);
              if (parsed && parsed >= earliest) {
                onChange(parsed);
                setFocusDay(parsed);
              } else if (e.target.value.trim() === "") onChange(undefined);
            }}
            trailing={
              <RPopover.Trigger asChild>
                <button type="button" aria-label="Choose a date" className="rounded-control text-icon-primary">
                  <Icon name="calendar" size={20} />
                </button>
              </RPopover.Trigger>
            }
            aria-describedby={field?.describedBy}
          />
        </div>
      </RPopover.Anchor>
      <RPopover.Portal>
        <RPopover.Content
          align="start"
          sideOffset={8}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            move(value ?? (today < earliest ? earliest : today));
          }}
          className="z-50 flex w-80 flex-col gap-2 rounded-card border border-default bg-page p-4 shadow-ink-float-sm"
        >
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => {
                move(new Date(focusDay.getFullYear(), focusDay.getMonth() - 1, 1));
              }}
              className="rounded-control text-icon-primary"
            >
              <Icon name="chevron-left" size={20} />
            </button>
            <p aria-live="polite" className="flex-1 text-center type-label text-primary">
              {LONG_MONTH.format(focusDay)}
            </p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => {
                move(new Date(focusDay.getFullYear(), focusDay.getMonth() + 1, 1));
              }}
              className="rounded-control text-icon-primary"
            >
              <Icon name="chevron-right" size={20} />
            </button>
          </div>
          <div role="grid" aria-label={LONG_MONTH.format(focusDay)} ref={grid} onKeyDown={onGridKey}>
            <div role="row" className="grid grid-cols-7">
              {WEEKDAYS.map((w) => (
                <span
                  key={w}
                  role="columnheader"
                  className="flex h-5 items-center justify-center type-label-sm text-secondary"
                >
                  {w}
                </span>
              ))}
            </div>
            {Array.from({ length: 6 }, (_, week) => (
              <div key={week} role="row" className="grid grid-cols-7">
                {days.slice(week * 7, week * 7 + 7).map((d) => {
                  const inMonth = d.getMonth() === focusDay.getMonth();
                  const past = d < earliest;
                  const isSelected = value ? sameDay(d, value) : false;
                  return (
                    <span
                      key={d.toDateString()}
                      role="gridcell"
                      aria-selected={isSelected}
                      className="flex h-9 items-center justify-center"
                    >
                      {inMonth ? (
                        <button
                          type="button"
                          data-day={d.toDateString()}
                          tabIndex={sameDay(d, focusDay) ? 0 : -1}
                          aria-label={LONG_DAY.format(d)}
                          aria-current={sameDay(d, today) ? "date" : undefined}
                          disabled={past}
                          onClick={() => {
                            choose(d);
                          }}
                          className={cx(
                            "h-9 w-10 rounded-pill type-body-sm tabular-nums focus-visible:outline-offset-0",
                            isSelected
                              ? "bg-inverse text-inverse"
                              : past
                                ? "cursor-not-allowed text-secondary"
                                : "text-primary hover:bg-subtle",
                            !isSelected && sameDay(d, today) && "border border-focus",
                          )}
                        >
                          {d.getDate()}
                        </button>
                      ) : null}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}
