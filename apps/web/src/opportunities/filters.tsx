"use client";

import {
  Button,
  Checkbox,
  cx,
  DatePicker,
  Drawer,
  FilterGroup,
  FilterPanel,
  FormField,
  Icon,
  Radio,
  RadioGroup,
  Select,
  Switch,
} from "@h2india/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

// The filters on the tenders, grants and jobs lists (455:1621, 462:4609, 464:6071; phones: the Filters sheet). Every
// choice goes into the address, so a filtered list can be shared and the back button works.

type Option = { value: string; label: string };

export type FilterGroupSpec =
  | {
      kind: "checks";
      name: string;
      title: string;
      options: Option[];
      /** Shown ticked while the address names none (the tenders list starts with open, closing soon and extended). */
      defaults?: string[];
    }
  | { kind: "select"; name: string; title: string; placeholder: string; options: Option[] }
  | { kind: "radio"; name: string; title: string; options: Option[] }
  | { kind: "toggle"; name: string; title: string; label: string }
  | { kind: "dates"; title: string; from: string; to: string };

/** Filter and paging names to keep or drop when a filter changes. */
const PAGING = ["page", "show"];

export function useQuery(anchor = "list") {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const go = (next: URLSearchParams) => {
    for (const p of PAGING) next.delete(p);
    const q = next.toString();
    router.push(q ? `${path}?${q}#${anchor}` : `${path}#${anchor}`, { scroll: false });
  };
  const fresh = () => new URLSearchParams(params.toString());
  const toggle = (name: string, value: string, defaults: string[] = []) => {
    const next = fresh();
    const current = next.getAll(name);
    const values = current.length ? current : defaults;
    next.delete(name);
    for (const v of values.includes(value) ? values.filter((x) => x !== value) : [...values, value])
      next.append(name, v);
    go(next);
  };
  const set = (name: string, value: string) => {
    const next = fresh();
    if (value) next.set(name, value);
    else next.delete(name);
    go(next);
  };
  const clear = (keep: string[]) => {
    const next = new URLSearchParams();
    for (const k of keep) for (const v of params.getAll(k)) next.append(k, v);
    go(next);
  };
  return { params, toggle, set, clear };
}

