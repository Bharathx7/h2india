"use client";

import {
  Alert,
  Button,
  ConfirmDialog,
  Icon,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Modal,
  Select,
  StatusBadge,
} from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  answerJoinRequestAction,
  changeRoleAction,
  inviteMemberAction,
  removeMemberAction,
  revokeInvitationAction,
} from "./team-actions";

// Team and permissions controls (592:371, Dialog Remove team member 685:318).

function useRun() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const go = (work: () => Promise<{ ok: true } | { ok: false; error: string }>, done?: () => void) => {
    start(async () => {
      const r = await work();
      setError(r.ok ? "" : r.error);
      if (r.ok) {
        done?.();
        router.refresh();
      }
    });
  };
  return { error, pending, go };
}

export function InviteMember({ roles }: { roles: { name: string; description: string }[] }) {
  const r = useRun();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles.find((x) => x.name === "Viewer")?.name ?? roles[0]?.name ?? "");
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name="plus" size={18} />
        Invite member
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Invite member"
        description="We email them a link. It works for 14 days."
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
              disabled={r.pending}
              onClick={() => {
                r.go(
                  () => inviteMemberAction(email, role),
                  () => {
                    setOpen(false);
                  },
                );
              }}
            >
              Send invitation
            </Button>
          </div>
        }
      >
        {r.error ? <Alert tone="error" title={r.error} live /> : null}
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Work email</span>
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Role</span>
          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
            }}
          >
            {roles.map((x) => (
              <option key={x.name} value={x.name}>
                {x.name}
              </option>
            ))}
          </Select>
          <span className="type-caption text-secondary">{roles.find((x) => x.name === role)?.description}</span>
        </label>
      </Modal>
    </>
  );
}

export function JoinRequest({ id, name }: { id: string; name: string }) {
  const r = useRun();
  return (
    <span className="flex flex-col items-end gap-1">
      <span className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={r.pending}
          onClick={() => {
            r.go(() => answerJoinRequestAction(id, false));
          }}
        >
          Reject<span className="sr-only"> {name}</span>
        </Button>
        <Button
          size="sm"
          disabled={r.pending}
          onClick={() => {
            r.go(() => answerJoinRequestAction(id, true));
          }}
        >
          Approve<span className="sr-only"> {name}</span>
        </Button>
      </span>
      {r.error ? <span className="type-caption text-error">{r.error}</span> : null}
    </span>
  );
}

export function MemberMenu({
  userId,
  name,
  email,
  role,
  lastActive,
  company,
  roles,
  self,
}: {
  userId: string;
  name: string;
  email: string;
  role: string;
  lastActive: string;
  company: string;
  roles: string[];
  self: boolean;
}) {
  const r = useRun();
  const [removing, setRemoving] = useState(false);
  const first = name.split(" ")[0] ?? name;
  return (
    <>
      <Menu>
        <MenuTrigger
          aria-label={`Actions for ${name}`}
          className="flex size-8 items-center justify-center rounded-pill border border-control"
        >
          <Icon name="more-horizontal" size={18} />
        </MenuTrigger>
        <MenuContent>
          {roles
            .filter((x) => x !== role)
            .map((x) => (
              <MenuItem
                key={x}
                icon="user"
                onSelect={() => {
                  r.go(() => changeRoleAction(userId, x));
                }}
              >
                Make {x}
              </MenuItem>
            ))}
          {!self ? (
            <MenuItem
              icon="trash"
              onSelect={() => {
                setRemoving(true);
              }}
            >
              Remove from team
            </MenuItem>
          ) : null}
        </MenuContent>
      </Menu>
      {r.error ? <span className="block type-caption text-error">{r.error}</span> : null}
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        tone="destructive"
        title={`Remove ${name} from ${company}?`}
        description={`${first} loses access to ${company}'s supplier workspace straight away and is signed out of it.`}
        confirmLabel="Remove from team"
        cancelLabel={`Keep ${first}`}
        onConfirm={() => {
          setRemoving(false);
          r.go(() => removeMemberAction(userId));
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-control bg-subtle p-3">
            <span className="min-w-0 flex-1">
              <span className="block type-label">{name}</span>
              <span className="block type-caption text-secondary">
                {email} · last active {lastActive}
              </span>
            </span>
            <StatusBadge status={role} tone="neutral" />
          </div>
          <p className="flex gap-2 type-body-sm">
            <Icon name="info" size={16} />
            {first} can no longer see fees, invoices or payouts for {company}.
          </p>
          <p className="flex gap-2 type-body-sm">
            <Icon name="check-circle" size={16} />
            Invoices, statements and messages {first} worked on stay with the company. Their H2 Economy account
            isn&apos;t deleted, and you can invite them again.
          </p>
        </div>
      </ConfirmDialog>
    </>
  );
}

export function RevokeInvite({ id, email }: { id: string; email: string }) {
  const r = useRun();
  return (
    <button
      type="button"
      className="type-label"
      disabled={r.pending}
      onClick={() => {
        r.go(() => revokeInvitationAction(id));
      }}
    >
      Cancel invitation<span className="sr-only"> for {email}</span>
    </button>
  );
}
