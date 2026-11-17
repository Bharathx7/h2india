"use client";

import { SIGN_IN } from "@h2india/core/sign-in";
import { Alert, Button, FormField, Icon, OtpInput, TextLink } from "@h2india/ui";
import { useState } from "react";
import { confirmStepUpAction, sendStepUpAction } from "@/server/step-up-actions";

// "Confirm it's you" (744:29031, changed 17 Nov 2026 when passkeys were removed, A183): before a bank change or an
// order approval, the person gets a code at their own email and enters it; then the change goes ahead. The server
// checks the confirmation again (stepUpConfirmedRecently), so this screen is never the only guard.

type Result = { ok: true } | { ok: false; error: string };

export function ConfirmItsYou({
  actionLabel,
  onConfirmed,
  disabled = false,
}: {
  /** The button that sends the code, for example "Approve" or "Confirm change". */
  actionLabel: string;
  /** Runs once the code is accepted: the change itself. */
  onConfirmed: () => Promise<Result>;
  disabled?: boolean;
}) {
  const [step, setStep] = useState<"start" | "code">("start");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setError("");
    const r = await sendStepUpAction();
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setCode("");
    setStep("code");
  };

  const confirm = async (value: string) => {
    if (value.length < SIGN_IN.codeLength || busy) return;
    setBusy(true);
    setError("");
    const checked = await confirmStepUpAction(value);
    if (!checked.ok) {
      setBusy(false);
      setError(checked.error);
      return;
    }
    const done = await onConfirmed();
    setBusy(false);
    if (!done.ok) setError(done.error);
  };

  if (step === "start") {
    return (
      <div className="flex flex-col gap-3">
        {error ? <Alert tone="error" title={error} live /> : null}
        <Button size="lg" className="w-full" disabled={disabled || busy} onClick={() => void send()}>
          <Icon name="lock" size={18} />
          {actionLabel}
        </Button>
        <p className="type-caption text-secondary">
          To keep this safe, we&apos;ll email you a {SIGN_IN.codeLength}-digit code to confirm it&apos;s you.
        </p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-card border border-default bg-subtle p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void confirm(code);
      }}
    >
      <h3 className="type-label-lg text-primary">Confirm it&apos;s you</h3>
      <p className="type-body-sm text-body">
        We emailed you a {SIGN_IN.codeLength}-digit code. It expires in {SIGN_IN.codeMinutes} minutes.
      </p>
      <FormField label="Code from your email">
        <OtpInput
          size="field"
          label="Code from your email"
          value={code}
          onChange={setCode}
          onComplete={(value) => void confirm(value)}
          invalid={Boolean(error)}
          disabled={busy}
          autoFocus
        />
      </FormField>
      {error ? <Alert tone="error" title={error} live /> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || code.length < SIGN_IN.codeLength}>
          Confirm
        </Button>
        <TextLink asChild showIcon={false}>
          <button type="button" className="cursor-pointer" disabled={busy} onClick={() => void send()}>
            Send a new code
          </button>
        </TextLink>
        <TextLink asChild showIcon={false}>
          <button
            type="button"
            className="cursor-pointer"
            onClick={() => {
              setStep("start");
              setError("");
            }}
          >
            Cancel
          </button>
        </TextLink>
      </div>
    </form>
  );
}
