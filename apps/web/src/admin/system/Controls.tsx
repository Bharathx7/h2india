"use client";

import { Alert, Button, Input, Modal, Select, Switch } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clockAction, deadLetterAction, flagAction, proposalAction, scheduleReportAction } from "./actions";

// System settings controls (707:793) and Schedule report email (267:7338, toast 267:6920), step 11.8.

type R = { ok: true; note?: string } | { ok: false; error: string };

function useRun() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const go = (work: () => Promise<R>, done = "Saved") => {
    start(async () => {
      const r = await work();
      setMsg(r.ok ? { tone: "success", text: r.note ?? done } : { tone: "error", text: r.error });
      router.refresh();
    });
  };
  return { msg, pending, go };
}

export function FlagRow({
  flag,
  label,
  hint,
  on,
  twoPerson,
}: {
  flag: string;
  label: string;
  hint: string;
  on: boolean;
  twoPerson: boolean;
}) {
  const r = useRun();
  const [reason, setReason] = useState("");
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Switch
          label={label}
          checked={on}
          disabled={r.pending || !reason.trim()}
          onCheckedChange={(v) => {
            r.go(() => flagAction(flag, v, reason));
          }}
        />
        <Input
          aria-label={`Reason for changing ${label}`}
          placeholder="Reason (required)"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
          }}
          boxClassName="max-w-72"
        />
      </div>
      <p className="type-caption text-secondary">
        {hint}
        {twoPerson ? " Needs a second operator to approve." : ""}
      </p>
      {r.msg ? <Alert tone={r.msg.tone} title={r.msg.text} live /> : null}
    </li>
  );
}

export function Proposal({ id }: { id: string }) {
  const r = useRun();
  return (
    <span className="flex gap-2">
      <Button
        size="sm"
        disabled={r.pending}
        onClick={() => {
          r.go(() => proposalAction(id, true), "Approved");
        }}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={r.pending}
        onClick={() => {
          r.go(() => proposalAction(id, false), "Declined");
        }}
      >
        Decline
      </Button>
      {r.msg?.tone === "error" ? <span className="type-caption text-error">{r.msg.text}</span> : null}
    </span>
  );
}

export function ClockRow({
  name,
  label,
  amount,
  unit,
}: {
  name: string;
  label: string;
  amount: number;
  unit: "hours" | "days" | "workingDays";
}) {
  const r = useRun();
  const [a, setA] = useState(String(amount));
  const [u, setU] = useState(unit);
  const [reason, setReason] = useState("");
  return (
    <tr className="border-t border-default align-top">
      <td className="px-3 py-2 type-body-sm">{label}</td>
      <td className="px-3 py-2">
        <span className="flex gap-2">
          <Input
            aria-label={`${label} amount`}
            inputMode="numeric"
            value={a}
            onChange={(e) => {
              setA(e.target.value);
            }}
            boxClassName="w-20"
          />
          <Select
            aria-label={`${label} unit`}
            value={u}
            onChange={(e) => {
              setU(e.target.value as typeof u);
            }}
            boxClassName="w-40"
          >
            <option value="hours">hours</option>
            <option value="days">days</option>
            <option value="workingDays">working days</option>
          </Select>
        </span>
      </td>
      <td className="px-3 py-2">
        <Input
          aria-label={`Reason for changing ${label}`}
          placeholder="Reason"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
          }}
        />
      </td>
      <td className="px-3 py-2">
        <Button
          size="sm"
          variant="outline"
          disabled={r.pending || !reason.trim()}
          onClick={() => {
            r.go(() => clockAction(name as never, Number(a), u, reason), "Saved for new deadlines");
          }}
        >
          Save
        </Button>
        {r.msg ? (
          <span
            className={r.msg.tone === "error" ? "block type-caption text-error" : "block type-caption text-secondary"}
          >
            {r.msg.text}
          </span>
        ) : null}
      </td>
    </tr>
  );
}

export function FailedJob({ id }: { id: string }) {
  const r = useRun();
  return (
    <span className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={r.pending}
        onClick={() => {
          r.go(() => deadLetterAction(id, true), "Retried");
        }}
      >
        Retry
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={r.pending}
        onClick={() => {
          r.go(() => deadLetterAction(id, false), "Dismissed");
        }}
      >
        Dismiss
      </Button>
      {r.msg?.tone === "error" ? <span className="type-caption text-error">{r.msg.text}</span> : null}
    </span>
  );
}

export function ScheduleReport() {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      {done ? <Alert tone="success" title="Report scheduled" live /> : null}
      <Button
        variant="outline"
        onClick={() => {
          setOpen(true);
        }}
      >
        Schedule report email
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Schedule report email"
        description="The overview figures, emailed on a schedule. Weekly goes on Mondays and monthly on the 1st, at 9:00 AM IST."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={pending || !email}
              onClick={() => {
                start(async () => {
                  const r = await scheduleReportAction(email, frequency);
                  if (!r.ok) {
                    setError(r.error);
                    return;
                  }
                  setOpen(false);
                  setDone(true);
                  router.refresh();
                });
              }}
            >
              Schedule
            </Button>
          </div>
        }
      >
        {error ? <Alert tone="error" title={error} live /> : null}
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Send to</span>
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">How often</span>
          <Select
            value={frequency}
            onChange={(e) => {
              setFrequency(e.target.value as "weekly" | "monthly");
            }}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Select>
        </label>
      </Modal>
    </>
  );
}
