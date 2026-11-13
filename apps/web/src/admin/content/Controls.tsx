"use client";

import { Alert, Button, Icon, Input, StatusBadge, Textarea } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  markVerifiedAction,
  saveSendAction,
  scheduleAction,
  testAction,
  unscheduleAction,
  type SendForm,
} from "./actions";

// Mark verified (646:9) and the newsletter send settings (648:312), step 11.3.

export function MarkVerified({ collection, id, title }: { collection: string; id: number; title: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-col">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const r = await markVerifiedAction(collection, id);
            setError(r.ok ? "" : r.error);
            router.refresh();
          });
        }}
      >
        <Icon name="check" size={14} />
        Mark verified<span className="sr-only"> {title}</span>
      </Button>
      {error ? <span className="type-caption text-error">{error}</span> : null}
    </span>
  );
}

export function SendSettings({
  issueId,
  start,
  status,
  audience,
  lastTest,
}: {
  issueId: string;
  start: SendForm;
  status: string;
  audience: number;
  lastTest: string | null;
}) {
  const router = useRouter();
  const [f, setF] = useState(start);
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, run] = useTransition();
  const locked = status !== "Draft" && status !== "Scheduled";
  const go = (work: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string) => {
    run(async () => {
      const r = await work();
      setMsg(r.ok ? { tone: "success", text: done } : { tone: "error", text: r.error });
      router.refresh();
    });
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="type-h4">Send settings</h2>
        <StatusBadge
          status={status}
          tone={status === "Sent" ? "success" : status === "Scheduled" ? "progress" : "neutral"}
        />
      </div>
      {msg ? <Alert tone={msg.tone} title={msg.text} live /> : null}
      <label className="flex flex-col gap-1.5">
        <span className="type-label">
          Subject <span className="text-error">*</span>
        </span>
        <Input
          value={f.subject}
          disabled={locked}
          maxLength={200}
          onChange={(e) => {
            setF({ ...f, subject: e.target.value });
          }}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="type-label">Preview text</span>
        <Input
          value={f.preview}
          disabled={locked}
          maxLength={200}
          onChange={(e) => {
            setF({ ...f, preview: e.target.value });
          }}
        />
        <span className="type-caption text-secondary">Shown after the subject in most inboxes</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="type-label">Editor&apos;s note</span>
        <Textarea
          rows={3}
          value={f.editorNote}
          disabled={locked}
          maxLength={1000}
          onChange={(e) => {
            setF({ ...f, editorNote: e.target.value });
          }}
        />
      </label>
      <p className="type-body-sm">
        Segment: <span className="type-label">All confirmed subscribers · {audience.toLocaleString("en-IN")}</span>
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="type-label">
          Send at (IST) <span className="text-error">*</span>
        </span>
        <Input
          type="datetime-local"
          value={f.sendAt}
          disabled={locked}
          onChange={(e) => {
            setF({ ...f, sendAt: e.target.value });
          }}
        />
      </label>
      {!locked ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              go(() => saveSendAction(issueId, f), "Changes saved");
            }}
          >
            Save changes
          </Button>
          {status === "Scheduled" ? (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => {
                go(() => unscheduleAction(issueId), "Unscheduled");
              }}
            >
              Unschedule
            </Button>
          ) : null}
          <Button
            disabled={pending || !f.subject.trim() || !f.sendAt}
            onClick={() => {
              go(() => scheduleAction(issueId, f), "Scheduled");
            }}
          >
            {status === "Scheduled" ? "Reschedule" : "Schedule"}
          </Button>
        </div>
      ) : null}
      <label className="flex flex-col gap-1.5">
        <span className="type-label">Send a test</span>
        <span className="flex gap-2">
          <Input
            type="email"
            value={to}
            placeholder="you@example.com"
            onChange={(e) => {
              setTo(e.target.value);
            }}
          />
          <Button
            variant="outline"
            disabled={pending || !to}
            onClick={() => {
              go(() => testAction(issueId, f, to), `Test sent to ${to}`);
            }}
          >
            Send test
          </Button>
        </span>
        {lastTest ? <span className="type-caption text-secondary">Last test sent {lastTest}</span> : null}
      </label>
    </div>
  );
}
