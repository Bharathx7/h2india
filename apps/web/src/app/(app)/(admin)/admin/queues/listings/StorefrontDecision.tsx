"use client";

import { Button, Input } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideStorefrontAction } from "../actions";

/** Approve a storefront change (it goes live at once) or send it back with a note. */
export function StorefrontDecision({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const go = (approve: boolean) => {
    start(async () => {
      const r = await decideStorefrontAction(id, approve, note);
      setError(r.ok ? "" : r.error);
      if (r.ok) router.refresh();
    });
  };
  return (
    <div className="flex flex-col gap-2">
      <Input
        aria-label="Note to the supplier"
        placeholder="What to change (to send it back)"
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
        }}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            go(true);
          }}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            go(false);
          }}
        >
          Send back
        </Button>
      </div>
      {error ? <p className="type-caption text-error">{error}</p> : null}
    </div>
  );
}
