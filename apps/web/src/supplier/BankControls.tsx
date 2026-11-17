"use client";

import { Alert, Button, Input } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmItsYou } from "@/components/ConfirmItsYou";
import { addBankAccountAction, cancelBankChangeAction, confirmBankAccountAction } from "./bank-actions";

// The payout bank account steps (588:748): new account → test deposit → confirm it's you (a code to your email, since
// passkeys were removed on 17 Nov 2026) → hold period.

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

export function ConfirmChange({ id, holdUntil }: { id: string; holdUntil: string | null }) {
  const r = useRun();
  const router = useRouter();
  return (
    <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
      <h2 className="type-h4">Confirm it&apos;s you</h2>
      <p className="type-body-sm text-body">
        To protect your payouts, confirm this change with a code we email you.
        {holdUntil ? ` After that, payouts are held until ${holdUntil} IST.` : ""}
      </p>
      {r.error ? <Alert tone="error" title={r.error} live /> : null}
      <ConfirmItsYou
        actionLabel="Confirm change"
        disabled={r.pending}
        onConfirmed={async () => {
          const result = await confirmBankAccountAction(id);
          if (result.ok) router.refresh();
          return result;
        }}
      />
      <button
        type="button"
        className="self-start type-label"
        disabled={r.pending}
        onClick={() => {
          r.go(() => cancelBankChangeAction(id));
        }}
      >
        Cancel change
      </button>
    </section>
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
