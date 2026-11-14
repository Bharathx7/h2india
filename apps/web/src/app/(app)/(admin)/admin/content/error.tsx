"use client";

import { Button, EmptyState } from "@h2india/ui";

// The content screens' error state (642:326).
export default function ContentError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="m-8 rounded-card border border-default bg-page">
      <EmptyState
        kind="error"
        title="We couldn't load content"
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
        Nothing has been changed. Check your connection and try again.
      </EmptyState>
    </div>
  );
}
