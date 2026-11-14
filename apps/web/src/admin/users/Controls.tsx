"use client";

import { Alert, Button, FormField, Icon, Input, Modal, Select, Textarea } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { roleAction, suspendAction, suspendCompanyAction, viewAsAction } from "./actions";

// Suspend user (653:568), View as user (657:328), suspend a company and operator roles (656:8), step 11.4.

type R = { ok: true } | { ok: false; error: string };

function ReasonDialog({
  trigger,
  title,
  description,
  label,
  confirm,
  destructive,
  min = 1,
  go,
}: {
  trigger: string;
  title: string;
  description: string;
  label: string;
  confirm: string;
  destructive?: boolean;
  min?: number;
  go: (reason: string) => Promise<R>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        variant={destructive ? "destructive" : "outline"}
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        {trigger}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title={title}
        description={description}
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
              variant={destructive ? "destructive" : "primary"}
              disabled={pending || reason.trim().length < min}
              onClick={() => {
                start(async () => {
                  const r = await go(reason);
                  if (!r.ok) {
                    setError(r.error);
                    return;
                  }
                  setOpen(false);
                  setReason("");
                  router.refresh();
                });
              }}
            >
              {confirm}
            </Button>
          </div>
        }
      >
        {error ? <Alert tone="error" title={error} live /> : null}
        <label className="flex flex-col gap-1.5">
          <span className="type-label">
            {label} <span className="text-error">*</span>
          </span>
          <Textarea
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
            }}
          />
          <span className="type-caption text-secondary">Kept in the audit log with your name.</span>
        </label>
      </Modal>
    </>
  );
}

/** The person as the dialogs show them: initials, name and one line (653:568). */
export interface PersonCard {
  name: string;
  line: string;
}

const SUSPEND_REASONS = [
  "Spam or advertising (repeated)",
  "Abusive or threatening posts",
  "Pretending to be someone else",
  "Suspected fraud",
  "Other reason",
];

function Card({ person }: { person: PersonCard }) {
  const letters = person.name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="flex items-center gap-3 rounded-card border border-default p-3">
      <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-pill bg-mint type-caption">
        {letters}
      </span>
      <span>
        <span className="block type-label">{person.name}</span>
        <span className="block type-caption text-secondary">{person.line}</span>
      </span>
    </div>
  );
}

export function SuspendUser({ userId, person, suspended }: { userId: string; person: PersonCard; suspended: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (suspended)
    return (
      <ReasonDialog
        trigger="Lift suspension"
        title={`Lift ${person.name}'s suspension?`}
        description="They can sign in again straight away."
        label="Reason"
        confirm="Lift suspension"
        go={(r) => suspendAction(userId, r, true)}
      />
    );
  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        Suspend
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title={`Suspend ${person.name}?`}
        description="They can't sign in, comment or post until an operator lifts the suspension. Their content stays as it is."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Keep active
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !why || !note.trim()}
              onClick={() => {
                start(async () => {
                  const r = await suspendAction(userId, `${why}: ${note.trim()}`, false);
                  if (!r.ok) {
                    setError(r.error);
                    return;
                  }
                  setOpen(false);
                  setNote("");
                  router.refresh();
                });
              }}
            >
              Suspend user
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? <Alert tone="error" title={error} live /> : null}
          <Card person={person} />
          <FormField label="Reason" required>
            <Select
              value={why}
              onChange={(e) => {
                setWhy(e.target.value);
              }}
            >
              <option value="">Choose a reason</option>
              {SUSPEND_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Note for the audit log"
            required
            helper="Logged with your name and the time. Anyone with the Users permission can lift it."
          >
            <Textarea
              rows={4}
              maxLength={500}
              showCount
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
              }}
            />
          </FormField>
        </div>
      </Modal>
    </>
  );
}

export function SuspendCompany({
  userId,
  organisationId,
  name,
  suspended,
}: {
  userId: string;
  organisationId: string;
  name: string;
  suspended: boolean;
}) {
  return suspended ? (
    <Button variant="ghost" size="sm" onClick={() => void suspendCompanyAction(userId, organisationId, null)}>
      Lift<span className="sr-only"> {name}&apos;s suspension</span>
    </Button>
  ) : (
    <ReasonDialog
      trigger="Suspend company"
      destructive
      title={`Suspend ${name}?`}
      description="Its listings leave the marketplace and search until you lift it. Appeals go to email."
      label="Reason"
      confirm="Suspend company"
      go={(r) => suspendCompanyAction(userId, organisationId, r)}
    />
  );
}

/** View as user (657:328): read-only, with a reason, and a banner the whole time. */
export function ViewAs({
  userId,
  name,
  sees,
  label,
  variant = "outline",
}: {
  userId: string;
  name: string;
  /** "Pranava H2's supplier workspace", or "H2 India" for a member. */
  sees: string;
  label: string;
  variant?: "outline" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const first = name.split(/\s+/)[0] ?? name;
  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name="eye" size={16} />
        {label}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title={`View H2 India as ${name}?`}
        description={`You'll see ${sees} the way ${first} does. It's read-only: you can't change anything, send messages or approve actions.`}
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
              disabled={pending || reason.trim().length < 10}
              onClick={() => {
                start(async () => {
                  const r = await viewAsAction(userId, reason);
                  if (!r.ok) setError(r.error);
                });
              }}
            >
              <Icon name="eye" size={16} />
              Start read-only view
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? <Alert tone="error" title={error} live /> : null}
          <ul className="flex flex-col gap-2 rounded-card bg-subtle p-3 type-body-sm">
            <li className="flex items-center gap-2">
              <Icon name="eye" size={16} />A banner shows the whole time, with a button to end the view.
            </li>
            <li className="flex items-center gap-2">
              <Icon name="file-text" size={16} />
              The start, end and your reason go in the audit log.
            </li>
          </ul>
          <FormField label="Reason" required>
            <Textarea
              rows={3}
              maxLength={300}
              showCount
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
              }}
            />
          </FormField>
        </div>
      </Modal>
    </>
  );
}

export function RoleMember({ roles }: { roles: string[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles[0] ?? "");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const go = (add: boolean) => {
    start(async () => {
      const r = await roleAction(email, role, add, reason);
      setMsg(
        r.ok
          ? { tone: "success", text: add ? `${email} is now ${role}` : `${email} is no longer ${role}` }
          : { tone: "error", text: r.error },
      );
      router.refresh();
    });
  };
  return (
    <div className="flex flex-col gap-3">
      {msg ? <Alert tone={msg.tone} title={msg.text} live /> : null}
      <div className="grid gap-2 md:grid-cols-3">
        <Input
          aria-label="Email"
          placeholder="Their email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
        <Select
          aria-label="Role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
          }}
        >
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
        <Input
          aria-label="Reason"
          placeholder="Reason"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
          }}
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending || !email || !reason.trim()}
          onClick={() => {
            go(true);
          }}
        >
          Add to role
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending || !email || !reason.trim()}
          onClick={() => {
            go(false);
          }}
        >
          Remove from role
        </Button>
      </div>
      <p className="type-caption text-secondary">
        Only a Super admin can change operator roles. Changes apply at once, without a deploy.
      </p>
    </div>
  );
}

/** A filter select that applies at once (651:8 "Type: all", "Status: all", "Passkey: any"). */
export function AutoSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select
      name={name}
      aria-label={label}
      defaultValue={value}
      boxClassName="w-44"
      onChange={(e) => {
        e.currentTarget.form?.requestSubmit();
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
