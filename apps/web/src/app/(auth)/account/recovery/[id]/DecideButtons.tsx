"use client";

import { Alert, Button } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { decide } from "../../../forgot-access/actions";

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
