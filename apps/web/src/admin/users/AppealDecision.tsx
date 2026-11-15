"use client";

import { Button, Input } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideAppealAction } from "./appeal-actions";

/** Lift the suspension or keep it, with a note the company sees (G10). */
export function AppealDecision({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const decide = (lift: boolean) => {
    start(async () => {
      const r = await decideAppealAction(id, lift, note);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  };
  return (
    <div className="flex flex-col gap-2">
      <Input
        aria-label="Note to the company"
        placeholder="Note to the company"
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
        }}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending || !note.trim()}
          onClick={() => {
            decide(true);
          }}
        >
          Lift suspension
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !note.trim()}
          onClick={() => {
            decide(false);
          }}
        >
          Keep suspended
        </Button>
      </div>
      {error ? <p className="type-caption text-error">{error}</p> : null}
    </div>
  );
}
