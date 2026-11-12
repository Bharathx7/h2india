"use client";

import "./(app)/globals.css";
import { Button } from "@h2india/ui";
import { ErrorPage } from "@/errors/ErrorPage";

// When even the layout fails (step 5.10, 679:443): the same 500 page on its own, with the reference.

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body>
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
      </body>
    </html>
  );
}
