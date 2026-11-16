"use client";

import { Alert, Button, Icon, Input } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { addBankAccountAction, cancelBankChangeAction, confirmBankAccountAction } from "./bank-actions";

// The payout bank account steps (588:748): new account → test deposit → confirm it's you (passkey) → hold period.

function useRun() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const go = (work: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    start(async () => {
      const r = await work();
      setError(r.ok ? "" : r.error);
      if (r.ok) router.refresh();
    });
  };
  return { error, pending, go, setError };
}

export function NewAccountForm({ defaultHolder }: { defaultHolder: string }) {
  const r = useRun();
  const [f, setF] = useState({ holderName: defaultHolder, accountNumber: "", confirmNumber: "", ifsc: "" });
  return (
    <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
      <h2 className="type-h4">New account</h2>
      {r.error ? <Alert tone="error" title={r.error} live /> : null}
      <label className="flex flex-col gap-1.5">
        <span className="type-label">Account holder</span>
        <Input
          value={f.holderName}
          onChange={(e) => {
            setF({ ...f, holderName: e.target.value });
          }}
        />
        <span className="type-caption text-secondary">It must match your GST legal name.</span>
      </label>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Account number</span>
          <Input
            inputMode="numeric"
            autoComplete="off"
            value={f.accountNumber}
            onChange={(e) => {
              setF({ ...f, accountNumber: e.target.value });
            }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Account number again</span>
          <Input
            inputMode="numeric"
            autoComplete="off"
            value={f.confirmNumber}
            onChange={(e) => {
              setF({ ...f, confirmNumber: e.target.value });
            }}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="type-label">IFSC</span>
        <Input
          value={f.ifsc}
          onChange={(e) => {
            setF({ ...f, ifsc: e.target.value });
          }}
        />
      </label>
      <Button
        className="self-start"
        disabled={r.pending}
        onClick={() => {
          r.go(() => addBankAccountAction(f));
        }}
      >
        Check this account
      </Button>
    </section>
  );
}

export function ConfirmWithPasskey({ id, holdUntil }: { id: string; holdUntil: string | null }) {
  const r = useRun();
  return (
    <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
      <h2 className="type-h4">Confirm with your passkey</h2>
      <p className="type-body-sm text-body">
        To protect your payouts, confirm this change with the passkey on this device.
        {holdUntil ? ` After that, payouts are held until ${holdUntil} IST.` : ""}
      </p>
      {r.error ? <Alert tone="error" title={r.error} live /> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={r.pending}
          onClick={() => {
            r.go(async () => {
              const pk = await authClient.signIn.passkey();
              if (pk.error)
                return {
                  ok: false,
                  error: "The passkey wasn't confirmed. Try again, or add a passkey in Sign-in and security.",
                };
              return confirmBankAccountAction(id);
            });
          }}
        >
          <Icon name="lock" size={16} />
          Confirm with passkey
        </Button>
        <button
          type="button"
          className="type-label"
          disabled={r.pending}
          onClick={() => {
            r.go(() => cancelBankChangeAction(id));
          }}
        >
          Cancel change
        </button>
      </div>
      <SetUpPasskey />
    </section>
  );
}

/**
 * Sign-in is by email code only (public QC 2, 16 Nov 2026), so a supplier may have no passkey yet: they set one up
 * here, on this device, the first time they change the payout account.
 */
function SetUpPasskey() {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  if (state === "done")
    return <Alert tone="success" title="Passkey set up on this device. Now choose Confirm with passkey." live />;
  return (
    <div className="flex flex-col gap-2 border-t border-default pt-3">
      <p className="type-body-sm text-body">
        No passkey on this device yet? Set one up with your fingerprint, face or screen lock. It takes a few seconds.
      </p>
      {state === "error" ? <Alert tone="error" title="We couldn't set up the passkey. Try again." live /> : null}
      <Button
        variant="outline"
        className="self-start"
        disabled={state === "busy"}
        onClick={() => {
          setState("busy");
          void authClient.passkey.addPasskey({ name: "Payout confirmation" }).then((result) => {
            if (!result.error) {
              setState("done");
              return;
            }
            const message = result.error.message ?? "";
            setState(/cancel|abort|not allowed|NotAllowed/i.test(message) ? "idle" : "error");
          });
        }}
      >
        Set up a passkey
      </Button>
    </div>
  );
}

export function CancelChange({ id, oldLast4, company }: { id: string; oldLast4: string; company: string }) {
  const r = useRun();
  return (
    <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
      <h2 className="type-h4">Didn&apos;t make this change?</h2>
      <p className="type-body-sm text-body">
        Cancel it now and payouts stay with the account ending {oldLast4}. We&apos;ve told all admins at {company} by
        email and SMS.
      </p>
      {r.error ? <Alert tone="error" title={r.error} live /> : null}
      <Button
        variant="destructive"
        className="self-start"
        disabled={r.pending}
        onClick={() => {
          r.go(() => cancelBankChangeAction(id));
        }}
      >
        Cancel this change
      </Button>
    </section>
  );
}

export function TryAnother() {
  const [open, setOpen] = useState(false);
  return open ? (
    <NewAccountForm defaultHolder="" />
  ) : (
    <div className="flex items-center gap-3">
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Try another account
      </Button>
      <Link href="/help" className="type-label">
        Contact support
      </Link>
    </div>
  );
}
