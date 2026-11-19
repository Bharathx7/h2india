"use client";

import { Alert, Button, ConfirmDialog, useToast } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resendInvitationAction } from "@/team/invite-actions";
import { answerJoinRequestAction, revokeInvitationAction } from "./team-actions";

// Team controls (592:371) the shared Team panel (apps/web/src/team) still uses: join requests and invitations.

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
  return { error, setError, pending, go };
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

/** Resend invitation (founder, 19 Nov 2026): a fresh link with a fresh expiry; core limits how often. */
export function ResendInvite({ id, email }: { id: string; email: string }) {
  const r = useRun();
  const toast = useToast();
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={r.pending}
        onClick={() => {
          r.go(
            () => resendInvitationAction(id),
            () => {
              toast({ tone: "success", title: "Invitation sent again", body: `We emailed ${email} a new link.` });
            },
          );
        }}
      >
        Resend invitation<span className="sr-only"> to {email}</span>
      </Button>
      {r.error ? (
        <span role="alert" className="max-w-60 text-right type-caption text-error">
          {r.error}
        </span>
      ) : null}
    </span>
  );
}

/** Cancel invitation, with a confirmation (founder, 19 Nov 2026: it went at one click, with no word if it failed). */
export function RevokeInvite({ id, email }: { id: string; email: string }) {
  const r = useRun();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          r.setError("");
          setOpen(true);
        }}
      >
        Cancel invitation<span className="sr-only"> for {email}</span>
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="destructive"
        title={`Cancel the invitation to ${email}?`}
        description="The link in their email stops working. You can invite them again later."
        confirmLabel="Cancel invitation"
        cancelLabel="Keep invitation"
        confirmDisabled={r.pending}
        onConfirm={() => {
          r.go(
            () => revokeInvitationAction(id),
            () => {
              setOpen(false);
              toast({ tone: "success", title: "Invitation cancelled", body: `${email} can no longer use the link.` });
            },
          );
        }}
      >
        {r.error ? <Alert tone="error" title={r.error} live /> : null}
      </ConfirmDialog>
    </>
  );
}
