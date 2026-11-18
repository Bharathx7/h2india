"use client";

import { Button } from "@h2india/ui";
import Link from "next/link";
import { useState } from "react";
import { saveChoice, useCookieChoice } from "./store";

// Cookie banner (53:1455): words as drawn. Shown until a choice is saved for the current consent version. Cookie
// preferences opens the choices on the Cookie policy page (/legal/cookies#preferences).

export function CookieBanner() {
  const choice = useCookieChoice();
  const [busy, setBusy] = useState(false);
  if (choice !== null) return null;
  const choose = (analytics: boolean) => {
    setBusy(true);
    void saveChoice(analytics, "banner").finally(() => {
      setBusy(false);
    });
  };
  return (
    <section
      aria-label="We use cookies"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-page pb-[env(safe-area-inset-bottom)] shadow-ink-float"
    >
      {/* Phone: text, then Reject | Accept as two equal full-width buttons, the Cookie preferences link below.
          Tablet (sm–lg): text, then the three buttons right-aligned in one row.
          Desktop (lg+): text and buttons on one line. Reject and Accept share one width (min 144 px) and height (40 px);
          Cookie preferences is a text link so the two choices carry equal weight. */}
      <div className="mx-auto flex max-w-300 flex-col gap-3 px-4 py-4 sm:gap-4 sm:py-5 md:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8 xl:px-0">
        <div className="flex min-w-0 flex-col gap-1 lg:max-w-190">
          <h2 className="type-label-lg text-primary">We use cookies</h2>
          <p className="type-body-sm text-secondary">
            Necessary cookies keep you signed in and your cart safe. Optional cookies help us improve H2 Economy. Change
            this any time in Cookie preferences.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-3 lg:shrink-0">
          <Link
            href="/legal/cookies#preferences"
            className="order-last col-span-2 sm:order-first sm:mr-1 inline-flex h-8 items-center justify-center rounded-sm type-label text-primary underline underline-offset-4 transition-colors hover:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-10 sm:px-2"
          >
            Cookie preferences
          </Link>
          <Button
            variant="secondary"
            disabled={busy}
            className="w-full sm:w-auto sm:min-w-36"
            onClick={() => {
              choose(false);
            }}
          >
            Reject optional
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            className="w-full sm:w-auto sm:min-w-36"
            onClick={() => {
              choose(true);
            }}
          >
            Accept all
          </Button>
        </div>
      </div>
    </section>
  );
}
