"use client";

import { Button, Textarea } from "@h2india/ui";
import { useState, useTransition } from "react";
import { decideClaimAction } from "./actions";

export function ClaimDecision({ claimId, company }: { claimId: string; company: string }) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const decide = (approve: boolean) => {
    start(async () => {
      const r = await decideClaimAction(claimId, approve, reason);
      setMessage(r.ok ? (approve ? "Approved" : "Rejected") : r.error);
    });
  };
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        aria-label={`Reason for ${company}`}
        rows={2}
        placeholder="Reason (needed to reject)"
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
        }}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            decide(true);
          }}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            decide(false);
          }}
        >
          Reject
        </Button>
      </div>
      {message ? (
        <p role="status" className="type-caption text-secondary">
          {message}
        </p>
      ) : null}
    </div>
  );
}
