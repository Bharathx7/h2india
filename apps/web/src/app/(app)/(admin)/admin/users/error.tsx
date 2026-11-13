"use client";

import { Button, EmptyState } from "@h2india/ui";

export default function UsersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="m-8 rounded-card border border-default bg-page">
      <EmptyState
        kind="error"
        title="We couldn't load this page"
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
        Nothing has been lost. Check your connection and try again.
      </EmptyState>
    </div>
  );
}
