import { parseServerEnv } from "@h2india/config";
import { Logo } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { AUTH_LINKS } from "@/lib/auth-links";
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
    <div className="flex min-h-dvh flex-col items-center gap-4 bg-mint px-4 py-6 md:justify-center md:gap-6 md:py-12">
      <Link href="/" aria-label="H2 Economy home" className="rounded-control">
        <Logo title="" height={36} />
      </Link>
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
