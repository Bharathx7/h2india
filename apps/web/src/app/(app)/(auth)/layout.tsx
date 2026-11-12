import { Logo } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { AUTH_LINKS } from "@/lib/auth-links";

// Frame shared by the sign-in, join and recovery pages (Figma 524:1772, 526:508): mint page, logo, card, footer.
// Phones: content from the top, 24/16 padding, 16 apart. From 768 up: centred, 48 padding, 24 apart.

export default function AuthLayout({ children }: { children: ReactNode }) {
  const year = new Date().getFullYear();
  const link = "rounded-control hover:text-body hover:underline underline-offset-2";
  return (
    <div className="flex min-h-dvh flex-col items-center gap-4 bg-mint px-4 py-6 md:justify-center md:gap-6 md:py-12">
      <Link href="/" aria-label="H2 India home" className="rounded-control">
        <Logo title="" height={36} />
      </Link>
      <main className="w-full max-w-140">{children}</main>
      <footer className="type-caption text-secondary">
        © {year} H2 India ·{" "}
        <Link href={AUTH_LINKS.privacy} className={link}>
          Privacy
        </Link>{" "}
        ·{" "}
        <Link href={AUTH_LINKS.terms} className={link}>
          Terms
        </Link>{" "}
        ·{" "}
        <Link href={AUTH_LINKS.help} className={link}>
          Help centre
        </Link>
      </footer>
    </div>
  );
}
