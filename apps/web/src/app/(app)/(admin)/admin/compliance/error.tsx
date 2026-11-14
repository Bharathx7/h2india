"use client";

import { Button, EmptyState } from "@h2india/ui";

// Error · compliance requests (661:948).
export default function ComplianceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="m-8 rounded-card border border-default bg-page">
      <EmptyState
        kind="error"
        title="We couldn't load compliance requests"
        action={
          <Button
            variant="outline"
            onClick={() => {
              reset();
            }}
          >
            Try again
          </Button>
        }
      >
        No requests or timers have been lost. Check your connection and try again.
      </EmptyState>
    </div>
  );
}
