import { getDb } from "@h2india/core";
import { userDetail } from "@h2india/core/admin/users";
import { can } from "@h2india/core/authz";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { Alert, buttonClasses, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, requireOperator } from "@/admin/shell";
import { SuspendCompany, SuspendUser, ViewAs } from "@/admin/users/Controls";
import { Initials } from "@/admin/users/Tabs";
import { actionWords, ago, deviceOf, kindWord, maskMobile, roleWord } from "@/admin/users/words";

// User detail (651:1042), step 11.4: memberships, sign-in security, sessions, account actions and recent activity,
// with Suspend user (653:568) and View as user (657:328). Reset passkeys, Export data, Sign out and Delete account
// aren't on this screen yet: they have no server action (export and erasure run from Compliance).
export const metadata: Metadata = { title: "User · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, actor } = await requireOperator("users.view", `/admin/users/${id}`);
  const d = await userDetail(getDb(), actor, id);
  if (!d) notFound();
  const p = d.person;
  const name = p.name || p.email;
  const first = name.split(/\s+/)[0] ?? name;
  const canEdit = can(actor, "users.edit");
  const isOperator = d.operatorRoles.length > 0;
  const main = d.companies[0];
  const type = kindWord(main?.kind, isOperator);
  const sees = main ? `${main.name}'s ${main.kind === "buyer" ? "buyer" : "supplier"} workspace` : "H2 India";
  const self = p.id === userId;
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <Link href="/admin/users" className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        Users
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Initials name={name} size="lg" />
          <div className="flex flex-col gap-1">
            <h1 className="type-h2">{name}</h1>
            <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
              <StatusBadge status={p.suspendedAt ? "Suspended" : "Active"} tone={p.suspendedAt ? "error" : "success"} />
              <StatusBadge status={type} tone="neutral" />
              {[p.email, p.mobile ? maskMobile(p.mobile) : null, `joined ${formatIstDate(p.createdAt)}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        {!self ? <ViewAs userId={p.id} name={name} sees={sees} label={`View as ${first} (read-only)`} /> : null}
      </div>
      {p.suspendedAt ? (
        <Alert tone="warning" title={`Suspended ${formatIstDateTime(p.suspendedAt)}`}>
          {p.suspendReason}
        </Alert>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Memberships</h2>
            {d.companies.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-default p-3"
              >
                <span className="flex items-start gap-3">
                  <Icon name="building" size={18} className="mt-0.5" />
                  <span>
                    <Link
                      href={`/admin/users/companies/${c.id}`}
                      className="block type-label underline underline-offset-2"
                    >
                      {c.name}
                    </Link>
                    <span className="block type-caption text-secondary">
                      {[
                        roleWord(c.role),
                        `since ${formatIstDate(c.since)}`,
                        c.verification === "Verified" ? `Verified ${c.kind === "buyer" ? "buyer" : "supplier"}` : null,
                        c.city,
                        c.suspendedAt ? "suspended" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge status={roleWord(c.role)} tone="success" />
                  {canEdit ? (
                    <SuspendCompany
                      userId={p.id}
                      organisationId={c.id}
                      name={c.name}
                      suspended={Boolean(c.suspendedAt)}
                    />
                  ) : null}
                </span>
              </div>
            ))}
            {isOperator ? (
              <div className="flex items-center justify-between gap-3 rounded-card border border-default p-3">
                <span className="flex items-start gap-3">
                  <Icon name="shield-check" size={18} className="mt-0.5" />
                  <span>
                    <span className="block type-label">H2 India</span>
                    <span className="block type-caption text-secondary">{d.operatorRoles.join(", ")}</span>
                  </span>
                </span>
                <StatusBadge status="Operator" tone="neutral" />
              </div>
            ) : null}
            {!d.companies.length && !isOperator ? (
              <div className="flex items-center justify-between gap-3 rounded-card border border-default p-3">
                <span className="flex items-start gap-3">
                  <Icon name="user" size={18} className="mt-0.5" />
                  <span className="type-label">Member profile</span>
                </span>
                <StatusBadge status="Member" tone="neutral" />
              </div>
            ) : null}
          </section>
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Sign-in security</h2>
            <ul className="flex flex-col gap-3">
              {d.passkeys.map((k) => (
                <li key={k.createdAt.toISOString()} className="flex items-start gap-3">
                  <Icon name="lock" size={16} className="mt-0.5" />
                  <span>
                    <span className="block type-label">Passkey · {k.name ?? k.deviceType}</span>
                    <span className="block type-caption text-secondary">Added {formatIstDate(k.createdAt)}</span>
                  </span>
                </li>
              ))}
              <li className="flex items-start gap-3">
                <Icon name="mail" size={16} className="mt-0.5" />
                <span>
                  <span className="block type-label">Email code</span>
                  <span className="block type-caption text-secondary">
                    {d.passkeys.length ? "Backup sign-in" : "Signs in with an email code; no passkey yet"} · {p.email}
                  </span>
                </span>
              </li>
            </ul>
          </section>
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Sessions</h2>
            {d.sessions.length ? (
              <ul className="flex flex-col divide-y divide-default">
                {d.sessions.map((s) => (
                  <li key={s.updatedAt.toISOString()} className="py-3">
                    <span className="block type-label">{deviceOf(s.userAgent)}</span>
                    <span className="block type-caption text-secondary">{ago(s.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="type-body-sm text-secondary">Not signed in anywhere.</p>
            )}
          </section>
        </div>
        <aside className="flex flex-col gap-6 self-start">
          {!self ? (
            <section className="flex flex-col rounded-card border border-default bg-page p-5">
              <h2 className="type-h4">Account actions</h2>
              <div className="flex flex-col gap-2 border-t border-default py-3">
                <h3 className="type-label">View as {first}</h3>
                <p className="type-caption text-secondary">
                  See H2 India as {first} does. Read-only. You give a reason, a banner shows the whole time, and
                  it&apos;s logged.
                </p>
                <span>
                  <ViewAs userId={p.id} name={name} sees={sees} label={`View as ${first}`} />
                </span>
              </div>
              {canEdit ? (
                <div className="flex flex-col gap-2 border-t border-default py-3">
                  <h3 className="type-label">{p.suspendedAt ? "Lift suspension" : "Suspend"}</h3>
                  <p className="type-caption text-secondary">
                    {p.suspendedAt
                      ? "They can sign in again straight away. Reason required."
                      : `Stops sign-in until you lift it.${main ? ` ${main.name} keeps working for other team members.` : ""} Reason required.`}
                  </p>
                  <span>
                    <SuspendUser
                      userId={p.id}
                      person={{
                        name,
                        line: [type, main?.name ?? "no organisation", `joined ${formatIstDate(p.createdAt)}`].join(
                          " · ",
                        ),
                      }}
                      suspended={Boolean(p.suspendedAt)}
                    />
                  </span>
                </div>
              ) : null}
            </section>
          ) : null}
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Recent activity</h2>
            {d.activity.length ? (
              <ol className="flex flex-col gap-3">
                {d.activity.slice(0, 5).map((a) => (
                  <li key={`${a.at.toISOString()}${a.action}`}>
                    <span className="block type-mono text-secondary">{formatIstDateTime(a.at)} IST</span>
                    <span className="block type-body-sm">{actionWords(a.action)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="type-body-sm text-secondary">Nothing recorded yet.</p>
            )}
            <Link href={`/admin/users/audit?actor=${p.id}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              Open in audit log
            </Link>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
