"use client";

import { AsyncSection } from "@h2india/ui";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * AsyncSection for server pages (step 2.5): server components can't hand a function to the browser, so this adds the
 * error state's Try again, which reloads the page's data without a full reload.
 */
export function LiveSection(props: Omit<ComponentProps<typeof AsyncSection>, "onRetry">) {
  const router = useRouter();
  return (
    <AsyncSection
      {...props}
      onRetry={() => {
        router.refresh();
      }}
    />
  );
}