const isoDay = (d: Date) =>
  `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : undefined);
const EARLIEST = new Date(2020, 0, 1);

function Panel({ groups, anchor, keep }: { groups: FilterGroupSpec[]; anchor: string; keep: string[] }) {
  const { params, toggle, set, clear } = useQuery(anchor);
  return (
    <FilterPanel
      onClear={() => {
        clear(keep);
      }}
    >
      {groups.map((g) => {
        if (g.kind === "checks") {
          const given = params.getAll(g.name);
          const ticked = given.length ? given : (g.defaults ?? []);
          return (
            <FilterGroup key={g.name} title={g.title}>
              {g.options.map((o) => (
                <Checkbox
                  key={o.value}
                  label={o.label}
                  checked={ticked.includes(o.value)}
                  onCheckedChange={() => {
                    toggle(g.name, o.value, g.defaults);
                  }}
                />
              ))}
            </FilterGroup>
          );
        }
        if (g.kind === "select") {
          return (
            <FilterGroup key={g.name} title={g.title}>
              <label>
                <span className="sr-only">{g.title}</span>
                <Select
                  value={params.get(g.name) ?? ""}
                  onChange={(e) => {
                    set(g.name, e.target.value);
                  }}
                >
                  <option value="">{g.placeholder}</option>
                  {g.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </label>
            </FilterGroup>
          );
        }
        if (g.kind === "radio") {
          return (
            <FilterGroup key={g.name} title={g.title}>
              <RadioGroup
                aria-label={g.title}
                value={params.get(g.name) ?? ""}
                onValueChange={(v) => {
                  set(g.name, v);
                }}
              >
                {[{ value: "", label: "Any" }, ...g.options].map((o) => (
                  <Radio key={o.value || "any"} value={o.value} label={o.label} />
                ))}
              </RadioGroup>
            </FilterGroup>
          );
        }
        if (g.kind === "toggle") {
          return (
            <FilterGroup key={g.name} title={g.title}>
              <Switch
                label={g.label}
                checked={params.get(g.name) === "1"}
                onCheckedChange={(on) => {
                  set(g.name, on ? "1" : "");
                }}
              />
            </FilterGroup>
          );
        }
        return (
          <FilterGroup key={g.from} title={g.title}>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="From">
                <DatePicker
                  min={EARLIEST}
                  placeholder="From"
                  value={fromIso(params.get(g.from))}
                  onChange={(d) => {
                    set(g.from, d ? isoDay(d) : "");
                  }}
                />
              </FormField>
              <FormField label="To">
                <DatePicker
                  min={EARLIEST}
                  placeholder="To"
                  value={fromIso(params.get(g.to))}
                  onChange={(d) => {
                    set(g.to, d ? isoDay(d) : "");
                  }}
                />
              </FormField>
            </div>
          </FilterGroup>
        );
      })}
    </FilterPanel>
  );
}

/** The side panel on desktop; a Filters button and sheet on phones. */
export function ListFilters({
  groups,
  count,
  noun,
  anchor = "list",
  keep = ["as", "sort"],
}: {
  groups: FilterGroupSpec[];
  count: number;
  noun: string;
  anchor?: string;
  /** Query names "Clear all" keeps (the view and the sort order). */
  keep?: string[];
}) {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  const active = groups.reduce((n, g) => {
    if (g.kind === "dates") return n + (params.get(g.from) ? 1 : 0) + (params.get(g.to) ? 1 : 0);
    if (g.kind === "checks") return n + params.getAll(g.name).length;
    return n + (params.get(g.name) ? 1 : 0);
  }, 0);
  return (
    <>
      <div className="hidden lg:block">
        <Panel groups={groups} anchor={anchor} keep={keep} />
      </div>
      <div className="lg:hidden">
        <Drawer
          open={open}
          onOpenChange={setOpen}
          title="Filters"
          trigger={
            <Button variant="outline" leadingIcon="sliders">
              Filters{active ? ` · ${String(active)}` : ""}
            </Button>
          }
          footer={
            <Button
              className="w-full"
              onClick={() => {
                setOpen(false);
              }}
            >
              Show {count} {noun}
            </Button>
          }
        >
          <div className="px-6">
            <Panel groups={groups} anchor={anchor} keep={keep} />
          </div>
        </Drawer>
      </div>
    </>
  );
}

/** "Sort by" (455:1621). */
export function SortBy({ options, anchor = "list" }: { options: Option[]; anchor?: string }) {
  const { params, set } = useQuery(anchor);
  return (
    <label className="flex items-center gap-3">
      <span className="type-label-sm text-secondary">Sort by</span>
      <Select
        value={params.get("sort") ?? ""}
        onChange={(e) => {
          set("sort", e.target.value);
        }}
        boxClassName="w-52"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

/** "20 per page" (455:1621). */
export function PerPage({ value, options, anchor = "list" }: { value: number; options: number[]; anchor?: string }) {
  const { set } = useQuery(anchor);
  return (
    <label>
      <span className="sr-only">Tenders per page</span>
      <Select
        value={String(value)}
        onChange={(e) => {
          set("perPage", e.target.value === String(options[0]) ? "" : e.target.value);
        }}
        boxClassName="w-44"
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n} per page
          </option>
        ))}
      </Select>
    </label>
  );
}

/** Table rows that open to show the scope and key dates (455:1621). */
export function ExpandButton({ controls, label }: { controls: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={() => {
        const row = document.getElementById(controls);
        if (row) row.hidden = open;
        setOpen(!open);
      }}
      className="flex size-8 items-center justify-center rounded-pill text-icon-primary hover:bg-subtle"
    >
      <Icon name="chevron-down" size={18} className={cx("transition-transform", open && "rotate-180")} />
      <span className="sr-only">
        {open ? "Hide" : "Show"} details of {label}
      </span>
    </button>
  );
}

/** A filter drawn as a plain dropdown above a table (results 460:4147). */
export function QuerySelect({
  name,
  label,
  placeholder,
  options,
  anchor = "list",
}: {
  name: string;
  label: string;
  placeholder: string;
  options: Option[];
  anchor?: string;
}) {
  const { params, set } = useQuery(anchor);
  return (
    <label>
      <span className="sr-only">{label}</span>
      <Select
        value={params.get(name) ?? ""}
        onChange={(e) => {
          set(name, e.target.value);
        }}
        boxClassName="w-44"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
