"use client";

import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { Button } from "./Button";
import { EmptyState, Skeleton } from "./Feedback";

// The required-states rule (playbook step 2.5): every list or panel that loads data shows a skeleton while
// loading, a designed error with Try again, and an empty or no-results state. Never a blank area.

export type AsyncState = "loading" | "error" | "empty" | "ready";

export interface AsyncSectionProps {
  state: AsyncState;
  /** Accessible name of the region, for example "Your quotes". */
  label: string;
  /** Skeleton in the final layout. Defaults to three text bars. */
  skeleton?: ReactNode;
  /** Shown when there is nothing to show (first use or no results). Required: an empty list must say why. */
  empty: ReactNode;
  onRetry?: () => void;
  errorTitle?: ReactNode;
  errorText?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function AsyncSection({
  state,
  label,
  skeleton,
  empty,
  onRetry,
  errorTitle = "Something went wrong",
  errorText = "We could not load this. Check your connection and try again.",
  className,
  children,
}: AsyncSectionProps) {
  return (
    <section aria-label={label} aria-busy={state === "loading"} data-state={state} className={cx(className)}>
      {state === "loading" ? (
        <>
          <span className="sr-only">Loading {label.toLowerCase()}</span>
          {skeleton ?? <Skeleton />}
        </>
      ) : state === "error" ? (
        <div role="alert">
          <EmptyState
            kind="error"
            title={errorTitle}
            action={
              onRetry ? (
                <Button variant="outline" onClick={onRetry}>
                  Try again
                </Button>
              ) : undefined
            }
          >
            {errorText}
          </EmptyState>
        </div>
      ) : state === "empty" ? (
        empty
      ) : (
        children
      )}
    </section>
  );
}
