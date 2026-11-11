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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-page shadow-ink-float"
    >
      <div className="mx-auto flex max-w-300 flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex-1">
          <p className="type-label-lg text-primary">We use cookies</p>
          <p className="mt-1 type-body-sm text-secondary">
            Necessary cookies keep you signed in and your cart safe. Optional cookies help us improve H2 India. Change
            this any time in Cookie preferences.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="ghost">
            <a href={preferencesHref}>Cookie preferences</a>
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              choose("necessary");
            }}
          >
            Reject optional
          </Button>
          <Button
            variant="secondary"
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
