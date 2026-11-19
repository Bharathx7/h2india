"use client";

import { Button } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { submitForReviewAction } from "./actions";

/**
 * Checklist step 5 (584:8): Submit for review, open once steps 1 to 4 are done or being checked. Only a company admin
 * (company.manage) may submit; core refuses anyone else, so for them the button is off and says why.
 */
export function SubmitReview({ ready, allowed = true }: { ready: boolean; allowed?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const noteId = useId();
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={!ready || !allowed || pending}
        aria-describedby={allowed ? undefined : noteId}
        onClick={() => {
          start(async () => {
            const r = await submitForReviewAction();
            setError(r.ok ? "" : (r.error ?? ""));
            if (r.ok) router.refresh();
          });
        }}
      >
        Submit for review
      </Button>
      {!allowed ? (
        <span id={noteId} className="type-caption text-secondary">
          Only a company admin can submit.
        </span>
      ) : null}
      {error ? (
        <span role="alert" className="type-caption text-error">
          {error}
        </span>
      ) : null}
    </span>
  );
}
