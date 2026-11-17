"use client";

import type { Decision, QueueKey } from "@h2india/core/queues";
import { Alert, Button, Icon, Input, Radio, RadioGroup, Textarea } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { claimAction, commentAction, decideAction, deleteViewAction, saveViewAction } from "./actions";

// The Decision panel shared by the moderation screens (633:8, 633:567, 633:1059): Approve, Request changes or Reject,
// with what needs to change (sent to the person) required for the last two. Moderators never edit the item itself.

export function Moderate({
  queue,
  id,
  person,
  approveLabel,
  after,
  next,
  inbox = false,
}: {
  queue: QueueKey;
  id: string;
  person: string;
  approveLabel: string;
  after: string;
  next: string | null;
  /** An inbox message: Answered or Close without a reply; nothing goes back to the sender from here. */
  inbox?: boolean;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision>("approve");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const needs = decision !== "approve";
  const optional = inbox && decision === "approve";
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
        <Radio value="approve" label={inbox ? "Answered" : "Approve"} />
        {inbox ? null : <Radio value="changes" label="Request changes" />}
        <Radio value="reject" label={inbox ? "Close without a reply" : "Reject"} />
      </RadioGroup>
      {needs || optional ? (
        <label className="flex flex-col gap-1.5">
          <span className="type-label">
            {optional
              ? "What you replied (for the team, optional)"
              : decision === "changes"
                ? `What needs to change (sent to ${person})`
                : inbox
                  ? "Why it's closed (for the team)"
                  : "Why it's rejected"}
          </span>
          <Textarea
            rows={4}
            maxLength={1000}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
            }}
          />
          {optional ? null : <span className="type-caption text-secondary">Required.</span>}
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
        {decision === "approve"
          ? approveLabel
          : decision === "changes"
            ? "Send back for changes"
            : inbox
              ? "Close without a reply"
              : "Reject"}
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

/** Comment on a field (633:8): a small form under the field, for moderators only. */
export function FieldComment({ queue, id, field }: { queue: QueueKey; id: string; field: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (!open)
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 self-start type-caption text-secondary underline"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name="message-square" size={12} />
        Comment<span className="sr-only"> on {field}</span>
      </button>
    );
  return (
    <span className="flex flex-col gap-2">
      <Textarea
        aria-label={`Comment on ${field}`}
        rows={2}
        maxLength={500}
        placeholder="Only moderators see this"
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
        }}
      />
      {error ? <span className="type-caption text-error">{error}</span> : null}
      <span className="flex gap-2">
        <Button
          size="sm"
          disabled={pending || !note.trim()}
          onClick={() => {
            start(async () => {
              const r = await commentAction(queue, id, field, note);
              if (!r.ok) {
                setError(r.error);
                return;
              }
              setNote("");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          Add comment
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
          }}
        >
          Cancel
        </Button>
      </span>
    </span>
  );
}

/** Save view: names the current view and search for this operator. */
export function SaveView({ queue, view, search }: { queue: QueueKey; view: string; search: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (!open)
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name="plus" size={14} />
        Save view
      </Button>
    );
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Input
        aria-label="Name of the view"
        placeholder="Name of the view"
        maxLength={40}
        boxClassName="w-48"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
        }}
      />
      <Button
        size="sm"
        disabled={pending || !name.trim()}
        onClick={() => {
          start(async () => {
            const r = await saveViewAction(queue, name, view, search);
            if (!r.ok) {
              setError(r.error);
              return;
            }
            setOpen(false);
            setName("");
            router.refresh();
          });
        }}
      >
        Save
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(false);
        }}
      >
        Cancel
      </Button>
      {error ? <span className="type-caption text-error">{error}</span> : null}
    </span>
  );
}

export function DeleteView({ queue, id, name }: { queue: QueueKey; id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={`Delete the view ${name}`}
      disabled={pending}
      className="rounded-pill p-1 text-icon-secondary hover:text-icon-primary"
      onClick={() => {
        start(async () => {
          await deleteViewAction(queue, id);
          router.refresh();
        });
      }}
    >
      <Icon name="x" size={14} />
    </button>
  );
}
