"use client";

import { FormField, Icon, OtpInput } from "@h2india/ui";
import { useState } from "react";
import type { Outcome } from "./actions";

// One code row of the recovery screens: label, six boxes, "Email verified" (528:53, 528:293).

function message(r: Extract<Outcome, { ok: false }>): string {
  if (r.code === "EXPIRED_CODE") return "That code has expired. Start again for a new one.";
  if (r.code === "PAUSED") return "Too many wrong codes. Try again in 15 minutes.";
  if (r.code === "EXPIRED") return "This recovery has expired. Start again.";
  const left = r.triesLeft ?? 0;
  return left > 0
    ? `That code didn't work. You have ${String(left)} ${left === 1 ? "try" : "tries"} left.`
    : "That code didn't work.";
}

export function CodeField(props: {
  label: string;
  verifiedLabel: string;
  verified: boolean;
  onVerify: (code: string) => Promise<Outcome>;
  onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  if (props.verified) {
    return (
      <div className="flex flex-col gap-2">
        <p className="type-label text-primary">{props.label}</p>
        <p className="flex items-center gap-2 type-caption text-success" role="status">
          <Icon name="check-circle" size={16} />
          {props.verifiedLabel}
        </p>
      </div>
    );
  }
  return (
    <FormField label={props.label} error={error}>
      <OtpInput
        size="field"
        label={props.label}
        value={code}
        disabled={busy}
        invalid={Boolean(error)}
        onChange={(v) => {
          setCode(v);
          setError(undefined);
        }}
        onComplete={(v) => {
          setBusy(true);
          void props.onVerify(v).then((r) => {
            setBusy(false);
            if (r.ok) props.onVerified();
            else setError(message(r));
          });
        }}
      />
    </FormField>
  );
}
