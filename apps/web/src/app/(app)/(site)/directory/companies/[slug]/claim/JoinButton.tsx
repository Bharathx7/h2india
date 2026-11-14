"use client";

import { Button } from "@h2india/ui";
import { useState, useTransition } from "react";
import { requestToJoinAction } from "./actions";

/** Already claimed (494:427): send a join request to the company's admins. */
export function JoinButton({ slug }: { slug: string }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (sent)
    return (
      <p role="status" className="type-body text-body">
        Request sent. The company&apos;s admins will answer it.
      </p>
    );
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        disabled={pending}
        onClick={() => {
          start(async () => {
            const r = await requestToJoinAction(slug);
            if (r.ok) setSent(true);
            else setError(Object.values(r.errors)[0] ?? "Something went wrong");
          });
        }}
      >
        Ask to join the team
      </Button>
      {error ? (
        <p role="alert" className="type-caption text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
