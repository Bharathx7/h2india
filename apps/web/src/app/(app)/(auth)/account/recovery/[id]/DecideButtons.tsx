"use client";

import { Alert, Button } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { closeSupport, decide } from "../../../forgot-access/actions";

export function DecideButtons({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const answer = (approve: boolean) => {
    setBusy(true);
    void decide(requestId, approve).then((r) => {
      setBusy(false);
      if (r.ok) router.refresh();
      else
        setProblem(r.code === "NOT_ALLOWED" ? "Only an admin of this company can answer this request." : "Try again.");
    });
  };
  return (
    <>
      {problem ? <Alert tone="error" title={problem} live /> : null}
      <div className="flex flex-wrap gap-3">
        <Button
          size="lg"
          disabled={busy}
          onClick={() => {
            answer(true);
          }}
        >
          Approve
        </Button>
        <Button
          variant="outline"
          size="lg"
          disabled={busy}
          onClick={() => {
            answer(false);
          }}
        >
          Decline
        </Button>
      </div>
    </>
  );
}

/** Support marks a lost-email request handled after replying to the person (A23). */
export function CloseSupportButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  return (
    <>
      {problem ? <Alert tone="error" title={problem} live /> : null}
      <Button
        size="lg"
        className="w-full"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void closeSupport(requestId).then((r) => {
            setBusy(false);
            if (r.ok) router.refresh();
            else
              setProblem(r.code === "NOT_ALLOWED" ? "Only H2 Economy support can close this request." : "Try again.");
          });
        }}
      >
        Mark as handled
      </Button>
    </>
  );
}
