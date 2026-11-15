"use client";

import { Alert, Button, Icon } from "@h2india/ui";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const cancelled = (message: string) => /cancel|abort|not allowed|NotAllowed/i.test(message);

export function PasskeyStep({ next, hasPasskey }: { next: string; hasPasskey: boolean }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  const signIn = async () => {
    const result = await authClient.signIn.passkey();
    if (result.error) {
      if (!cancelled(result.error.message ?? "")) setProblem("We couldn't confirm the passkey. Try again.");
      return;
    }
    // A full load, so the new session's cookie reaches the server.
    window.location.assign(next);
  };

  const go = async () => {
    setBusy(true);
    setProblem(undefined);
    if (!hasPasskey) {
      const added = await authClient.passkey.addPasskey({ name: navigator.platform || "This device" });
      if (added.error) {
        setBusy(false);
        if (!cancelled(added.error.message ?? "")) setProblem("We couldn't create the passkey. Try again.");
        return;
      }
    }
    await signIn();
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <span className="flex size-14 items-center justify-center rounded-pill bg-subtle text-primary">
        <Icon name="lock" size={28} />
      </span>
      <h1 className="type-h3">{hasPasskey ? "Confirm with your passkey" : "Set up a passkey"}</h1>
      <p className="type-body text-body">
        {hasPasskey
          ? "The back office needs a passkey sign-in. Use the passkey on this device to continue."
          : "Every operator signs in to the back office with a passkey. Create one on this device, then confirm with it."}
      </p>
      {problem ? (
        <Alert tone="error" title={problem} live>
          {null}
        </Alert>
      ) : null}
      <Button onClick={() => void go()} disabled={busy} className="w-full">
        {hasPasskey ? "Use my passkey" : "Create a passkey"}
      </Button>
    </div>
  );
}
