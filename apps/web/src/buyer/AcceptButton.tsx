"use client";

import { Alert, Button } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptAction } from "./rfq-actions";

/** The confirm button on 569:9. Disabled while ordering is off (C8); the server refuses either way. */
export function AcceptButton({
  id,
  quoteId,
  label,
  enabled,
}: {
  id: string;
  quoteId: string;
  label: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert tone="error" title={error} live /> : null}
      <Button
        size="lg"
        disabled={!enabled || pending}
        onClick={() => {
          start(async () => {
            const r = await acceptAction(id, quoteId);
            if (!r.ok) {
              setError(r.error);
              return;
            }
            // Accepting creates the order (10.1); its page says what happens next.
            router.push(`/buyer/orders/${r.orderId}`);
            router.refresh();
          });
        }}
      >
        {label}
      </Button>
    </div>
  );
}
