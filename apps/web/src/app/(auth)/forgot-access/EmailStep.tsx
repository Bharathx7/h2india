"use client";

import { Alert, Button, FormField, Input } from "@h2india/ui";
import { useState } from "react";
import type { RecoveryKind } from "@h2india/core/recovery";
import { begin } from "./actions";

// First step of every recovery path: which account. Not drawn (decision A11): built like the sign-in email field.
export function EmailStep(props: {
  kind: RecoveryKind;
  label: string;
  button: string;
  onStarted: (v: { email: string; maskedMobile: string | null }) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          setError("Enter your work email, like you@company.com");
          return;
        }
        setBusy(true);
        setProblem(undefined);
        void begin(props.kind, email).then((r) => {
          setBusy(false);
          if (r.ok) props.onStarted(r.value);
          else if (r.code === "RESEND_TOO_SOON" || r.code === "TOO_MANY_CODES" || r.code === "PAUSED") {
            setProblem("Too many codes were asked for. Wait a few minutes and try again.");
          } else setProblem("We couldn't start. Check your connection and try again.");
        });
      }}
    >
      {problem ? <Alert tone="error" title={problem} live /> : null}
      <FormField label={props.label} error={error}>
        <Input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(undefined);
          }}
        />
      </FormField>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {props.button}
      </Button>
    </form>
  );
}
