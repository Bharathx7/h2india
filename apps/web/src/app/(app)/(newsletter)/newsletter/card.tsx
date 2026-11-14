import { Icon, type IconName } from "@h2india/ui";
import type { ReactNode } from "react";

// The centred card of the sign-up states (448:7048, 448:7291, 448:7392).

export function StateCard({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <main id="main" className="flex flex-col items-center bg-subtle px-4 pt-12 pb-20 md:pt-16 md:pb-30">
      <div className="flex w-full max-w-108 flex-col items-center gap-4 rounded-card border border-default bg-page p-6 text-center md:p-8">
        <span className="flex size-12 items-center justify-center rounded-pill bg-mint text-icon-primary">
          <Icon name={icon} size={22} />
        </span>
        <h1 className="type-h2 text-primary">{title}</h1>
        {children}
      </div>
    </main>
  );
}
