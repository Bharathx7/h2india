"use client";

import {
  AsyncSection,
  Button,
  EmptyState,
  FilterChip,
  FormField,
  OtpInput,
  Skeleton,
  StatusBadge,
  type AsyncState,
} from "@h2india/ui";
import { useState } from "react";

export function OtpDemo() {
  const [code, setCode] = useState("");
  const [bad, setBad] = useState("482916");
  return (
    <div className="flex flex-wrap gap-10">
      <FormField label="Code from your email" helper="Six digits. Pasting fills every box.">
        <OtpInput value={code} onChange={setCode} />
      </FormField>
      <FormField label="Code from your email" error="That code is not right. Check the latest email and try again.">
        <OtpInput value={bad} onChange={setBad} />
      </FormField>
    </div>
  );
}

export function FilterChipsDemo() {
  const [filters, setFilters] = useState(["Pressure: 30–350 bar", "Delivery: Maharashtra"]);
  return (
    <>
      {filters.map((f) => (
        <FilterChip
          key={f}
          label={f}
          onRemove={() => {
            setFilters((all) => all.filter((x) => x !== f));
          }}
        />
      ))}
      {filters.length === 0 ? <span className="type-body-sm text-secondary">All filters removed.</span> : null}
    </>
  );
}

/** A list that loads data, showing every required state. The page's ?state= parameter forces one. */
export function AsyncDemo({ forced }: { forced?: AsyncState }) {
  const [state, setState] = useState<AsyncState>(forced ?? "ready");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {(["loading", "empty", "error", "ready"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === state ? "secondary" : "outline"}
            onClick={() => {
              setState(s);
            }}
          >
            {s}
          </Button>
        ))}
      </div>
      <div className="rounded-card border border-default">
        <AsyncSection
          state={state}
          label="Your quote requests"
          onRetry={() => {
            setState("ready");
          }}
          skeleton={
            <>
              <Skeleton kind="table-row" />
              <Skeleton kind="table-row" />
              <Skeleton kind="table-row" />
            </>
          }
          empty={
            <EmptyState kind="first-use" title="No quote requests yet" action={<Button>Request a quote</Button>}>
              Ask several suppliers for a price on the same specification and compare their quotes side by side.
            </EmptyState>
          }
        >
          <ul>
            {[
              ["RFQ-2026-000112", "PEM electrolyser stack, 1 MW", "Open"],
              ["RFQ-2026-000108", "Hydrogen leak detector, ATEX", "Closed"],
            ].map(([ref, what, status]) => (
              <li key={ref} className="flex items-center gap-6 border-b border-default px-4 py-3.5 last:border-b-0">
                <span className="w-40 type-spec text-secondary">{ref}</span>
                <span className="flex-1 type-body-sm text-primary">{what}</span>
                <StatusBadge status={status ?? "Open"} />
              </li>
            ))}
          </ul>
        </AsyncSection>
      </div>
    </div>
  );
}
