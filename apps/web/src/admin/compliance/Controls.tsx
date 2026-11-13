"use client";

import { Alert, Button, FormField, Input, Select, Textarea } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  correctAction,
  dryRunAction,
  eraseAction,
  exportAction,
  moveGrievanceAction,
  newRequestAction,
  rejectAction,
} from "./actions";

// Compliance controls (step 11.7): move a grievance, and the data-rights actions with the erasure dry run.

type R = { ok: true } | { ok: false; error: string };

function useRun() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const go = (work: () => Promise<R>, done: string) => {
    start(async () => {
      const r = await work();
      setMsg(r.ok ? { tone: "success", text: done } : { tone: "error", text: r.error });
      router.refresh();
    });
  };
  return { msg, pending, go };
}

/**
 * Status and assignee, the note the person sees, and the outcome (661:325). Every move goes through moveGrievance()
 * (changeStatus, history, audit); resolving needs the outcome.
 */
export function MoveGrievance({
  id,
  next,
  person,
  team: startTeam,
}: {
  id: string;
  next: string[];
  person: string;
  team: string;
}) {
  const r = useRun();
  const [note, setNote] = useState("");
  const [team, setTeam] = useState(startTeam);
  const [outcome, setOutcome] = useState("");
  if (!next.length) return <p className="type-body-sm text-secondary">Resolved. Nothing more to do.</p>;
  const steps = next.filter((to) => to !== "Resolved");
  const canResolve = next.includes("Resolved");
  return (
    <div className="flex flex-col gap-6">
      {r.msg ? <Alert tone={r.msg.tone} title={r.msg.text} live /> : null}
      <section className="flex flex-col gap-3">
        <h2 className="type-h4">Status and assignee</h2>
        <FormField label="Assignee" helper="The team or person handling it. The complainant sees the team.">
          <Input
            value={team}
            maxLength={80}
            onChange={(e) => {
              setTeam(e.target.value);
            }}
          />
        </FormField>
        <FormField label={`Note to ${person}`} helper="Shown when they look up the ticket.">
          <Textarea
            rows={4}
            maxLength={1000}
            showCount
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
            }}
          />
        </FormField>
        <div className="flex flex-wrap gap-2">
          {steps.map((to) => (
            <Button
              key={to}
              variant={to === "Acknowledged" ? "primary" : "outline"}
              disabled={r.pending}
              onClick={() => {
                r.go(() => moveGrievanceAction(id, to as never, note, { team }), `Moved to ${to}`);
              }}
            >
              {to === "Acknowledged" ? "Acknowledge" : "Start review"}
            </Button>
          ))}
        </div>
      </section>
      {canResolve ? (
        <section className="flex flex-col gap-3 border-t border-default pt-5">
          <h2 className="type-h4">Outcome</h2>
          <p className="type-body-sm text-body">
            Record what you decided before you resolve the complaint. {person} sees the outcome when they look up the
            ticket.
          </p>
          <FormField label="Outcome" required>
            <Textarea
              rows={3}
              maxLength={1000}
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value);
              }}
            />
          </FormField>
          <Button
            className="self-start"
            disabled={r.pending || !outcome.trim()}
            onClick={() => {
              r.go(() => moveGrievanceAction(id, "Resolved", note, { outcome, team }), "Resolved");
            }}
          >
            Resolve complaint
          </Button>
        </section>
      ) : null}
    </div>
  );
}

export function NewRequest() {
  const r = useRun();
  const [kind, setKind] = useState("access");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  return (
    <div className="flex flex-col gap-3">
      {r.msg ? <Alert tone={r.msg.tone} title={r.msg.text} live /> : null}
      <div className="grid gap-2 md:grid-cols-3">
        <Select
          aria-label="Request"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
          }}
        >
          <option value="access">A copy of their data</option>
          <option value="correct">Correct their data</option>
          <option value="erase">Erase their data</option>
        </Select>
        <Input
          aria-label="Their email"
          type="email"
          placeholder="Their email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
        <Input
          aria-label="Details"
          placeholder="What they asked, how they proved it's them"
          value={details}
          onChange={(e) => {
            setDetails(e.target.value);
          }}
        />
      </div>
      <Button
        className="self-start"
        size="sm"
        disabled={r.pending || !email}
        onClick={() => {
          r.go(() => newRequestAction(kind as never, email, details), "Request logged with a DRR reference");
        }}
      >
        Log request
      </Button>
    </div>
  );
}

export function DataRightsActions({
  id,
  kind,
  open,
  hasPlan,
  blockers,
}: {
  id: string;
  kind: string;
  open: boolean;
  hasPlan: boolean;
  blockers: number;
}) {
  const r = useRun();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [reason, setReason] = useState("");
  if (!open) return <p className="type-body-sm text-secondary">This request is closed.</p>;
  return (
    <div className="flex flex-col gap-4">
      {r.msg ? <Alert tone={r.msg.tone} title={r.msg.text} live /> : null}
      {kind === "access" ? (
        <Button
          className="self-start"
          disabled={r.pending}
          onClick={() => {
            void exportAction(id).then((x) => {
              if (!x.ok) return;
              const url = URL.createObjectURL(new Blob([x.json], { type: "application/json" }));
              const a = document.createElement("a");
              a.href = url;
              a.download = "h2india-data.json";
              a.click();
              URL.revokeObjectURL(url);
            });
          }}
        >
          Download their data
        </Button>
      ) : null}
      {kind === "correct" ? (
        <div className="flex flex-col gap-2">
          <Input
            aria-label="Correct name"
            placeholder="Correct name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
          <Input
            aria-label="Correct mobile"
            placeholder="Correct mobile"
            value={mobile}
            onChange={(e) => {
              setMobile(e.target.value);
            }}
          />
          <Button
            className="self-start"
            disabled={r.pending || (!name && !mobile)}
            onClick={() => {
              r.go(() => correctAction(id, name, mobile), "Corrected");
            }}
          >
            Save correction
          </Button>
        </div>
      ) : null}
      {kind === "erase" ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={r.pending}
            onClick={() => {
              r.go(() => dryRunAction(id), "Dry run ready: check every line before erasing");
            }}
          >
            Run dry run
          </Button>
          <Button
            variant="destructive"
            disabled={r.pending || !hasPlan || blockers > 0}
            onClick={() => {
              r.go(() => eraseAction(id), "Erased");
            }}
          >
            Erase as reviewed
          </Button>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 border-t border-default pt-3">
        <Input
          aria-label="Reason to reject"
          placeholder="Reason to reject (for example, identity not proved)"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
          }}
        />
        <Button
          className="self-start"
          variant="ghost"
          size="sm"
          disabled={r.pending || !reason.trim()}
          onClick={() => {
            r.go(() => rejectAction(id, reason), "Rejected");
          }}
        >
          Reject request
        </Button>
      </div>
    </div>
  );
}
