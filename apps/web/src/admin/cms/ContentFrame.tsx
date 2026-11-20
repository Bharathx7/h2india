import { cx, Icon, type IconName } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell } from "@/admin/shell";
import { CONTENT_SECTIONS } from "./sections";

// Content's own side menu (founder, 20 Nov 2026: one simple place to find everything): Home, the sections in plain
// words, then the checking tools. Every content list page renders inside it; editors keep the full width.

/** "home", a section id, "quality" or "calendar". */
export type ContentPlace = string;

const TOOLS: { id: ContentPlace; label: string; icon: IconName; href: string }[] = [
  { id: "quality", label: "Data quality", icon: "activity", href: "/admin/content?tab=quality" },
  { id: "calendar", label: "Publishing calendar", icon: "clock", href: "/admin/content/calendar" },
];

function Item({ href, icon, label, here }: { href: string; icon: IconName; label: string; here: boolean }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={here ? "page" : undefined}
        className={cx(
          "flex h-9 items-center gap-2.5 rounded-input px-3 type-label",
          here ? "bg-mint text-primary" : "text-body hover:bg-subtle",
        )}
      >
        <Icon name={icon} size={16} className={here ? "text-icon-link" : "text-icon-secondary"} />
        {label}
      </Link>
    </li>
  );
}

export function ContentNav({ current }: { current: ContentPlace | undefined }) {
  return (
    <nav aria-label="Content sections" className="flex flex-col gap-3 self-start lg:sticky lg:top-4">
      <ul className="flex flex-col gap-0.5">
        <Item href="/admin/content" icon="home" label="Content home" here={current === "home"} />
      </ul>
      <div className="flex flex-col gap-1">
        <p className="px-3 type-caption text-secondary">Sections</p>
        <ul className="flex flex-col gap-0.5">
          {CONTENT_SECTIONS.map((s) => (
            <Item key={s.id} href={s.href} icon={s.icon} label={s.label} here={current === s.id} />
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-1">
        <p className="px-3 type-caption text-secondary">Checks</p>
        <ul className="flex flex-col gap-0.5">
          {TOOLS.map((t) => (
            <Item key={t.id} href={t.href} icon={t.icon} label={t.label} here={current === t.id} />
          ))}
        </ul>
      </div>
    </nav>
  );
}

/** A content list page: the admin shell, Content's side menu and the page. */
export function ContentFrame({
  userId,
  current,
  children,
}: {
  userId: string;
  current: ContentPlace | undefined;
  children: ReactNode;
}) {
  return (
    <AdminShell userId={userId} current="/admin/content" title="Content">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <ContentNav current={current} />
        <div className="flex min-w-0 flex-col gap-6">{children}</div>
      </div>
    </AdminShell>
  );
}

/** The page head every content list shares: a way back, the title, one line on what it is, and its actions. */
export function ContentPageHead({
  back,
  title,
  intro,
  actions,
}: {
  back?: { href: string; label: string };
  title: string;
  intro?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex max-w-3xl flex-col gap-1">
        {back ? (
          <Link href={back.href} className="inline-flex items-center gap-1 type-label text-secondary">
            <Icon name="arrow-left" size={16} />
            {back.label}
          </Link>
        ) : null}
        <h1 className="type-h2">{title}</h1>
        {intro ? <p className="type-body-sm text-secondary">{intro}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
