import { PASSWORD_PAGES } from "@h2india/core/sign-in";
import { Icon, TextLink, type IconName } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AUTH_LINKS } from "@/lib/auth-links";
import { AuthCard } from "../AuthCard";

// Forgot access hub (Figma 528:9; 390: 528:766), step 3.5. "I lost my passkey or device" was removed with passkeys
// (17 Nov 2026, A183); staff who forget their password use Set or forgot your password on the staff sign-in. Founder,
// 19 Nov 2026 (A195): everyone signs in with a password, so the hub offers Forgot password; "I changed my mobile
// number" is gone with the mobile number (/forgot-access/mobile returns here).
export const metadata: Metadata = { title: "Get back into your account · H2 Economy", robots: { index: false } };

const PATHS: { href: string; icon: IconName; title: string; text: string }[] = [
  {
    href: PASSWORD_PAGES.forgot,
    icon: "lock",
    title: "Forgot password",
    text: "We'll email you a link to choose a new one.",
  },
  {
    href: "/forgot-access/email",
    icon: "mail",
    title: "Can't reach your email? Contact support",
    text: "Your company admin can confirm it's you, or send us a support request.",
  },
];

export default function ForgotAccessHub() {
  return (
    <AuthCard>
      <h1 className="type-h2 text-primary">Get back into your account</h1>
      <p className="type-body text-body">
        Tell us what&apos;s changed and we&apos;ll take you through the right steps.
      </p>
      <ul className="flex flex-col gap-5">
        {PATHS.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="flex items-center gap-4 rounded-card border border-default p-4 transition-colors duration-(--motion-duration-fast) ease-standard hover:border-hover"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-card bg-mint text-primary">
                <Icon name={p.icon} size={24} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="type-label text-primary">{p.title}</span>
                <span className="type-body-sm text-body">{p.text}</span>
              </span>
              <Icon name="chevron-right" size={20} className="text-primary" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="flex items-center justify-center gap-1 type-body-sm text-body">
        Still stuck?
        <TextLink asChild showIcon={false}>
          <Link href={AUTH_LINKS.contactSupport}>Contact support</Link>
        </TextLink>
      </p>
    </AuthCard>
  );
}
