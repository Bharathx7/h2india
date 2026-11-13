"use client";

import { Button, EmptyState } from "@h2india/ui";

// The content screens' error state: what failed, and Try again.
export default function ContentError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="m-8 rounded-card border border-default bg-page">
      <EmptyState
        kind="error"
        title="Content didn't load"
        action={
          <Button
            onClick={() => {
              reset();
            }}
          >
            Try again
          </Button>
        }
      >
        Nothing was lost. Try again, or come back in a minute.
      </EmptyState>
    </div>
  );
}
