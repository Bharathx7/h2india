"use client";

import { Alert, Button, useToast } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { signOutDeviceAction } from "./security-actions";

/** Sign out one other device, or every other device (sessionId null). */
export function SignOutDevice({ sessionId, label }: { sessionId: string | null; label: string }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant={sessionId === null ? "outline" : "ghost"}
        size="sm"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const r = await signOutDeviceAction(sessionId);
            if (!r.ok) {
              setError(r.error);
              return;
            }
            setError("");
            toast({
              tone: "success",
              title:
                sessionId === null
                  ? `Signed out of ${String(r.ended)} other ${r.ended === 1 ? "device" : "devices"}`
                  : "Device signed out",
            });
            router.refresh();
          });
        }}
      >
        {label}
      </Button>
      {error ? <Alert tone="error" title={error} live /> : null}
    </div>
  );
}
