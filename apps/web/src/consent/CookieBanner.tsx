"use client";

import { Button, buttonClasses, cx } from "@h2india/ui";
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
      <div className="mx-auto flex max-w-300 flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6 xl:px-0">
        <div className="flex max-w-190 flex-col gap-1">
          <h2 className="type-label-lg text-primary">We use cookies</h2>
          <p className="type-body-sm text-secondary">
            Necessary cookies keep you signed in and your cart safe. Optional cookies help us improve H2 India. Change
            this any time in Cookie preferences.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/legal/cookies#preferences" className={cx(buttonClasses({ variant: "ghost" }))}>
            Cookie preferences
          </Link>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              choose(false);
            }}
          >
            Reject optional
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
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
