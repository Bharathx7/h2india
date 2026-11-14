"use client";

import { Button, Checkbox, cx, Drawer, FilterGroup, FilterPanel, Icon, Select } from "@h2india/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

// The schemes hub's filters (411:9; phones: Filters sheet 412:1379). Every choice goes into the address, so a filtered
// list can be shared and the back button works.

export interface FilterOptions {
  agencies: string[];
  states: { value: string; label: string }[];
  who: string[];
  benefits: string[];
  statuses: string[];
}

const LEVELS = [
  { value: "", label: "All" },
  { value: "central", label: "Central" },
  { value: "state", label: "State" },
];

const SHOWN_AGENCIES = 5;

function useFilters() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const go = (next: URLSearchParams) => {
    next.delete("show");
    const q = next.toString();
    router.push(q ? `${path}?${q}#all` : `${path}#all`, { scroll: false });
  };
  const toggle = (name: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    const values = next.getAll(name);
    next.delete(name);
    for (const v of values.includes(value) ? values.filter((x) => x !== value) : [...values, value])
      next.append(name, v);
    go(next);
  };
  const set = (name: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    go(next);
  };
  const clear = () => {
    const next = new URLSearchParams();
    const q = params.get("q");
    if (q) next.set("q", q);
    go(next);
  };
  return { params, toggle, set, clear };
}

function Panel({ options }: { options: FilterOptions }) {
  const { params, toggle, set, clear } = useFilters();
  const [allAgencies, setAllAgencies] = useState(false);
  const agencies = allAgencies ? options.agencies : options.agencies.slice(0, SHOWN_AGENCIES);
  const level = params.get("level") ?? "";
  const checks = (name: string, values: string[]) =>
    values.map((v) => (
      <Checkbox
        key={v}
        label={v}
        checked={params.getAll(name).includes(v)}
        onCheckedChange={() => {
          toggle(name, v);
        }}
      />
    ));
  return (
    <FilterPanel onClear={clear}>
      <FilterGroup title="Level">
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              aria-pressed={level === l.value}
              onClick={() => {
                set("level", l.value);
              }}
              className={cx(
                "inline-flex h-8 items-center rounded-pill border-[1.5px] px-2.75 type-label",
                level === l.value
                  ? "border-transparent bg-inverse text-inverse"
                  : "border-control bg-page text-primary hover:border-focus",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </FilterGroup>
      {options.agencies.length ? (
        <FilterGroup title="Ministry or agency">
          {checks("agency", agencies)}
          {options.agencies.length > SHOWN_AGENCIES ? (
            <button
              type="button"
              onClick={() => {
                setAllAgencies((x) => !x);
              }}
              className="self-start type-label-sm text-link hover:underline"
            >
              {allAgencies ? "Show fewer" : `+ ${String(options.agencies.length - SHOWN_AGENCIES)} more`}
            </button>
          ) : null}
        </FilterGroup>
      ) : null}
      <FilterGroup title="State">
        <label>
          <span className="sr-only">State</span>
          <Select
            value={params.get("state") ?? ""}
            onChange={(e) => {
              set("state", e.target.value);
            }}
          >
            <option value="">All states and UTs</option>
            {options.states.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
      </FilterGroup>
      <FilterGroup title="Who can apply">{checks("who", options.who)}</FilterGroup>
      <FilterGroup title="Benefit type">{checks("benefit", options.benefits)}</FilterGroup>
      <FilterGroup title="Status">{checks("status", options.statuses)}</FilterGroup>
    </FilterPanel>
  );
}

/** The side panel on desktop; a Filters button and sheet on phones. */
export function SchemeFilters({ options, count, total }: { options: FilterOptions; count: number; total: number }) {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  const active =
    ["level", "state"].filter((n) => params.get(n)).length +
    ["agency", "who", "benefit", "status"].reduce((n, k) => n + params.getAll(k).length, 0);
  return (
    <>
      <div className="hidden lg:block">
        <Panel options={options} />
      </div>
      <div className="lg:hidden">
        <Drawer
          open={open}
          onOpenChange={setOpen}
          title="Filters"
          trigger={
            <Button variant="outline" leadingIcon="sliders" className="w-full">
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
              Show {count} of {total} schemes
            </Button>
          }
        >
          <div className="px-6">
            <Panel options={options} />
          </div>
        </Drawer>
      </div>
    </>
  );
}

/** "Sort by" (411:9). */
export function SortSelect() {
  const { params, set } = useFilters();
  return (
    <label className="flex items-center gap-3">
      <span className="type-label-sm text-secondary">Sort by</span>
      <Select
        value={params.get("sort") ?? ""}
        onChange={(e) => {
          set("sort", e.target.value);
        }}
        boxClassName="w-48"
      >
        <option value="">Next deadline</option>
        <option value="name">Name</option>
        <option value="verified">Recently verified</option>
      </Select>
    </label>
  );
}

/** The applied filters as chips that remove themselves (411:9). */
export function ActiveFilters({ chips }: { chips: { name: string; value: string; label: string }[] }) {
  const { toggle, set } = useFilters();
  if (!chips.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Applied filters">
      {chips.map((c) => (
        <li key={`${c.name}-${c.value}`}>
          <button
            type="button"
            onClick={() => {
              if (c.name === "level" || c.name === "state" || c.name === "q") set(c.name, "");
              else toggle(c.name, c.value);
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-inverse px-3 type-label text-inverse"
          >
            {c.label}
            <Icon name="x" size={14} />
            <span className="sr-only">: remove this filter</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
