"use client";

import type { CompanyMatch } from "@h2india/core/companies";
import { Alert, Button, EmptyState, FormField, Input, useToast } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { askToJoinAction, cancelRequestAction, findCompaniesAction, remindAdminAction } from "./join-company-actions";

/** Find your company: name or GSTIN, then Ask to join. The company's admin approves (or not). */
export function FindCompany() {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<CompanyMatch[] | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const q = query.trim();

  useEffect(() => {
    if (q.length < 2) return;
    let live = true;
    const timer = setTimeout(() => {
      void findCompaniesAction(q).then((r) => {
        if (!live) return;
        if (r.ok) setMatches(r.value);
        else setError(r.error);
      });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Company name or GSTIN" helper="Type at least 2 letters">
        <Input
          leadingIcon="search"
          value={query}
          placeholder="For example Greenfield Hydrogen or 27AAKCG5521M1Z9"
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value.trim().length < 2) setMatches(null);
          }}
        />
      </FormField>
      {error ? <Alert tone="error" title={error} live /> : null}
      {q.length >= 2 && matches !== null ? (
        matches.length ? (
          <ul className="flex flex-col divide-y divide-default rounded-card border border-default">
            {matches.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="type-label text-primary">{c.legalName}</p>
                  <p className="type-caption text-secondary">
                    {[c.place, c.gstin ? `GSTIN ${c.gstin}` : null, `${String(c.members)} on H2 Economy`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    start(async () => {
                      const r = await askToJoinAction(c.id);
                      if (!r.ok) {
                        setError(r.error);
                        return;
                      }
                      toast({ tone: "success", title: `Request sent to ${c.legalName}` });
                      router.refresh();
                    });
                  }}
                >
                  Ask to join
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No company found">
            Check the spelling or try the GSTIN. If your company isn&apos;t on H2 Economy yet, someone there can create
            it as a buyer or supplier account.
          </EmptyState>
        )
      ) : null}
    </div>
  );
}

/** A pending request: remind the admin (once a day) or cancel it. */
export function PendingActions({ requestId, remindedToday }: { requestId: string; remindedToday: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const run = (work: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string) => {
    start(async () => {
      const r = await work();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError("");
      toast({ tone: "success", title: done });
      router.refresh();
    });
  };
  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="error" title={error} live /> : null}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={pending || remindedToday}
          onClick={() => {
            run(() => remindAdminAction(requestId), "Reminder sent");
          }}
        >
          {remindedToday ? "Reminder sent today" : "Remind the admin"}
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => {
            run(() => cancelRequestAction(requestId), "Request cancelled");
          }}
        >
          Cancel request
        </Button>
      </div>
    </div>
  );
}
