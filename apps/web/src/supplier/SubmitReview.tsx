"use client";

import { Button } from "@h2india/ui";
import { useState, useTransition } from "react";
import { submitForReviewAction } from "./actions";

/** Checklist step 5 (584:8): Submit for review, open once steps 1 to 4 are done or being checked. */
export function SubmitReview({ ready }: { ready: boolean }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={!ready || pending}
        onClick={() => {
          start(async () => {
            const r = await submitForReviewAction();
            setError(r.ok ? "" : (r.error ?? ""));
          });
        }}
      >
        Submit for review
      </Button>
      {error ? (
        <span role="alert" className="type-caption text-error">
          {error}
        </span>
      ) : null}
    </span>
  );
}
