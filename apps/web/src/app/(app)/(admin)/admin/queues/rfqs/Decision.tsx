"use client";

import { Alert, Button, Radio, RadioGroup, Textarea } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { assignRfqAction, decideRfqAction } from "./actions";

// The Decision panel (632:1138): Approve, Request changes (with what to change, sent to the buyer) or Reject.

export function RfqDecision({ id, buyer, next }: { id: string; buyer: string; next: string | null }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<"approve" | "changes" | "reject">("approve");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const needsText = outcome !== "approve";
  const label =
    outcome === "approve" ? "Approve and send" : outcome === "changes" ? "Send back for changes" : "Reject RFQ";
  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="error" title={error} live /> : null}
      <RadioGroup
        value={outcome}
        onValueChange={(v) => {
          setOutcome(v as typeof outcome);
        }}
        aria-label="Decision"
      >
        <Radio value="approve" label="Approve" />
        <Radio value="changes" label="Request changes" />
        <Radio value="reject" label="Reject" />
      </RadioGroup>
      {needsText ? (
        <label className="flex flex-col gap-1.5">
          <span className="type-label">
            {outcome === "changes" ? `What needs to change (sent to ${buyer})` : "Why it's rejected"}
          </span>
          <Textarea
            rows={4}
            maxLength={500}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
            }}
          />
          <span className="type-caption text-secondary">
            Required.{outcome === "changes" ? " The buyer sees this with an Edit and resubmit button." : ""}
          </span>
        </label>
      ) : null}
      <Button
        variant={outcome === "reject" ? "destructive" : "primary"}
        disabled={pending || (needsText && !text.trim())}
        onClick={() => {
          start(async () => {
            const r = await decideRfqAction(id, outcome, text);
            if (!r.ok) {
              setError(r.error);
              return;
            }
            router.push(next ? `/admin/queues/rfqs/${next}` : "/admin/queues/rfqs");
            router.refresh();
          });
        }}
      >
        {label}
      </Button>
      <p className="type-caption text-secondary">The RFQ isn&apos;t sent to suppliers until it&apos;s approved.</p>
    </div>
  );
}

export function AssignButton({ id, toMe, label }: { id: string; toMe: boolean; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await assignRfqAction(id, toMe);
          router.refresh();
        });
      }}
    >
      {label}
    </Button>
  );
}
