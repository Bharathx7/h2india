"use client";

import { Alert, Button } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitJob } from "./actions";

/** "Submit for review" on the preview bar (468:7854). */
export function SubmitButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        disabled={pending}
        onClick={() => {
          setProblem(null);
          start(async () => {
            const r = await submitJob(id);
            if (r.ok) router.push(`/opportunities/jobs/post/submitted?id=${String(id)}`);
            else setProblem(r.message ?? "We couldn’t submit your job. Try again.");
          });
        }}
      >
        Submit for review
      </Button>
      {problem ? <Alert live tone="error" title={problem} /> : null}
    </div>
  );
}
