import { getDb } from "@h2india/core";
import { accountDetails } from "@h2india/core/account";
import { listNotifications, unreadCount } from "@h2india/core/notify";
import { buttonClasses, Icon, StatusBadge, type IconName } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { getSession } from "@/server/auth";
import { shellFor } from "@/server/workspace";
import { toRows } from "../notifications/rows";
import { DetailsForm } from "./DetailsForm";

// Account (public QC, 16 Nov 2026; rebuilt in founder QC, 17 Nov 2026): what "Account" in the site header and
// "Profile" in the workspace menu open, for every workspace. No Figma frame draws it; it uses the workspace panels.
// People edit their name and job role here (the buyer and supplier profile); email and mobile change only through
// account recovery. Links go only to screens that exist.

export const metadata: Metadata = { title: "Account · H2 Economy", robots: { index: false } };

const WORKSPACE_LABEL = { buyer: "Buyer", supplier: "Supplier", member: "Member", admin: "Admin" } as const;

/** Where each workspace keeps its company settings; members and staff have no company. */
const COMPANY_LINKS = {
  buyer: [
    { href: "/buyer/company", label: "Company profile", icon: "building" },
    { href: "/buyer/company?section=users", label: "Users and roles", icon: "users" },
  ],
  supplier: [
    { href: "/supplier/company", label: "Company details", icon: "building" },
    { href: "/supplier/team", label: "Team and roles", icon: "users" },
  ],
} as const satisfies Record<string, readonly { href: string; label: string; icon: IconName }[]>;

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/account");
  const db = getDb();
  const userId = session.user.id;
  const [shell, unread, items, details] = await Promise.all([
    shellFor(userId),
    unreadCount(db, userId),
    listNotifications(db, userId, { limit: 5 }),
    accountDetails(db, userId),
  ]);
  const area = shell.area;
  const company = area === "buyer" || area === "supplier" ? COMPANY_LINKS[area] : null;
  const staff = area === "admin";

  return (
    <WorkspaceFrame
      area={area}
      groups={shell.groups}
      current="/account"
      user={shell.user}
      home={shell.home}
      bell={{ unread, items: toRows(items) }}
      switchTo={shell.switchTo}
    >
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <header className="flex flex-col gap-4 rounded-card border border-default bg-page p-5 sm:flex-row sm:items-center">
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-pill bg-tint type-h3 text-primary"
          >
            {shell.user.initials}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="type-label-sm text-secondary">Account</p>
            <h1 className="type-h2 break-words text-primary">{shell.user.name}</h1>
            <p className="type-body break-words text-secondary">{shell.email}</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <StatusBadge status={WORKSPACE_LABEL[area]} tone="neutral" />
            {area === "member" || staff ? null : <span className="type-caption text-secondary">{shell.user.role}</span>}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <Panel id="details" title="Your details" lead="The name your team and trading partners see.">
              <DetailsForm name={details?.name ?? ""} jobRole={details?.jobRole ?? null} />
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-default pt-4 md:grid-cols-2">
                <Fact label="Email" value={shell.email} />
                <Fact label="Mobile" value={shell.mobile ?? "Not added"} />
              </dl>
              <p className="type-caption text-secondary">
                To change your email or mobile, use{" "}
                <Link href="/forgot-access" className="text-link underline">
                  account recovery
                </Link>
                : we check both before anything changes.
              </p>
            </Panel>

            <Panel id="security" title="Sign-in and security">
              <p className="type-body text-body">
                {staff
                  ? "You sign in to the back office with your work email and password."
                  : "You sign in with a code sent to your email. Bank changes and approvals ask for a fresh code."}
              </p>
              <div className="flex flex-wrap gap-3">
                {staff ? (
                  <Link href="/sign-in/staff/password" className={buttonClasses({ variant: "outline" })}>
                    Change password
                  </Link>
                ) : null}
                {area === "member" ? (
                  <Link href="/member/security" className={buttonClasses({ variant: "outline" })}>
                    Devices and sessions
                  </Link>
                ) : null}
                {area === "buyer" ? (
                  <Link href="/buyer/company?section=security" className={buttonClasses({ variant: "outline" })}>
                    Who is signed in
                  </Link>
                ) : null}
                <Link href="/forgot-access" className={buttonClasses({ variant: "ghost" })}>
                  Account recovery
                </Link>
              </div>
            </Panel>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <Panel id="shortcuts" title="Settings">
              <ul className="flex flex-col divide-y divide-default">
                <Shortcut href={shell.home} icon="layout-dashboard" label="Go to your workspace" />
                <Shortcut href="/notifications?tab=email" icon="bell" label="Notification settings" />
                {area === "member" ? (
                  <>
                    <Shortcut href="/member/profile" icon="user" label="Public profile" />
                    <Shortcut href="/member/preferences" icon="mail" label="Newsletters and preferences" />
                  </>
                ) : null}
                {company?.map((c) => (
                  <Shortcut key={c.href} href={c.href} icon={c.icon} label={c.label} />
                ))}
              </ul>
            </Panel>
            <a href="/sign-out" className={`${buttonClasses({ variant: "outline" })} w-full`}>
              <Icon name="log-out" size={18} />
              Sign out
            </a>
          </div>
        </div>
      </div>
    </WorkspaceFrame>
  );
}

function Panel({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="type-h4 text-primary">
          {title}
        </h2>
        {lead ? <p className="type-body-sm text-secondary">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="type-caption text-secondary">{label}</dt>
      <dd className="type-body break-words text-primary">{value}</dd>
    </div>
  );
}

function Shortcut({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 py-3 type-label text-primary hover:text-link">
        <Icon name={icon} size={18} className="text-icon-secondary" />
        <span className="flex-1">{label}</span>
        <Icon name="chevron-right" size={16} className="text-icon-secondary" />
      </Link>
    </li>
  );
}
