"use client";

import { buttonClasses, Checkbox, EmptyState } from "@h2india/ui";
import Link from "next/link";
import { useState } from "react";

// "Where India's hydrogen is being built" (796:7867): the layers and their counts. The map itself comes with the map
// component (step 6.6, M7); until then its place lists the states each turned-on layer covers. All layers off shows
// the drawn empty state (800:8303).

export interface Layer {
  key: string;
  label: string;
  count: number;
  states: string[];
}

export function MapLayers({ layers }: { layers: Layer[] }) {
  const [on, setOn] = useState<string[]>(layers.filter((l) => l.key !== "pilots").map((l) => l.key));
  const shown = layers.filter((l) => on.includes(l.key));
  const byState = new Map<string, number>();
  for (const l of shown) for (const s of l.states) byState.set(s, (byState.get(s) ?? 0) + 1);
  return (
    <section
      aria-labelledby="map-title"
      className="grid gap-6 rounded-card border border-default bg-page p-5 md:grid-cols-[16rem_1fr]"
    >
      <div className="flex flex-col gap-3">
        <h2 id="map-title" className="type-h4 text-primary">
          Where India&apos;s hydrogen is being built
        </h2>
        <p className="type-body-sm text-body">Turn layers on or off. Each record shows its source.</p>
        <ul className="flex flex-col gap-2">
          {layers.map((l) => (
            <li key={l.key} className="flex items-center justify-between gap-2">
              <Checkbox
                label={l.label}
                checked={on.includes(l.key)}
                onCheckedChange={() => {
                  setOn((x) => (x.includes(l.key) ? x.filter((k) => k !== l.key) : [...x, l.key]));
                }}
              />
              <span className="type-spec text-secondary">{l.count}</span>
            </li>
          ))}
        </ul>
        <Link href="/tracker/projects?as=map" className={buttonClasses({ variant: "outline", size: "sm" })}>
          Open the full map
        </Link>
      </div>
      {shown.length === 0 ? (
        <div className="flex min-h-72 items-center justify-center rounded-card bg-subtle">
          <EmptyState kind="no-results" title="Turn on a layer to see the map">
            All layers are off. Projects, factories, stations, pilot routes and hubs each have their own layer.
          </EmptyState>
        </div>
      ) : (
        <div
          role="img"
          aria-label={`India map with ${String(byState.size)} states marked. The interactive map comes later; every record is in the tracker views.`}
          className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-card bg-subtle p-6"
        >
          <p className="type-caption text-secondary">India map · records by state</p>
          <ul className="flex max-w-120 flex-wrap justify-center gap-2">
            {[...byState]
              .sort((a, b) => b[1] - a[1])
              .map(([s, n]) => (
                <li
                  key={s}
                  className="inline-flex items-center gap-1.5 rounded-pill bg-page px-2.5 py-1 type-label-sm text-primary"
                >
                  <span className="flex size-5 items-center justify-center rounded-pill bg-inverse type-label-sm text-inverse">
                    {n}
                  </span>
                  {s}
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}
