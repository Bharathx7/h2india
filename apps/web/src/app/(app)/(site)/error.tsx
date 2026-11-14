"use client";

import { Button } from "@h2india/ui";
import { useEffect } from "react";
import { ErrorPage } from "@/errors/ErrorPage";

// Error 500 inside the public site (679:443, 679:572). The reference is the error's digest, which the server logs
// with the request ID (instrumentation.ts), so support can find it.

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <ErrorPage
      code={500}
      title="Something went wrong on our side"
      text="We've logged the problem and we're fixing it. Try again in a minute, or search for what you need."
      chips={[
        { label: "Marketplace", href: "/marketplace" },
        { label: "News", href: "/news" },
        { label: "Opportunities", href: "/opportunities" },
      ]}
      primary={<Button onClick={reset}>Try again</Button>}
      reference={error.digest}
    />
  );
}
