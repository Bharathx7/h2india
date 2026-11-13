"use client";

import type { Decision, QueueKey } from "@h2india/core/queues";
import { Alert, Button, Radio, RadioGroup, Textarea } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { claimAction, decideAction } from "./actions";

// The Decision panel shared by the moderation screens (633:8, 633:567, 633:1059): Approve, Request changes or Reject,
// with what needs to change (sent to the person) required for the last two. Moderators never edit the item itself.

export function Moderate({
  queue,
  id,
  person,
  approveLabel,
  after,
  next,
}: {
  queue: QueueKey;
  id: string;
  person: string;
  approveLabel: string;
  after: string;
  next: string | null;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision>("approve");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const needs = decision !== "approve";
  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="error" title={error} live /> : null}
      <RadioGroup
        value={decision}
        onValueChange={(v) => {
          setDecision(v as Decision);
        }}
        aria-label="Decision"
      >
        <Radio value="approve" label="Approve" />
        <Radio value="changes" label="Request changes" />
        <Radio value="reject" label="Reject" />
      </RadioGroup>
      {needs ? (
        <label className="flex flex-col gap-1.5">
          <span className="type-label">
            {decision === "changes" ? `What needs to change (sent to ${person})` : "Why it's rejected"}
          </span>
          <Textarea
            rows={4}
            maxLength={1000}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
            }}
          />
          <span className="type-caption text-secondary">Required.</span>
        </label>
      ) : null}
      <Button
        variant={decision === "reject" ? "destructive" : "primary"}
        disabled={pending || (needs && !text.trim())}
        onClick={() => {
          start(async () => {
            const r = await decideAction(queue, id, decision, text);
            if (!r.ok) {
              setError(r.error);
              return;
            }
            router.push(next ? `/admin/queues/${queue}/${next}` : `/admin/queues/${queue}`);
            router.refresh();
          });
        }}
      >
        {decision === "approve" ? approveLabel : decision === "changes" ? "Send back for changes" : "Reject"}
      </Button>
      <p className="type-caption text-secondary">{after}</p>
    </div>
  );
}

export function Claim({ queue, id, toMe, label }: { queue: QueueKey; id: string; toMe: boolean; label: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-col">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const r = await claimAction(queue, id, toMe);
            setError(r.ok ? "" : r.error);
            router.refresh();
          });
        }}
      >
        {label}
      </Button>
      {error ? <span className="type-caption text-error">{error}</span> : null}
    </span>
  );
}
