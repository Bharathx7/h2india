import { Alert, ArrowLink, cx, Reveal } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { RetryLink } from "./RetryLink";

// Layout pieces shared by the home sections (377:4917; phones 381:5845): 1200 px content at 1440, 16 px gutters on
// phones; section headers with eyebrow, title, subtitle and an Arrow link.

export const container = "mx-auto w-full max-w-300 px-4 md:px-6 xl:px-0";

export function Section({
  id,
  className,
  inner,
  children,
}: {
  id: string;
  className?: string;
  inner?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cx("relative overflow-hidden", className)}>
      <Reveal className={cx(container, "relative", inner)}>{children}</Reveal>
    </section>
  );
}

export function SectionTitle({
  id,
  eyebrow,
  title,
  sub,
  link,
  size = "h2",
  className,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  sub?: string;
  link?: { label: string; href: string };
  size?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div
      className={cx("flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between md:gap-6", className)}
    >
      <div className="flex flex-col gap-2">
        {eyebrow ? <p className="type-eyebrow text-secondary">{eyebrow}</p> : null}
        <h2 id={`${id}-title`} className={cx(size === "h1" ? "type-h1" : "type-h2", "text-primary")}>
          {title}
        </h2>
        {sub ? <p className="type-body text-body">{sub}</p> : null}
      </div>
      {link ? <HomeArrowLink href={link.href}>{link.label}</HomeArrowLink> : null}
    </div>
  );
}

export function HomeArrowLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ArrowLink asChild className={cx("shrink-0", className)}>
      <Link href={href}>{children}</Link>
    </ArrowLink>
  );
}

/** A module's designed error (381:13116): what failed, that it's on our side, and Try again. */
export function ModuleError({ title, text }: { title: string; text: string }) {
  return (
    <Alert tone="error" title={title} action={<RetryLink />} live data-testid="module-error">
      {text}
    </Alert>
  );
}
