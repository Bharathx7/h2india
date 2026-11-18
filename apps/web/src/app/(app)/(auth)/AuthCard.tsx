import { cx } from "@h2india/ui";
import type { ReactNode } from "react";

// The white card of the auth pages: 560 wide, 16 radius, 40 padding (24/20 on phones), 20 between items. Founder v2
// (18 Nov 2026): it floats on a soft token shadow over the glowing mint page.
export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "flex flex-col gap-5 rounded-modal border border-default bg-page px-5 py-6 shadow-ink-float-sm md:p-10",
        className,
      )}
    >
      {children}
    </div>
  );
}
