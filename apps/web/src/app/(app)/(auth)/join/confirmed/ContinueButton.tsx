"use client";

import { Alert, Button } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { continueAfterConfirm } from "../actions";

export function ContinueButton({ linkToken }: { linkToken?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <>
      {failed ? (
        <Alert tone="error" title="We couldn't finish your sign-up here" live>
          Your email stays confirmed. Taking you back to your sign-up page to check your details…
        </Alert>
      ) : null}
      <Button
        size="lg"
        className="w-full"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void continueAfterConfirm(linkToken).then((r) => {
            if (r.ok) {
              router.push(r.value);
              return;
            }
            setBusy(false);
            // The server says where to pick up: the person's own sign-up page, or a fresh link.
            const back = r.message?.startsWith("/") ? r.message : "/join";
            setFailed(back);
            router.push(back);
          });
        }}
      >
        Continue
      </Button>
    </>
  );
}
