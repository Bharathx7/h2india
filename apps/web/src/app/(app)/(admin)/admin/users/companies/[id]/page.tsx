import { getDb } from "@h2india/core";
import { companyDetail } from "@h2india/core/admin/companies";
import { can } from "@h2india/core/authz";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { Alert, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell, requireOperator } from "@/admin/shell";
import { ChangeGstin } from "@/admin/users/ChangeGstin";
import { actionWords, kindWord, roleWord } from "@/admin/users/words";

// Company detail (admin QC, 16 Nov 2026): everything about one buyer or supplier company in one place. No Figma frame
// (F1 keeps Organisations inside Users): built from the User detail panels (651:1042). Read-only; the actions stay on
// their own screens (Verification, Queues, User detail).
export const metadata: Metadata = { title: "Company · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const n = (rows: { n: number }[]) => rows.reduce((a, r) => a + r.n, 0);
const counts = (rows: { status: string; n: number }[]) =>
  rows.length ? rows.map((r) => `${String(r.n)} ${r.status.toLowerCase()}`).join(" · ") : "None";

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ added?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("users.view", `/admin/users/companies/${id}`);
  const d = await companyDetail(getDb(), actor, id);
  if (!d) notFound();
  const { org } = d;
  const supplier = org.kind !== "buyer";
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <Link href="/admin/users" className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        Users
      </Link>
      {sp.added === "1" ? (
        <Alert tone="success" title={`${org.legalName} was added`} live>
          The owner has been invited by email. Verify the company and grant badges from Verification when the evidence
          is in.
        </Alert>
      ) : null}
      <div className="flex flex-col gap-2">
        <h1 className="type-h2">{d.profile?.tradeName ?? org.legalName}</h1>
        <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
          <StatusBadge status={kindWord(org.kind)} tone="neutral" />
          <StatusBadge status={org.verification} tone={org.verification === "Verified" ? "success" : "neutral"} />
          {org.suspendedAt ? <StatusBadge status="Suspended" tone="error" /> : null}
          {org.legalName} · on H2 Economy since {formatIstDate(org.createdAt)}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {d.profile?.slug ? (
          <Link href={`/directory/companies/${d.profile.slug}`} className="type-label text-link underline">
            Public profile
          </Link>
        ) : null}
        {supplier && can(actor, "verification.view") ? (
          <Link href={`/admin/verification?org=${org.id}`} className="type-label text-link underline">
            Verification desk
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel id="details" title="Details">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Fact label="Legal name" value={org.legalName} />
            <Fact label="PAN" value={org.pan ?? "—"} />
            <Fact label="State" value={org.state ?? "—"} />
            <Fact label="City" value={d.profile?.city ?? "—"} />
            <Fact label="Website" value={d.profile?.website ?? "—"} />
            <Fact label="Profile" value={d.profile?.claimStatus ?? "No public profile"} />
            {org.registeredAddress ? <Fact label="Registered address" value={org.registeredAddress} /> : null}
            {org.suspendReason ? <Fact label="Suspension reason" value={org.suspendReason} /> : null}
          </dl>
        </Panel>

        {/* One GSTIN per company (founder QC, 17 Nov 2026, A189); operators with verification.edit can change it. */}
        <Panel
          id="gstins"
          title="GSTIN"
          action={
            actor.operator.has("verification.edit") ? (
              <ChangeGstin organisationId={id} current={d.gstins[0]?.gstin ?? null} />
            ) : null
          }
        >
          {d.gstins.length ? (
            <ul className="flex flex-col divide-y divide-default">
              {d.gstins.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="block type-mono">{g.gstin}</span>
                    <span className="block type-caption text-secondary">{g.place ?? "—"}</span>
                  </span>
                  <span className="flex gap-2">
                    <StatusBadge
                      status={g.portalStatus === "Active" ? "Verified" : g.portalStatus}
                      tone={
                        g.portalStatus === "Active" ? "success" : g.portalStatus === "Pending" ? "progress" : "error"
                      }
                    />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-body-sm text-secondary">No GSTIN.</p>
          )}
        </Panel>

        <Panel id="team" title={`Team (${String(d.team.length)})`}>
          {d.team.length ? (
            <ul className="flex flex-col divide-y divide-default">
              {d.team.map((p) => (
                <li key={p.userId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <Link href={`/admin/users/${p.userId}`} className="block type-label underline underline-offset-2">
                      {p.name || p.email}
                    </Link>
                    <span className="block truncate type-caption text-secondary">
                      {p.email} · since {formatIstDate(p.since)}
                    </span>
                  </span>
                  <span className="flex gap-2">
                    <StatusBadge status={roleWord(p.role)} tone="neutral" />
                    {p.suspendedAt ? <StatusBadge status="Suspended" tone="error" /> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-body-sm text-secondary">No one has joined yet.</p>
          )}
          {d.invitations.length ? (
            <div className="flex flex-col gap-1 border-t border-default pt-3">
              <p className="type-label">Invited, not accepted yet</p>
              {d.invitations.map((i) => (
                <p key={i.id} className="type-caption text-secondary">
                  {i.email} · {i.role} · expires {formatIstDate(i.expiresAt)}
                </p>
              ))}
            </div>
          ) : null}
        </Panel>

        {supplier ? (
          <Panel id="listings" title={`Listings (${String(n(d.listings))})`}>
            <p className="type-body-sm text-body">{counts(d.listings)}</p>
            {d.recentListings.length ? (
              <ul className="flex flex-col divide-y divide-default">
                {d.recentListings.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="type-body-sm">{p.name}</span>
                    <StatusBadge status={p.status} tone={p.status === "Live" ? "success" : "neutral"} />
                  </li>
                ))}
              </ul>
            ) : null}
          </Panel>
        ) : null}

        {supplier ? (
          <Panel id="verification" title="Verification and badges">
            <p className="type-body-sm text-body">
              Latest review:{" "}
              {d.review ? `${d.review.status} · ${formatIstDate(d.review.submittedAt)}` : "not submitted"}
            </p>
            {d.badges.length ? (
              <ul className="flex flex-wrap gap-2">
                {d.badges.map((b) => (
                  <li key={b.kind}>
                    <StatusBadge
                      status={`${b.kind} · ${b.status}`}
                      tone={b.status === "Active" ? "success" : "neutral"}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="type-body-sm text-secondary">No badges.</p>
            )}
          </Panel>
        ) : null}

        <Panel id="rfqs" title={supplier ? "Quotes" : "RFQs"}>
          <p className="type-body-sm text-body">
            {supplier ? `Quotes: ${counts(d.quotes)}` : `RFQs: ${counts(d.rfqs)}`}
          </p>
          {org.kind === "both" ? <p className="type-body-sm text-body">RFQs: {counts(d.rfqs)}</p> : null}
        </Panel>

        <Panel id="activity" title="Recent activity" wide>
          {d.activity.length ? (
            <ul className="flex flex-col divide-y divide-default">
              {d.activity.map((a, i) => (
                <li key={`${a.at.toISOString()}-${String(i)}`} className="flex flex-wrap justify-between gap-2 py-2">
                  <span className="type-body-sm">{actionWords(a.action)}</span>
                  <span className="type-caption text-secondary">{formatIstDateTime(a.at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-body-sm text-secondary">Nothing recorded yet.</p>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}

function Panel({
  id,
  title,
  wide,
  action,
  children,
}: {
  id: string;
  title: string;
  wide?: boolean;
  /** A button beside the title (Change GSTIN). */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`flex min-w-0 flex-col gap-3 rounded-card border border-default bg-page p-5 ${wide ? "lg:col-span-2" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="type-h4">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="type-caption text-secondary">{label}</dt>
      <dd className="type-body-sm break-words text-primary">{value}</dd>
    </div>
  );
}
