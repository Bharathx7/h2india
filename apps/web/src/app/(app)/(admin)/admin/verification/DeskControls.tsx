"use client";

import { BADGE_KINDS, DESK_CHECKLIST, REVOKE_REASONS } from "@h2india/core/supplier/rules";
import { Alert, Button, Checkbox, Icon, Input, Modal, Select, Textarea } from "@h2india/ui";
import { useState, useTransition } from "react";
import {
  decideDocumentAction,
  decideReviewAction,
  grantBadgeAction,
  revokeBadgeAction,
  runChecksAction,
} from "./desk-actions";

// The Verification desk's controls (635:9, Revoke badge 636:436). Every outcome goes through core and is audited.

function useAction() {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const go = (work: () => Promise<{ ok: true } | { ok: false; error: string }>, done?: () => void) => {
    start(async () => {
      const r = await work();
      setError(r.ok ? "" : r.error);
      if (r.ok) done?.();
    });
  };
  return { error, pending, go };
}

export function RunChecks({ organisationId }: { organisationId: string }) {
  const a = useAction();
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={a.pending}
        onClick={() => {
          a.go(() => runChecksAction(organisationId));
        }}
      >
        <Icon name="check" size={16} />
        Run checks again
      </Button>
      {a.error ? <p className="type-caption text-error">{a.error}</p> : null}
    </div>
  );
}

export function DocumentDecision({ id, title }: { id: string; title: string }) {
  const a = useAction();
  const [reason, setReason] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={a.pending}
          onClick={() => {
            a.go(() => decideDocumentAction(id, "Verified", ""));
          }}
        >
          Verify<span className="sr-only"> {title}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={a.pending}
          onClick={() => {
            a.go(() => decideDocumentAction(id, "Needs re-upload", reason));
          }}
        >
          Ask for re-upload
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={a.pending}
          onClick={() => {
            a.go(() => decideDocumentAction(id, "Rejected", reason));
          }}
        >
          Reject
        </Button>
      </div>
      <Input
        aria-label={`What to fix in ${title}`}
        placeholder="What to fix (for re-upload or reject)"
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
        }}
      />
      {a.error ? <p className="type-caption text-error">{a.error}</p> : null}
    </div>
  );
}

export function ReviewDecision({ id, initial }: { id: string; initial: Record<string, boolean> }) {
  const a = useAction();
  const [checks, setChecks] = useState(initial);
  const [reason, setReason] = useState("");
  const ticked = DESK_CHECKLIST.filter((c) => checks[c.key]).length;
  return (
    <div className="flex flex-col gap-3">
      <p className="type-caption text-secondary">
        {ticked} of {DESK_CHECKLIST.length}
      </p>
      {DESK_CHECKLIST.map((c) => (
        <Checkbox
          key={c.key}
          label={c.label}
          checked={Boolean(checks[c.key])}
          onCheckedChange={(v) => {
            setChecks({ ...checks, [c.key]: v === true });
          }}
        />
      ))}
      <Textarea
        aria-label="What to fix"
        placeholder="What to fix (to send it back)"
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={a.pending || ticked < 2}
          onClick={() => {
            a.go(() => decideReviewAction(id, true, "", checks));
          }}
        >
          Approve and verify
        </Button>
        <Button
          variant="outline"
          disabled={a.pending}
          onClick={() => {
            a.go(() => decideReviewAction(id, false, reason, checks));
          }}
        >
          Send back with reasons
        </Button>
      </div>
      {a.error ? <Alert tone="error" title={a.error} live /> : null}
    </div>
  );
}

export function GrantBadge({ organisationId }: { organisationId: string }) {
  const a = useAction();
  const [kind, setKind] = useState("verified_supplier");
  const [evidence, setEvidence] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 md:grid-cols-[200px_minmax(0,1fr)_auto]">
        <Select
          aria-label="Badge"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
          }}
        >
          {Object.entries(BADGE_KINDS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
        <Input
          aria-label="What you checked"
          placeholder="What you checked"
          value={evidence}
          onChange={(e) => {
            setEvidence(e.target.value);
          }}
        />
        <Button
          variant="outline"
          disabled={a.pending}
          onClick={() => {
            a.go(() => grantBadgeAction(organisationId, kind, evidence));
          }}
        >
          Grant badge
        </Button>
      </div>
      {a.error ? <p className="type-caption text-error">{a.error}</p> : null}
    </div>
  );
}

export function RevokeBadge({ badgeId, company, label }: { badgeId: string; company: string; label: string }) {
  const a = useAction();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REVOKE_REASONS[0]);
  const [note, setNote] = useState("");
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        Revoke badge
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title={`Revoke ${company}'s ${label} badge?`}
        description={`Buyers stop seeing the badge on ${company}'s profile, products and quotes straight away. ${company} is told why by email.`}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Keep badge
            </Button>
            <Button
              variant="destructive"
              disabled={a.pending}
              onClick={() => {
                a.go(
                  () => revokeBadgeAction(badgeId, reason, note),
                  () => {
                    setOpen(false);
                  },
                );
              }}
            >
              Revoke badge
            </Button>
          </div>
        }
      >
        {a.error ? <Alert tone="error" title={a.error} live /> : null}
        <label className="flex flex-col gap-1.5">
          <span className="type-label">
            Reason <span className="text-error">*</span>
          </span>
          <Select
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
            }}
          >
            {REVOKE_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Note to {company}</span>
          <Textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
            }}
          />
        </label>
      </Modal>
    </>
  );
}
