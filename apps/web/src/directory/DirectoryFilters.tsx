"use client";

import { directorySearch, type DirectoryQuery, type DirectoryResult } from "@h2india/core/directory/rules";
import { Checkbox, FilterGroup, FilterPanel } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// The directory's filter panel (477:40): state, technology and badges, each with counts. Choices go into the address.

export function DirectoryFilters({ query, facets }: { query: DirectoryQuery; facets: DirectoryResult["facets"] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [allStates, setAllStates] = useState(false);
  const [allTech, setAllTech] = useState(false);
  const go = (change: Partial<DirectoryQuery>) => {
    start(() => {
      router.push(`/directory/companies${directorySearch(query, { ...change, page: 1 })}`, { scroll: false });
    });
  };
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const n = (c: number) => ` · ${c.toLocaleString("en-IN")}`;
  const more = "self-start type-label-sm text-link hover:text-link-hover";
  return (
    <FilterPanel
      onClear={() => {
        go({ states: [], tech: [], verified: false });
      }}
    >
      <FilterGroup title="State">
        {(allStates ? facets.states : facets.states.slice(0, 5)).map((s) => (
          <Checkbox
            key={s.value}
            label={`${s.value}${n(s.count)}`}
            checked={query.states.includes(s.value)}
            onCheckedChange={() => {
              go({ states: toggle(query.states, s.value) });
            }}
          />
        ))}
        {facets.states.length > 5 && !allStates ? (
          <button
            type="button"
            className={more}
            onClick={() => {
              setAllStates(true);
            }}
          >
            Show all {facets.states.length} states and UTs
          </button>
        ) : null}
      </FilterGroup>
      {facets.tech.length ? (
        <FilterGroup title="Technology">
          {(allTech ? facets.tech : facets.tech.slice(0, 5)).map((t) => (
            <Checkbox
              key={t.value}
              label={`${t.value}${n(t.count)}`}
              checked={query.tech.includes(t.value)}
              onCheckedChange={() => {
                go({ tech: toggle(query.tech, t.value) });
              }}
            />
          ))}
          {facets.tech.length > 5 && !allTech ? (
            <button
              type="button"
              className={more}
              onClick={() => {
                setAllTech(true);
              }}
            >
              Show {facets.tech.length - 5} more
            </button>
          ) : null}
        </FilterGroup>
      ) : null}
      <FilterGroup title="Badges">
        <Checkbox
          label={`Verified by H2 India${n(facets.verified)}`}
          checked={query.verified}
          onCheckedChange={(v) => {
            go({ verified: v === true });
          }}
        />
      </FilterGroup>
    </FilterPanel>
  );
}
