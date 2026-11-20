import { parseServerEnv } from "@h2india/config";
import { Logo } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { AUTH_LINKS } from "@/lib/auth-links";
import { AuthAside, RoleTag } from "./AuthAside";
import { absolute } from "@/seo/site";

// Frame shared by the sign-in, join and recovery pages (Figma 524:1772, 526:508): mint page, logo, card, footer.
// Phones: content from the top, 24/16 padding, 16 apart. From 768 up: centred, 48 padding, 24 apart.

export default function AuthLayout({ children }: { children: ReactNode }) {
  const year = new Date().getFullYear();
  const link = "rounded-control hover:text-body hover:underline underline-offset-2";
  // The admin domain serves no public pages (nginx sends them to h2economy.co), so its footer links go there directly
  // as plain links: a prefetch across the two domains is blocked by the browser and logged as an error.
  const admin = parseServerEnv().SITE_ROLE === "admin";
  return (
    // Founder v2 (18 Nov 2026), revised 20 Nov 2026: one design for every sign-in and join page, told apart by role, and
    // fitting one screen. Desktop: the role panel (AuthAside) on the left and the form on soft mint on the right; the
    // screen never scrolls, a long form scrolls inside its own column. Phones: a role badge and the form.
    <div className="grid min-h-dvh grid-cols-1 lg:h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:overflow-hidden">
      <AuthAside />
      <div className="relative isolate flex min-h-dvh flex-col items-center gap-3 overflow-x-hidden bg-mint px-4 py-5 md:justify-center md:gap-4 md:py-6 lg:h-dvh lg:overflow-y-auto">
        <div aria-hidden="true" className="depth-accent-glow absolute -top-60 -right-40 -z-10 size-160" />
        <div aria-hidden="true" className="depth-accent-glow absolute -bottom-60 -left-40 -z-10 size-160" />
        <Link href="/" aria-label="H2 Economy home" className="rounded-control">
          <Logo title="" height={30} />
        </Link>
        <RoleTag />
        <main className="w-full max-w-140">{children}</main>
        <footer className="type-caption text-secondary">
          © {year} H2 Economy ·{" "}
          <FooterLink admin={admin} href={AUTH_LINKS.privacy} className={link}>
            Privacy
          </FooterLink>{" "}
          ·{" "}
          <FooterLink admin={admin} href={AUTH_LINKS.terms} className={link}>
            Terms
          </FooterLink>{" "}
          ·{" "}
          <FooterLink admin={admin} href={AUTH_LINKS.help} className={link}>
            Help centre
          </FooterLink>
        </footer>
      </div>
    </div>
  );
}

/** A footer link: the app's own link, or a plain link to the public site from the admin domain. */
function FooterLink({
  admin,
  href,
  className,
  children,
}: {
  admin: boolean;
  href: string;
  className: string;
  children: ReactNode;
}) {
  return admin ? (
    <a href={absolute(href)} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
