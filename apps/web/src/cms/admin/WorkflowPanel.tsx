"use client";

import { useDocumentInfo, useFormFields } from "@payloadcms/ui";
import { useState } from "react";

// The Workflow panel in the CMS article sidebar (step 4.2): the drawn stepper (639:8: Draft, In review, Legal check,
// Scheduled, Published) and the actions for the current status. The server checks every rule and permission.

const STEPS = ["Draft", "In review", "Legal check", "Scheduled", "Published"] as const;
const ALWAYS_LEGAL = ["sponsored", "press_release"];

type Action =
  | "submit"
  | "back-to-draft"
  | "send-to-legal"
  | "pass-legal"
  | "schedule"
  | "unschedule"
  | "publish"
  | "unpublish"
  | "correct"
  | "live-update";

const box = { border: "1px solid var(--theme-elevation-150)", borderRadius: 8, padding: 16, marginBottom: 24 } as const;
const button = {
  border: "1px solid var(--theme-elevation-250)",
  borderRadius: 999,
  padding: "6px 14px",
  background: "var(--theme-elevation-0)",
  cursor: "pointer",
  fontWeight: 600,
} as const;

export function WorkflowPanel() {
  const { id } = useDocumentInfo();
  const status = useFormFields(([fields]) => (fields.workflow?.value as string | undefined) ?? "Draft");
  const type = useFormFields(([fields]) => fields.type?.value as string | undefined);
  const flagged = useFormFields(([fields]) => Boolean(fields["legal.flagged"]?.value));
  const passedAt = useFormFields(([fields]) => fields["legal.passedAt"]?.value as string | undefined);
  const publishAt = useFormFields(([fields]) => fields.publishAt?.value as string | undefined);
  const live = useFormFields(([fields]) => fields["live.status"]?.value as string | undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  if (!id) return <p style={{ marginBottom: 24 }}>Save the article to start its workflow.</p>;
  const needsLegal = ALWAYS_LEGAL.includes(type ?? "") || flagged;
  const legalPending = needsLegal && !passedAt;

  const run = async (action: Action) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/cms/articles/${String(id)}/workflow`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, publishAt, note }),
      credentials: "include",
    });
    const body = (await res.json().catch(() => ({}))) as { errors?: { message: string }[] };
    if (!res.ok) {
      setError(body.errors?.[0]?.message ?? "That didn't work. Try again.");
      setBusy(false);
      return;
    }
    window.location.reload();
  };

  const act = (action: Action, label: string, primary = false) => (
    <button
      key={action}
      type="button"
      disabled={busy}
      onClick={() => void run(action)}
      style={
        primary
          ? {
              ...button,
              background: "var(--theme-success-500)",
              color: "var(--theme-elevation-0)",
              borderColor: "transparent",
            }
          : button
      }
    >
      {label}
    </button>
  );

  const actions: Record<string, React.ReactNode[]> = {
    Draft: [act("submit", "Send for review", true)],
    "In review": legalPending
      ? [act("send-to-legal", "Send to legal check", true), act("back-to-draft", "Back to draft")]
      : [act("schedule", "Schedule", true), act("publish", "Publish now"), act("back-to-draft", "Back to draft")],
    "Legal check": [act("pass-legal", "Pass legal check", true), act("back-to-draft", "Back to draft")],
    Scheduled: [
      act("publish", "Publish now", true),
      act("unschedule", "Unschedule"),
      act("back-to-draft", "Back to draft"),
    ],
    Published: [
      ...(live === "live" || live === "ended" ? [act("live-update", "Publish live update", true)] : []),
      act("correct", "Add correction", live !== "live" && live !== "ended"),
      act("unpublish", "Unpublish"),
    ],
  };

  return (
    <section style={box} aria-label="Workflow">
      <h3 style={{ margin: "0 0 12px" }}>Workflow</h3>
      <ol
        style={{ listStyle: "none", padding: 0, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 4 }}
      >
        {STEPS.filter((s) => s !== "Legal check" || needsLegal).map((step) => {
          const index = STEPS.indexOf(step);
          const current = STEPS.indexOf(status as (typeof STEPS)[number]);
          const done = index < current || (step === "Legal check" && Boolean(passedAt));
          return (
            <li
              key={step}
              aria-current={step === status ? "step" : undefined}
              style={{ fontWeight: step === status ? 700 : 400 }}
            >
              {done ? "✓ " : step === status ? "● " : "○ "}
              {step}
            </li>
          );
        })}
      </ol>
      {needsLegal ? (
        <p style={{ margin: "0 0 12px" }}>
          {passedAt ? "Legal check passed." : "Needs a legal check before it's published."}
        </p>
      ) : null}
      {status === "In review" && !legalPending ? (
        <p style={{ margin: "0 0 12px" }}>To schedule, set “Publish at” below (IST), then press Schedule.</p>
      ) : null}
      {status === "Published" ? (
        <label style={{ display: "block", marginBottom: 12 }}>
          What was corrected
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
            }}
            rows={3}
            style={{ width: "100%", marginTop: 4 }}
          />
        </label>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{actions[status]}</div>
      {error ? (
        <p role="alert" style={{ color: "var(--theme-error-500)", marginTop: 12 }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
