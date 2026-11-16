import { getDb } from "@h2india/core";
import { listNotifications, unreadCount } from "@h2india/core/notify";
import { buttonClasses } from "@h2india/ui";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { getSession } from "@/server/auth";
import { shellFor } from "@/server/workspace";
import { toRows } from "../notifications/rows";

// Account (public QC, 16 Nov 2026): the page "Account" in the site header and "Profile" in the workspace menu open.
// There is no Figma frame for it; it is built from the workspace shell and the panels other workspace pages use, and
// only links to screens that already exist (profile and preferences for members, notifications, company, recovery).

export const metadata: Metadata = { title: "Account · H2 Economy", robots: { index: false } };

const WORKSPACE_LABEL = { buyer: "Buyer", supplier: "Supplier", member: "Member", admin: "Admin" } as const;

/** Where each workspace keeps its company settings; members have no company. */
const COMPANY_LINK = {
  buyer: { href: "/buyer/company", label: "Company settings" },
  supplier: { href: "/supplier/team", label: "Team and roles" },
} as const;

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/account");
  const db = getDb();
  const userId = session.user.id;
  const [shell, unread, items] = await Promise.all([
    shellFor(userId),
    unreadCount(db, userId),
    listNotifications(db, userId, { limit: 5 }),
  ]);
  const area = shell.area;
  const company = area === "buyer" || area === "supplier" ? COMPANY_LINK[area] : null;

  return (
    <WorkspaceFrame
      area={area}
      groups={shell.groups}
      current="/account"
      user={shell.user}
      welcome={shell.welcome}
      home={shell.home}
      bell={{ unread, items: toRows(items) }}
    >
      <div className="flex max-w-180 flex-col gap-6">
        <h1 className="type-h2 text-primary">Account</h1>

        <Panel id="details" title="Your details">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
            <Fact label="Name" value={shell.user.name} />
            <Fact label="Email" value={shell.email} />
            <Fact label="Mobile" value={shell.mobile ?? "Not added"} />
            <Fact label="Workspace" value={`${WORKSPACE_LABEL[area]} · ${shell.user.role}`} />
          </dl>
          <div className="flex flex-wrap gap-3">
            {area === "member" ? (
              <a href="/member/profile" className={buttonClasses({ variant: "outline" })}>
                Edit your profile
              </a>
            ) : null}
            <a href={shell.home} className={buttonClasses({ variant: area === "member" ? "ghost" : "outline" })}>
              Go to your workspace
            </a>
          </div>
        </Panel>

        <Panel id="notifications" title="Notifications">
          <p className="type-body text-body">Choose which messages you get by email, WhatsApp and in the app.</p>
          <div className="flex flex-wrap gap-3">
            <a href="/notifications?tab=email" className={buttonClasses({ variant: "outline" })}>
              Notification settings
            </a>
            {area === "member" ? (
              <a href="/member/preferences" className={buttonClasses({ variant: "ghost" })}>
                Preferences
              </a>
            ) : null}
          </div>
        </Panel>

        {company ? (
          <Panel id="company" title="Your company">
            <p className="type-body text-body">{shell.user.role}</p>
            <div>
              <a href={company.href} className={buttonClasses({ variant: "outline" })}>
                {company.label}
              </a>
            </div>
          </Panel>
        ) : null}

        <Panel id="security" title="Sign-in and security">
          <p className="type-body text-body">
            You sign in with a passkey or a code sent to your email. If you lost your passkey, your email or your
            mobile, you can get back in through account recovery.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/forgot-access" className={buttonClasses({ variant: "outline" })}>
              Account recovery
            </a>
            <a href="/sign-out" className={buttonClasses({ variant: "ghost" })}>
              Sign out
            </a>
          </div>
        </Panel>
      </div>
    </WorkspaceFrame>
  );
}

function Panel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
      <h2 id={id} className="type-h4 text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="type-caption text-secondary">{label}</dt>
      <dd className="type-body text-primary break-words">{value}</dd>
    </div>
  );
}
