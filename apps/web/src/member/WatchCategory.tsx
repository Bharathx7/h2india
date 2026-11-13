"use client";

import { FREQUENCIES } from "@h2india/core/alerts/rules";
import { Alert, Button, EmptyState, Icon, Modal, Select, Switch } from "@h2india/ui";
import { useState, useTransition } from "react";
import { saveAlertAction, setAlertOnAction } from "./alert-actions";

// Buyer Alerts (79:3425; phones 132:9656) and Watch a category (275:23289; sheet 276:23283), step 7.3: product alerts
// on a category, emailed when new products are listed.

export interface CategoryOption {
  /** "systems|Electrolysers" */
  value: string;
  /** "Systems › Electrolysers" */
  label: string;
}

export interface WatchRow {
  id: string;
  label: string;
  path: string;
  /** "4 new this week" or "No new products" */
  news: string;
  frequency: string;
  on: boolean;
  filters: Record<string, string[]>;
  channels: string[];
}

function filtersFor(value: string, verified: boolean, states: string[]): Record<string, string[]> {
  const [klass = "", category = ""] = value.split("|");
  return {
    class: [klass],
    category: [category],
    ...(verified ? { badges: ["verified"], ...(states.length ? { state: states } : {}) } : {}),
  };
}

export function WatchCategory({
  rows,
  categories,
  states,
}: {
  rows: WatchRow[];
  categories: CategoryOption[];
  /** The member's states (onboarding 531:101), for "verified suppliers in my states". */
  states: string[];
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(categories[0]?.value ?? "");
  const [frequency, setFrequency] = useState("weekly");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const watch = () => {
    start(async () => {
      const label =
        categories
          .find((c) => c.value === category)
          ?.label.split(" › ")
          .at(-1) ?? "Products";
      const r = await saveAlertAction({
        label,
        type: "products",
        query: "",
        filters: filtersFor(category, verified, states),
        channels: ["email"],
        frequency,
      });
      if (r.ok) setOpen(false);
      else setError(r.error);
    });
  };
  const change = (row: WatchRow, next: string) => {
    start(async () => {
      await saveAlertAction({
        id: row.id,
        label: row.label,
        type: "products",
        query: "",
        filters: row.filters,
        channels: row.channels,
        frequency: next,
      });
    });
  };

  return (
    <>
      <h1 className="type-h2">Alerts</h1>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="type-body text-body">We email you when new products appear in categories you watch.</p>
        <Button
          onClick={() => {
            setOpen(true);
          }}
        >
          <Icon name="bell" size={18} />
          Watch a category
        </Button>
      </div>
      {rows.length ? (
        <ul className="flex flex-col gap-4">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-4 rounded-card border border-default bg-page p-5">
              <div className="min-w-0 flex-1">
                <h2 className="type-h4 text-primary">{r.label}</h2>
                <p className="type-caption text-secondary">
                  {r.path} · {r.news}
                </p>
              </div>
              <Select
                aria-label={`How often for ${r.label}`}
                value={r.frequency}
                onChange={(e) => {
                  change(r, e.target.value);
                }}
                className="w-44"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
              <Switch
                label={r.on ? "On" : "Paused"}
                checked={r.on}
                onCheckedChange={(v) => {
                  start(() => setAlertOnAction(r.id, v));
                }}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-card border border-default bg-page">
          <EmptyState
            title="No categories watched yet"
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(true);
                }}
              >
                Watch a category
              </Button>
            }
          >
            Watch a category and we'll email you when new products are listed in it.
          </EmptyState>
        </div>
      )}
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Watch a category"
        description="We email you when new products are listed. You can pause or change this any time."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button disabled={pending || !category} onClick={watch}>
              Watch category
            </Button>
          </div>
        }
      >
        {error ? <Alert tone="error" title={error} live /> : null}
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Category</span>
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
            }}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">How often</span>
          <Select
            value={frequency}
            onChange={(e) => {
              setFrequency(e.target.value);
            }}
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.digest}
              </option>
            ))}
          </Select>
        </label>
        <Switch
          label="Only products from verified suppliers in my states"
          checked={verified}
          onCheckedChange={setVerified}
        />
      </Modal>
    </>
  );
}
