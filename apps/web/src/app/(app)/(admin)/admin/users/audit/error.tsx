"use client";

import { Button, EmptyState } from "@h2india/ui";

// Error · audit log (657:1313).
export default function AuditError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="m-8 rounded-card border border-default bg-page">
      <EmptyState
        kind="error"
        title="We couldn't load the audit log"
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
        No entries have been lost. Check your connection and try again.
      </EmptyState>
    </div>
  );
}
