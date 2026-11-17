"use client";

import { Button } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { answerJoinRequestAction, revokeInvitationAction } from "./team-actions";

// Team controls (592:371) the shared Team panel (apps/web/src/team) still uses: join requests and invitations.

function useRun() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const go = (work: () => Promise<{ ok: true } | { ok: false; error: string }>, done?: () => void) => {
    start(async () => {
      const r = await work();
      setError(r.ok ? "" : r.error);
      if (r.ok) {
        done?.();
        router.refresh();
      }
    });
  };
  return { error, pending, go };
}

export function JoinRequest({ id, name }: { id: string; name: string }) {
  const r = useRun();
  return (
    <span className="flex flex-col items-end gap-1">
      <span className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={r.pending}
          onClick={() => {
            r.go(() => answerJoinRequestAction(id, false));
          }}
        >
          Reject<span className="sr-only"> {name}</span>
        </Button>
        <Button
          size="sm"
          disabled={r.pending}
          onClick={() => {
            r.go(() => answerJoinRequestAction(id, true));
          }}
        >
          Approve<span className="sr-only"> {name}</span>
        </Button>
      </span>
      {r.error ? <span className="type-caption text-error">{r.error}</span> : null}
    </span>
  );
}

export function RevokeInvite({ id, email }: { id: string; email: string }) {
  const r = useRun();
  return (
    <button
      type="button"
      className="type-label"
      disabled={r.pending}
      onClick={() => {
        r.go(() => revokeInvitationAction(id));
      }}
    >
      Cancel invitation<span className="sr-only"> for {email}</span>
    </button>
  );
}
