"use client";

import { Alert, Button, Input, Modal, Select, Textarea } from "@h2india/ui";
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

export function SuspendUser({ userId, name, suspended }: { userId: string; name: string; suspended: boolean }) {
  return suspended ? (
    <ReasonDialog
      trigger="Lift suspension"
      title={`Lift ${name}'s suspension?`}
      description="They can sign in again straight away."
      label="Reason"
      confirm="Lift suspension"
      go={(r) => suspendAction(userId, r, true)}
    />
  ) : (
    <ReasonDialog
      trigger="Suspend user"
      destructive
      title={`Suspend ${name}?`}
      description="They're signed out everywhere at once and can't sign in. Their company stays as it is. They can appeal by email."
      label="Reason"
      confirm="Suspend user"
      go={(r) => suspendAction(userId, r, false)}
    />
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

export function ViewAs({ userId, name }: { userId: string; name: string }) {
  return (
    <ReasonDialog
      trigger="View as user"
      title={`View the site as ${name}?`}
      description="Read-only, for 15 minutes: nothing can be saved, sent or changed. The start, the end and your reason are kept in the audit log."
      label="Why do you need to see what they see?"
      confirm="Start viewing"
      min={10}
      go={(r) => viewAsAction(userId, r)}
    />
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
