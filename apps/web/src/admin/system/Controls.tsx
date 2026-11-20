"use client";

import { Alert, Button, FormField, Icon, Input, Modal, Select, Switch, Toaster, useToast } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmItsYou } from "@/components/ConfirmItsYou";
import {
  cancelReportAction,
  clockAction,
  deadLetterAction,
  flagAction,
  holidayAction,
  proposalAction,
  removeHolidayAction,
  scheduleReportAction,
} from "./actions";

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

/** A switch row (707:793): name and what it does on the left, the switch with On or Off on the right. A reason is
 * required before it can change; money switches become a proposal for a second operator. */
export function FlagRow({
  flag,
  label,
  hint,
  on,
  twoPerson,
  canEdit,
}: {
  flag: string;
  label: string;
  hint: string;
  on: boolean;
  twoPerson: boolean;
  canEdit: boolean;
}) {
  const r = useRun();
  const [reason, setReason] = useState("");
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-4">
        <span>
          <span className="block type-label">{label}</span>
          <span className="block type-caption text-secondary">
            {hint}
            {twoPerson ? " Needs a second operator to approve." : ""}
          </span>
        </span>
        <Switch
          label={on ? "On" : "Off"}
          aria-label={label}
          checked={on}
          disabled={!canEdit || r.pending || !reason.trim()}
          onCheckedChange={(v) => {
            r.go(() => flagAction(flag, v, reason));
          }}
          className="shrink-0"
        />
      </div>
      {canEdit ? (
        <Input
          aria-label={`Reason for changing ${label}`}
          placeholder="Reason for the change (required)"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
          }}
        />
      ) : null}
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

/**
 * A Super admin's own money-switch change (founder, 20 Nov 2026: no limit for the Super admin): approve it after
 * Confirm it's you, or withdraw it. Other operators' own changes still wait for a second operator.
 */
export function OwnProposal({ id }: { id: string }) {
  const r = useRun();
  const router = useRouter();
  return (
    <span className="flex flex-col items-end gap-2">
      <span className="w-72 max-w-full">
        <ConfirmItsYou
          actionLabel="Confirm and approve"
          onConfirmed={async () => {
            const res = await proposalAction(id, true);
            router.refresh();
            return res.ok ? { ok: true } : { ok: false, error: res.error };
          }}
        />
      </span>
      <Button
        size="sm"
        variant="ghost"
        disabled={r.pending}
        onClick={() => {
          r.go(() => proposalAction(id, false), "Withdrawn");
        }}
      >
        Withdraw
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

/** Schedule a report email (267:7338) and its toast (267:6920). The email itself waits for its wording (M21). */
export function ScheduleReport() {
  return (
    <Toaster>
      <ScheduleReportDialog />
    </Toaster>
  );
}

function ScheduleReportDialog() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name="calendar" size={16} />
        Schedule report email
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Schedule a report email"
        description="Reports use the filters you have set. Each email has a CSV attached."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
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
                  setError("");
                  toast({
                    tone: "success",
                    title: "Report scheduled",
                    body:
                      frequency === "weekly"
                        ? "The first email goes out on Monday at 9:00."
                        : "The first email goes out on the 1st at 9:00.",
                  });
                  router.refresh();
                });
              }}
            >
              Schedule
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? <Alert tone="error" title={error} live /> : null}
          <FormField label="How often" helper="Weekly goes on Mondays and monthly on the 1st, at 9:00 AM IST.">
            <Select
              value={frequency}
              onChange={(e) => {
                setFrequency(e.target.value as "weekly" | "monthly");
              }}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </FormField>
          <FormField label="Send to">
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
            />
          </FormField>
        </div>
      </Modal>
    </>
  );
}

/** Stop a scheduled report email (founder QC, 17 Nov 2026). */
export function CancelReport({ id, email }: { id: string; email: string }) {
  const r = useRun();
  return (
    <span className="flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        disabled={r.pending}
        onClick={() => {
          r.go(() => cancelReportAction(id), "Stopped");
        }}
      >
        Stop<span className="sr-only"> the report to {email}</span>
      </Button>
      {r.msg?.tone === "error" ? <span className="type-caption text-error">{r.msg.text}</span> : null}
    </span>
  );
}

/**
 * Holidays (M18; founder QC, 17 Nov 2026: the list could only be changed in the database). Working-day clocks skip
 * these days; a change applies to deadlines started after it.
 */
export function Holidays({
  rows,
  canEdit,
}: {
  rows: { day: string; name: string; source: string | null }[];
  canEdit: boolean;
}) {
  const r = useRun();
  const [day, setDay] = useState("");
  const [name, setName] = useState("");
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00+05:30`).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return (
    <div className="flex flex-col gap-3">
      {r.msg ? <Alert tone={r.msg.tone} title={r.msg.text} live /> : null}
      {rows.length ? (
        <ul className="flex max-h-80 flex-col divide-y divide-default overflow-y-auto">
          {rows.map((h) => (
            <li key={h.day} className="flex items-center justify-between gap-3 py-2 type-body-sm">
              <span>
                <span className="type-label">{fmt(h.day)}</span> · {h.name}
              </span>
              {canEdit ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={r.pending}
                  onClick={() => {
                    r.go(() => removeHolidayAction(h.day), "Removed");
                  }}
                >
                  Remove<span className="sr-only"> {h.name}</span>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="type-body-sm text-secondary">
          No holidays yet: every Monday to Saturday counts as a working day.
        </p>
      )}
      {canEdit ? (
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="Date">
            <Input
              type="date"
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
              }}
            />
          </FormField>
          <FormField label="Holiday">
            <Input
              value={name}
              maxLength={80}
              placeholder="Diwali"
              onChange={(e) => {
                setName(e.target.value);
              }}
            />
          </FormField>
          <Button
            disabled={r.pending || !day || !name.trim()}
            onClick={() => {
              r.go(() => holidayAction(day, name), "Saved");
              setDay("");
              setName("");
            }}
          >
            Add holiday
          </Button>
        </div>
      ) : null}
    </div>
  );
}
