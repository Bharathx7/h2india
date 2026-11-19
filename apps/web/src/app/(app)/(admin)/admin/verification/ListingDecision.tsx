"use client";

import { Alert, Button, Icon, Input } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideListingAction } from "../queues/actions";

/**
 * A product waiting on the desk's "Storefront and first product" box (founder, 19 Nov 2026): Approve, or send it back
 * with one note, through the Listings queue's own action (decideRevision, queues.edit, audited). Per-field notes stay
 * on the listing's full review page. A new listing can't go live until the company is verified, so Approve says so.
 */
export function ListingDecision({ id, name, blocked }: { id: string; name: string; blocked: string | null }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const go = (outcome: "Approved" | "Needs changes") => {
    start(async () => {
      const r = await decideListingAction(
        id,
        outcome,
        outcome === "Needs changes" ? [{ field: "general", section: "details", text: note }] : [],
        "",
      );
      setError(r.ok ? "" : r.error);
      if (r.ok) router.refresh();
    });
  };
  return (
    <div className="flex flex-col gap-2">
      {blocked ? (
        <p id={`listing-blocked-${id}`} className="flex items-center gap-1.5 type-body-sm text-body">
          <Icon name="info" size={16} className="text-icon-link" />
          {blocked}
        </p>
      ) : null}
      <Input
        aria-label={`What to change in ${name}`}
        placeholder="What to change (to send it back)"
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending || blocked !== null}
          aria-describedby={blocked ? `listing-blocked-${id}` : undefined}
          onClick={() => {
            go("Approved");
          }}
        >
          Approve<span className="sr-only"> {name}</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            go("Needs changes");
          }}
        >
          Send back<span className="sr-only"> {name}</span>
        </Button>
      </div>
      {error ? <Alert tone="error" title={error} live /> : null}
    </div>
  );
}
