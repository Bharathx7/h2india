"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "../../icons/Icon";
import { Button } from "../Button";

/* Figma "Announcement bar" (25:517): one site-wide message in fresh-500 with ink-900 text (7.98:1), edited from
   the admin Homepage editor. The text is Inter 600 at 15/20 in Figma, which is not a text style (decision D-UI7). */

export function AnnouncementBar({ icon = "clipboard-check", children }: { icon?: IconName; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-center gap-2.5 bg-accent px-5 py-3 text-center">
      <Icon name={icon} size={18} className="text-icon-primary" />
      <p className="text-[0.9375rem] leading-5 font-semibold text-primary">{children}</p>
    </div>
  );
}

/* Figma "Cookie banner" (53:1455): shown on the first visit until the visitor chooses. Reject and Accept carry
   equal weight (DPDP Act 2023). Fixed at the bottom of every public page. The choice is stored in the
   h2_consent cookie for a year: "necessary" or "all". */

export type ConsentChoice = "necessary" | "all";

export function readConsent(): ConsentChoice | null {
  if (typeof document === "undefined") return null;
  const m = /(?:^|;\s*)h2_consent=(necessary|all)/.exec(document.cookie);
  return (m?.[1] as ConsentChoice | undefined) ?? null;
}

function saveConsent(choice: ConsentChoice) {
  document.cookie = `h2_consent=${choice}; Max-Age=${String(60 * 60 * 24 * 365)}; Path=/; SameSite=Lax; Secure`;
}

export function CookieBanner({
  preferencesHref,
  onChoice,
}: {
  preferencesHref: string;
  onChoice?: (choice: ConsentChoice) => void;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(readConsent() === null);
  }, []);
  if (!show) return null;
  const choose = (c: ConsentChoice) => {
    saveConsent(c);
    setShow(false);
    onChoice?.(c);
  };
  return (
    <section
      aria-label="Cookies"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-page pb-[env(safe-area-inset-bottom)] shadow-ink-float"
    >
      <div className="mx-auto flex max-w-300 flex-col gap-3 px-4 py-4 sm:gap-4 sm:py-5 md:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8 xl:px-0">
        <div className="flex min-w-0 flex-col gap-1 lg:max-w-190">
          <p className="type-label-lg text-primary">We use cookies</p>
          <p className="type-body-sm text-secondary">
            Necessary cookies keep you signed in and your cart safe. Optional cookies help us improve H2 Economy. Change
            this any time in Cookie preferences.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-3 lg:shrink-0">
          <a href={preferencesHref} className="order-last col-span-2 sm:order-first sm:mr-1 inline-flex h-8 items-center justify-center rounded-sm type-label text-primary underline underline-offset-4 transition-colors hover:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-10 sm:px-2">
            Cookie preferences
          </a>
          <Button
            variant="secondary"
            className="w-full sm:w-auto sm:min-w-36"
            onClick={() => {
              choose("necessary");
            }}
          >
            Reject optional
          </Button>
          <Button
            variant="secondary"
            className="w-full sm:w-auto sm:min-w-36"
            onClick={() => {
              choose("all");
            }}
          >
            Accept all
          </Button>
        </div>
      </div>
    </section>
  );
}
