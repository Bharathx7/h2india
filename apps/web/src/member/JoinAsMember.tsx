"use client";

import { Alert, Button } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { joinAsMemberAction } from "./join-member-actions";

export function JoinAsMemberButton({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-start gap-3">
      {error ? <Alert tone="error" title={error} live /> : null}
      <Button
        size="lg"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const r = await joinAsMemberAction(next);
            if (!r.ok) {
              setError(r.error);
              return;
            }
            router.push(r.to);
            router.refresh();
          });
        }}
      >
        Join as member
      </Button>
    </div>
  );
}
