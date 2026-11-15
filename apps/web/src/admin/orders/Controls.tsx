"use client";

import { Alert, Button, FormField, Input, Radio, RadioGroup, Select, Textarea } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  confirmReceiptAction,
  decideDisputeAction,
  resendCodeAction,
  resolveIssueAction,
  type AdminResult,
} from "./actions";

// Back-office controls for orders and money (steps 11.5, 11.6). Built from the design system (A178).

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<{ title: string; fields: Record<string, string> } | null>(null);
  const [done, setDone] = useState(false);
  const go = (work: () => Promise<AdminResult>) => {
    start(async () => {
      const r = await work();
      if (r.ok) {
        setError(null);
        setDone(true);
        router.refresh();
      } else setError({ title: r.error, fields: r.errors ?? {} });
    });
  };
  return { pending, error, done, go };
}

/** Decide a dispute: refund the buyer, release to the supplier, or split (the held amount stays held until now). */
export function DecideDispute({ orderId, disputeId, held }: { orderId: string; disputeId: string; held: string }) {
  const [outcome, setOutcome] = useState<"refund_buyer" | "release_supplier" | "split">("split");
  const [refund, setRefund] = useState("");
  const [note, setNote] = useState("");
  const a = useAction();
  return (
    <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
      <h2 className="type-h4">Decide</h2>
      <p className="type-body-sm text-body">{held} is held. Both companies are told the decision and the reason.</p>
      {a.error ? <Alert tone="error" title={a.error.title} live /> : null}
      <RadioGroup
        value={outcome}
        onValueChange={(v) => {
          setOutcome(v as typeof outcome);
        }}
        aria-label="Decision"
      >
        <Radio value="refund_buyer" label="Refund the buyer in full" />
        <Radio value="release_supplier" label="Release it to the supplier" />
        <Radio value="split" label="Split: refund part, release the rest" />
      </RadioGroup>
      {outcome === "split" ? (
        <FormField label="Refund to the buyer (₹)" error={a.error?.fields.refund}>
          <Input
            inputMode="decimal"
            value={refund}
            onChange={(e) => {
              setRefund(e.target.value);
            }}
          />
        </FormField>
      ) : null}
      <FormField label="Reason" required error={a.error?.fields.note}>
        <Textarea
          rows={3}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
          }}
        />
      </FormField>
      <Button
        disabled={a.pending || !note.trim()}
        onClick={() => {
          a.go(() => decideDisputeAction(orderId, disputeId, { outcome, refund, note }));
        }}
      >
        Record decision
      </Button>
    </section>
  );
}

/** G5 fallback: the code never arrived. Resend it, or confirm the delivery with the receiving contact by phone. */
export function DeliveryFallback({ orderId }: { orderId: string }) {
  const [reason, setReason] = useState("");
  const [condition, setCondition] = useState<"Good" | "Damaged" | "Short">("Good");
  const a = useAction();
  return (
    <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
      <h2 className="type-h4">Delivery code</h2>
      {a.error ? <Alert tone="error" title={a.error.title} live /> : null}
      {a.done ? <Alert tone="success" title="Done" live /> : null}
      <FormField label="Reason" required>
        <Input
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
          }}
        />
      </FormField>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={a.pending || !reason.trim()}
          onClick={() => {
            a.go(() => resendCodeAction(orderId, reason));
          }}
        >
          Send a new code
        </Button>
        <Select
          aria-label="What arrived"
          value={condition}
          onChange={(e) => {
            setCondition(e.target.value as typeof condition);
          }}
        >
          <option value="Good">Arrived in good condition</option>
          <option value="Damaged">Something is damaged</option>
          <option value="Short">Something is missing</option>
        </Select>
        <Button
          disabled={a.pending || !reason.trim()}
          onClick={() => {
            a.go(() => confirmReceiptAction(orderId, condition, reason));
          }}
        >
          Confirm the delivery
        </Button>
      </div>
    </section>
  );
}

export function ResolveIssue({ issueId }: { issueId: string }) {
  const [resolution, setResolution] = useState("");
  const a = useAction();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        aria-label="What was done"
        placeholder="What was done"
        value={resolution}
        onChange={(e) => {
          setResolution(e.target.value);
        }}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={a.pending || !resolution.trim()}
        onClick={() => {
          a.go(() => resolveIssueAction(issueId, resolution));
        }}
      >
        Resolve
      </Button>
      {a.error ? <span className="type-caption text-error">{a.error.title}</span> : null}
    </div>
  );
}
