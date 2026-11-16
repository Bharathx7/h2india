"use client";

import type { CompanyMatch } from "@h2india/core/companies";
import { Button, FormField, Icon, Input, Skeleton } from "@h2india/ui";
import { useEffect, useState } from "react";
import { findCompanies } from "../actions";
import { Progress } from "./Progress";

// Join step 2 (Figma 525:84; loading 526:384): search companies by name or GSTIN; ask to join one, or create one.

export function FindStep(props: {
  onPick: (organisationId: string | null) => void;
  /** Back to "How you'll use H2 India"; none on a sign-up page for one kind of account. */
  onBack?: () => void;
  busy: boolean;
}) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ q: string; items: CompanyMatch[] } | null>(null);
  const q = query.trim();

  useEffect(() => {
    if (q.length < 2) return;
    let live = true;
    const timer = setTimeout(() => {
      void findCompanies(q).then((r) => {
        if (live) setFound({ q, items: r.ok ? r.value : [] });
      });
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q]);

  const loading = q.length >= 2 && found?.q !== q;
  const results = q.length >= 2 && found?.q === q ? found.items : null;

  return (
    <>
      <Progress step={2} of={4} label="Your company" />
      <h1 className="type-h2 text-primary">Find your company</h1>
      <p className="type-body text-body">Search by company name or GSTIN. Your colleagues may already be here.</p>
      <FormField label="Company name or GSTIN">
        <Input
          leadingIcon="search"
          type="search"
          autoComplete="organization"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
        />
      </FormField>
      {loading ? (
        <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
          <p className="type-caption text-secondary">Searching companies…</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-6 border-b border-default py-3">
              <Skeleton className="h-3 w-30" />
              <Skeleton className="h-3 w-50" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : results ? (
        <ul
          aria-label="Companies"
          className="flex flex-col overflow-hidden rounded-card border border-default bg-page shadow-ink-float-sm"
        >
          {results.map((c) => (
            <li key={c.id} className="flex items-center gap-3 border-b border-default p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="type-label text-primary">{c.legalName}</p>
                {c.gstin ? (
                  <p className="type-caption text-secondary">
                    {c.gstin}
                    {c.place ? ` · ${c.place}` : ""}
                  </p>
                ) : null}
                <p className="flex items-center gap-1 type-caption text-link">
                  <Icon name="users" size={14} />
                  {c.members} {c.members === 1 ? "colleague" : "colleagues"} already joined
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={props.busy}
                aria-label={`Request to join ${c.legalName}`}
                onClick={() => {
                  props.onPick(c.id);
                }}
              >
                Request to join
              </Button>
            </li>
          ))}
          <li>
            <button
              type="button"
              disabled={props.busy}
              onClick={() => {
                props.onPick(null);
              }}
              className="flex w-full cursor-pointer items-start gap-3 p-4 text-left hover:bg-subtle"
            >
              <Icon name="plus" size={20} className="text-primary" />
              <span className="flex flex-col gap-1">
                <span className="type-label text-link">Create a new company</span>
                <span className="type-caption text-secondary">Not listed? Set up your company in two minutes.</span>
              </span>
            </button>
          </li>
        </ul>
      ) : null}
      <p className="type-caption text-secondary">A company admin approves each request to join.</p>
      {props.onBack ? (
        <Button variant="ghost" className="self-start" onClick={props.onBack}>
          Back
        </Button>
      ) : null}
    </>
  );
}
