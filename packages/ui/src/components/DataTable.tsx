"use client";

import type { ReactNode } from "react";
import { Icon } from "../icons/Icon";
import { cx } from "../lib/cx";
import { Checkbox } from "./Choice";
import { Skeleton } from "./Feedback";

/* Figma "Data table" (27:1466): the shared table for every list screen. Toolbar (search, filter chips, saved
   view, at most 5 actions); selecting rows swaps the toolbar for the ink-900 bulk bar; sortable headers; money
   right-aligned in mono; status as a badge; a row action menu; pagination at the bottom. Loading = skeleton
   rows; Empty replaces the body. Rows become cards below 768 px. */

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  /** Money and quantities: right-aligned in IBM Plex Mono. */
  numeric?: boolean;
  /** Fixed width in px at desktop, as in Figma. */
  width?: number;
  /** Hide on the phone card (for example a column already shown in the card title). */
  hideOnCard?: boolean;
}

export type SortDirection = "asc" | "desc";

export interface DataTableProps<T> {
  /** Accessible name, for example "Products awaiting review". */
  label: string;
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** The column whose value titles each phone card. */
  cardTitle: (row: T) => ReactNode;
  state?: "loading" | "ready";
  empty?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  sort?: { key: string; direction: SortDirection };
  onSortChange?: (sort: { key: string; direction: SortDirection }) => void;
  selectable?: boolean;
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  /** Shown in the bulk bar when rows are selected (small buttons). */
  bulkActions?: ReactNode;
  rowActions?: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({
  label,
  columns,
  rows,
  getRowId,
  cardTitle,
  state = "ready",
  empty,
  toolbar,
  footer,
  sort,
  onSortChange,
  selectable = false,
  selected = [],
  onSelectedChange,
  bulkActions,
  rowActions,
  className,
}: DataTableProps<T>) {
  const ids = rows.map(getRowId);
  const allChecked = ids.length > 0 && ids.every((id) => selected.includes(id));
  const someChecked = !allChecked && ids.some((id) => selected.includes(id));
  const toggle = (id: string) => {
    onSelectedChange?.(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  const isEmpty = state === "ready" && rows.length === 0;

  return (
    <section
      aria-label={label}
      data-state={state === "loading" ? "loading" : isEmpty ? "empty" : "ready"}
      aria-busy={state === "loading"}
      className={cx("overflow-hidden rounded-card border border-default bg-page", className)}
    >
      {selected.length > 0 ? (
        <div
          data-surface="inverse"
          className="flex min-h-15 flex-wrap items-center gap-3 border-b border-default bg-inverse px-4 py-3"
        >
          <p className="type-label text-inverse" aria-live="polite">
            {selected.length} selected
          </p>
          <div className="flex-1" />
          {bulkActions}
          <button
            type="button"
            onClick={() => onSelectedChange?.([])}
            className="rounded-control type-label text-inverse hover:underline"
          >
            Clear
          </button>
        </div>
      ) : toolbar ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-default px-4 py-3">{toolbar}</div>
      ) : null}

      {/* Desktop and tablet: a real table. */}
      <table className="hidden w-full border-collapse md:table">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr className="border-b border-default bg-subtle">
            {selectable ? (
              <th scope="col" className="w-12 px-3">
                <Checkbox
                  label={<span className="sr-only">Select all rows</span>}
                  checked={allChecked ? true : someChecked ? "indeterminate" : false}
                  onCheckedChange={(v) => onSelectedChange?.(v === true ? ids : [])}
                  disabled={state === "loading" || rows.length === 0}
                />
              </th>
            ) : null}
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                  style={c.width ? { width: c.width } : undefined}
                  className={cx("h-11 px-3 type-label-sm text-body", c.numeric ? "text-right" : "text-left")}
                >
                  {c.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSortChange({ key: c.key, direction: active && sort.direction === "asc" ? "desc" : "asc" });
                      }}
                      className={cx(
                        "inline-flex items-center gap-1 rounded-control hover:text-primary",
                        c.numeric && "flex-row-reverse",
                      )}
                    >
                      {c.header}
                      <Icon
                        name="arrow-up-down"
                        size={14}
                        className={active ? "text-icon-primary" : "text-icon-secondary"}
                      />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
            {rowActions ? (
              <th scope="col" className="w-12 px-3">
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {state === "loading" ? (
            Array.from({ length: 5 }, (_, i) => (
              <tr key={i}>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className="p-0">
                  <Skeleton kind="table-row" />
                </td>
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className="py-4">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const id = getRowId(row);
              const isSelected = selected.includes(id);
              return (
                <tr key={id} className={cx("h-12 border-b border-default last:border-b-0", isSelected && "bg-mint")}>
                  {selectable ? (
                    <td className="px-3">
                      <Checkbox
                        label={<span className="sr-only">Select row</span>}
                        checked={isSelected}
                        onCheckedChange={() => {
                          toggle(id);
                        }}
                      />
                    </td>
                  ) : null}
                  {columns.map((c) => (
                    <td key={c.key} className={cx("px-3 type-body-sm text-body", c.numeric && "text-right type-spec")}>
                      {c.render(row)}
                    </td>
                  ))}
                  {rowActions ? <td className="px-3 text-right">{rowActions(row)}</td> : null}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Phones: each row becomes a card. */}
      <div className="md:hidden">
        {state === "loading" ? (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton kind="card" />
            <Skeleton kind="card" />
          </div>
        ) : isEmpty ? (
          empty
        ) : (
          <ul className="flex flex-col gap-3 p-4">
            {rows.map((row) => {
              const id = getRowId(row);
              const isSelected = selected.includes(id);
              return (
                <li key={id} className={cx("rounded-card border border-default p-4", isSelected && "bg-mint")}>
                  <div className="flex items-start gap-3">
                    {selectable ? (
                      <Checkbox
                        label={<span className="sr-only">Select row</span>}
                        checked={isSelected}
                        onCheckedChange={() => {
                          toggle(id);
                        }}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 type-label text-primary">{cardTitle(row)}</div>
                    {rowActions ? rowActions(row) : null}
                  </div>
                  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                    {columns
                      .filter((c) => !c.hideOnCard)
                      .map((c) => (
                        <div key={c.key} className="contents">
                          <dt className="type-caption text-secondary">{c.header}</dt>
                          <dd className={cx("type-body-sm text-body", c.numeric && "type-spec")}>{c.render(row)}</dd>
                        </div>
                      ))}
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {footer ? <div className="border-t border-default px-4 py-3">{footer}</div> : null}
    </section>
  );
}
