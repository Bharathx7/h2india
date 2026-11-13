"use client";

import type { Boost } from "@h2india/core/search";
import { Alert, Button, Input, Select } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { boostsAction, synonymsAction } from "./actions";

// Synonyms and boosted results (707:281), step 11.3. Saving changes the live search at once.

const INDEXES = [
  "products",
  "companies",
  "articles",
  "schemes",
  "tenders",
  "grants",
  "events",
  "jobs",
  "knowledge",
  "tracker",
];

export function SynonymEditor({ groups, prefill }: { groups: string[][]; prefill: string }) {
  const router = useRouter();
  const [words, setWords] = useState(prefill);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const save = (next: string[][]) => {
    start(async () => {
      const r = await synonymsAction(next);
      setError(r.ok ? "" : r.error);
      if (r.ok) {
        setWords("");
        router.refresh();
      }
    });
  };
  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="error" title={error} live /> : null}
      <label className="flex flex-col gap-1.5">
        <span className="type-label">Add a synonym group</span>
        <span className="flex gap-2">
          <Input
            value={words}
            placeholder="type 4, type iv, t4"
            onChange={(e) => {
              setWords(e.target.value);
            }}
          />
          <Button
            disabled={pending || words.split(",").filter((w) => w.trim()).length < 2}
            onClick={() => {
              save([
                ...groups,
                words
                  .split(",")
                  .map((w) => w.trim())
                  .filter(Boolean),
              ]);
            }}
          >
            Add synonym
          </Button>
        </span>
        <span className="type-caption text-secondary">Words separated by commas. Each matches the others.</span>
      </label>
      <ul className="flex flex-col divide-y divide-default">
        {groups.map((g, i) => (
          <li key={g.join("|")} className="flex items-center justify-between gap-3 py-2">
            <span className="type-body-sm">
              <span className="type-label">{g[0]}</span> · also matches {g.slice(1).join(", ")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                save(groups.filter((_, j) => j !== i));
              }}
            >
              Remove<span className="sr-only"> {g[0]}</span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BoostEditor({ boosts }: { boosts: Boost[] }) {
  const router = useRouter();
  const [f, setF] = useState<Boost>({ query: "", index: "schemes", documentId: "", label: "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const save = (next: Boost[]) => {
    start(async () => {
      const r = await boostsAction(next);
      setError(r.ok ? "" : r.error);
      if (r.ok) router.refresh();
    });
  };
  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="error" title={error} live /> : null}
      <div className="grid gap-2 md:grid-cols-2">
        <Input
          aria-label="Search"
          placeholder="Search, e.g. sight"
          value={f.query}
          onChange={(e) => {
            setF({ ...f, query: e.target.value });
          }}
        />
        <Select
          aria-label="Index"
          value={f.index}
          onChange={(e) => {
            setF({ ...f, index: e.target.value as Boost["index"] });
          }}
        >
          {INDEXES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
        <Input
          aria-label="Record id in search"
          placeholder="Record id, e.g. schemes-12"
          value={f.documentId}
          onChange={(e) => {
            setF({ ...f, documentId: e.target.value });
          }}
        />
        <Input
          aria-label="Label"
          placeholder="Label, e.g. Scheme · SIGHT Component II"
          value={f.label}
          onChange={(e) => {
            setF({ ...f, label: e.target.value });
          }}
        />
      </div>
      <Button
        className="self-start"
        variant="outline"
        disabled={pending || !f.query || !f.documentId}
        onClick={() => {
          save([...boosts, f]);
        }}
      >
        Add boosted result
      </Button>
      <ul className="flex flex-col divide-y divide-default">
        {boosts.map((b, i) => (
          <li key={`${b.query}${b.documentId}`} className="flex items-center justify-between gap-3 py-2">
            <span>
              <span className="block type-caption text-secondary">Shown first for &quot;{b.query}&quot;</span>
              <span className="block type-label">{b.label || b.documentId}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                save(boosts.filter((_, j) => j !== i));
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
