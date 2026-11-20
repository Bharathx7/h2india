import { cx } from "@h2india/ui";
import type { ReactNode } from "react";

// The white card of the auth pages: 560 wide, 16 radius, 32/28 padding (24/20 on phones), 16 between items, so every
// sign-in and join page fits one screen (founder, 20 Nov 2026). It floats on a soft token shadow over the mint page.
export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "flex flex-col gap-4 rounded-modal border border-default bg-page px-4 py-5 shadow-ink-float-sm md:px-8 md:py-7",
        className,
      )}
    >
      {children}
    </div>
  );
}
