"use client";

import { Alert, Button } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { continueAfterConfirm } from "../actions";

export function ContinueButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      {failed ? (
        <Alert tone="error" title="We couldn't find your Join details" live>
          Start again from Join; your email stays confirmed.
        </Alert>
      ) : null}
      <Button
        size="lg"
        className="w-full"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void continueAfterConfirm().then((r) => {
            setBusy(false);
            if (r.ok) router.push(r.value);
            else if (r.code === "NOT_SIGNED_IN" || r.code === "INCOMPLETE") {
              setFailed(true);
              router.push("/join");
            } else setFailed(true);
          });
        }}
      >
        Continue
      </Button>
    </>
  );
}
