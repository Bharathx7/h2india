"use client";

import {
  BADGE_KINDS,
  DESK_CHECKLIST,
  deskChecksProblem,
  MIN_DESK_CHECKS,
  REVOKE_REASONS,
  tickedDeskChecks,
} from "@h2india/core/supplier/rules";
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

/**
 * The Verification checklist. Founder, 19 Nov 2026: identity and bank start ticked when the records prove them
 * (`evidence`, from deskEvidence()); the operator can untick. A tick the operator changed stays theirs even when the
 * evidence changes (a document verified above), and Approve says why it can't work yet instead of failing after a click.
 */
export function ReviewDecision({
  id,
  initial,
  evidence,
  verifyFirst,
}: {
  id: string;
  initial: Record<string, boolean>;
  evidence: Record<string, boolean>;
  /** Documents that must be verified above before the badge can be granted ("GST certificate", "PAN card"). */
  verifyFirst: string[];
}) {
  const a = useAction();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const checks: Record<string, boolean> = Object.fromEntries(
    DESK_CHECKLIST.map((c) => [c.key, touched[c.key] ?? (evidence[c.key] || initial[c.key] === true)]),
  );
  const [reason, setReason] = useState("");
  const ticked = tickedDeskChecks(checks);
  const blocked = verifyFirst.length
    ? `Verify the ${verifyFirst.join(" and ")} above first`
    : deskChecksProblem(checks);
  return (
    <div className="flex flex-col gap-3">
      <p className="type-caption text-secondary">
        {ticked} of {DESK_CHECKLIST.length} ticked · at least {MIN_DESK_CHECKS} to approve
      </p>
      {DESK_CHECKLIST.map((c) => (
        <div key={c.key} className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Checkbox
            label={c.label}
            checked={checks[c.key] === true}
            onCheckedChange={(v) => {
              setTouched({ ...touched, [c.key]: v === true });
            }}
          />
          {evidence[c.key] && touched[c.key] === undefined ? (
            <span className="type-caption text-secondary">from evidence</span>
          ) : null}
        </div>
      ))}
      <Textarea
        aria-label="What to fix"
        placeholder="What to fix (to send it back)"
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
        }}
      />
      {blocked ? (
        <p id={`approve-blocked-${id}`} className="flex items-center gap-1.5 type-body-sm text-body">
          <Icon name="info" size={16} className="text-icon-link" />
          {blocked}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={a.pending || blocked !== null}
          aria-describedby={blocked ? `approve-blocked-${id}` : undefined}
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
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[200px_minmax(0,1fr)_auto]">
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
