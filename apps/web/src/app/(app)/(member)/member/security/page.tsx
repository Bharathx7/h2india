import { getDb } from "@h2india/core";
import { accountDetails, deviceLabel, mySessions } from "@h2india/core/account";
import { mobileFieldsShown } from "@h2india/core/admin/system";
import { formatIstDateTime } from "@h2india/core/companies/client";
import { hasPassword } from "@h2india/core/sign-in/passwords";
import { buttonClasses, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ChangePassword } from "@/account/ChangePassword";
import { MemberShell, requireMember } from "@/member/shell";
import { SignOutDevice } from "@/member/SecurityControls";
import { getSession } from "@/server/auth";

// Sign-in and security (founder QC, 17 Nov 2026): the member menu's item led nowhere. How the member signs in, the
// devices signed in to their account (sign out one, or every other), and account recovery. No Figma frame; built from
// the workspace panels. Passkeys were removed (A183); Change password added 19 Nov 2026 (A195).

export const metadata: Metadata = { title: "Sign-in and security · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MemberSecurityPage() {
  const userId = await requireMember("/member/security");
  const session = await getSession();
  if (!session) redirect("/member/sign-in?next=/member/security");
  const db = getDb();
  const [details, sessions, showMobile, passwordSet] = await Promise.all([
    accountDetails(db, userId),
    mySessions(db, userId, session.session.id),
    mobileFieldsShown(db),
    hasPassword(db, userId),
  ]);
  const others = sessions.filter((s) => !s.current).length;

  return (
    <MemberShell userId={userId} current="/member/security">
      <div>
        <h1 className="type-h2">Sign-in and security</h1>
        <p className="type-body-sm text-secondary">How you sign in, and where your account is signed in now.</p>
      </div>

      <Panel id="how" title="How you sign in">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-mint">
            <Icon name="mail" size={20} />
          </span>
          <div className="min-w-0">
            <p className="type-label text-primary">Email and password</p>
            <p className="type-body-sm break-words text-body">
              {details?.email ?? session.user.email}. You can also ask for a code by email on the sign-in page.
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-default pt-4 md:grid-cols-2">
          <div className="flex flex-col gap-0.5">
            <dt className="type-caption text-secondary">Email</dt>
            <dd className="type-body break-words text-primary">{details?.email ?? session.user.email}</dd>
          </div>
          {showMobile ? (
            <div className="flex flex-col gap-0.5">
              <dt className="type-caption text-secondary">Mobile</dt>
              <dd className="type-body text-primary">{details?.mobile ?? "Not added"}</dd>
            </div>
          ) : null}
        </dl>
        <p className="type-caption text-secondary">
          {showMobile ? "Lost access to your email, or changed your mobile?" : "Lost access to your email?"}{" "}
          <Link href="/forgot-access" className="text-link underline">
            Use account recovery
          </Link>
          .
        </p>
      </Panel>

      <section
        aria-label="Password"
        className="flex max-w-3xl flex-col gap-4 rounded-card border border-default bg-page p-5"
      >
        <ChangePassword hasPassword={passwordSet} />
      </section>

      <Panel
        id="devices"
        title="Signed-in devices"
        action={others ? <SignOutDevice sessionId={null} label="Sign out of all other devices" /> : null}
      >
        <ul className="flex flex-col divide-y divide-default">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-subtle">
                <Icon name={s.current ? "check-circle" : "lock"} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 type-label text-primary">
                  {deviceLabel(s.userAgent)}
                  {s.current ? <StatusBadge status="This device" tone="success" /> : null}
                </p>
                <p className="type-caption text-secondary">Last active {formatIstDateTime(s.lastActive)} IST</p>
              </div>
              {s.current ? null : <SignOutDevice sessionId={s.id} label="Sign out" />}
            </li>
          ))}
        </ul>
        {others ? null : <p className="type-body-sm text-secondary">You&apos;re signed in only on this device.</p>}
      </Panel>

      <div>
        <Link href="/account" className={buttonClasses({ variant: "ghost" })}>
          <Icon name="arrow-left" size={16} />
          Back to Account
        </Link>
      </div>
    </MemberShell>
  );
}

function Panel({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex max-w-3xl flex-col gap-4 rounded-card border border-default bg-page p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="type-h4 text-primary">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
