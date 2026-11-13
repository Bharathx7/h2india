"use client";

import { Alert, Button } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptInvitationAction } from "./team-actions";

export function AcceptInvite({ token, workspace }: { token: string; workspace: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="error" title={error} live /> : null}
      <Button
        className="self-start"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const r = await acceptInvitationAction(token);
            if (r.ok) router.push(workspace);
            else setError(r.error);
          });
        }}
      >
        Accept invitation
      </Button>
    </div>
  );
}
