"use client";

import { createContext, useContext } from "react";

/** Steps a sign-up page skips (public QC 2): "How you'll use H2 India" is already chosen on /join/buyer and the rest. */
export const SkippedSteps = createContext(0);

// "Step 1 of 4 · How you'll use H2 India" and its bar (Figma 525:9 Progress).
export function Progress({ step: drawn, of: total, label }: { step: number; of: number; label: string }) {
  const skipped = useContext(SkippedSteps);
  const step = drawn - skipped;
  const of = total - skipped;
  // Joining as a member is one step on its own page: no "Step 1 of 1".
  if (of <= 1) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="type-caption text-secondary">
        Step {step} of {of} · {label}
      </p>
      <div
        className="h-1 rounded-pill bg-subtle"
        role="progressbar"
        aria-label="Join progress"
        aria-valuemin={0}
        aria-valuemax={of}
        aria-valuenow={step}
      >
        <div className="h-1 rounded-pill bg-accent" style={{ width: `${String((step / of) * 100)}%` }} />
      </div>
    </div>
  );
}
