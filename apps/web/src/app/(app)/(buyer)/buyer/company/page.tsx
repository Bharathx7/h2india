import { getDb, Money } from "@h2india/core";
import { mobileFieldsShown } from "@h2india/core/admin/system";
import { scopeFor } from "@h2india/core/authz";
import { companySessions, companySettings, delegationsOf } from "@h2india/core/buyer";
import { teamView } from "@h2india/core/supplier";
import { formatIstDayMonth } from "@h2india/core/time";
import { cx, Icon, StatusBadge, type IconName } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Delegation,
  EndDelegation,
  GstinCard,
  LimitDialog,
  ProfileForm,
  RemoveSite,
  RulesForm,
  SignOut,
  SiteDialog,
} from "@/buyer/Settings";
import { BuyerWorkspace, requireBuyer } from "@/buyer/shell";
import { TeamPanel } from "@/team/TeamPanel";

// Company settings (step 9.1): Company profile 574:8, GSTINs 574:638, Delivery sites 575:331, Users and roles 575:696,
// Approval rules 576:300, Security 576:662; Notifications (577:288) are the person's own choices on /notifications.
export const metadata: Metadata = { title: "Company settings · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const SECTIONS: { key: string; label: string; icon: IconName }[] = [
  { key: "profile", label: "Company profile", icon: "building" },
  { key: "gstins", label: "GSTIN", icon: "file-text" },
  { key: "sites", label: "Delivery sites", icon: "map-pin" },
  { key: "users", label: "Team", icon: "users" },
  { key: "rules", label: "Approval rules", icon: "check" },
  { key: "security", label: "Security", icon: "lock" },
];

const initials = (n: string) =>
  n
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
const rupees = (p: bigint | null) => (p === null ? "" : Money.format(p, { symbol: false }).replace(/\.00$/, ""));
const masked = (m: string) => {
  const d = m.replace(/\D/g, "");
  return d.length >= 4 ? `+91 ••••• ${d.slice(-5)}` : m;
};
const device = (ua: string | null) => {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "Browser";
  const os = /iPhone|iPad/.test(ua)
    ? "iPhone"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS/.test(ua)
          ? "Mac"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
};

function Heading({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="type-h3">{title}</h2>
        <p className="type-body-sm text-secondary">{detail}</p>
      </div>
      {action}
    </div>
  );
}

export default async function CompanySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; q?: string; page?: string; perPage?: string }>;
}) {
  const sp = await searchParams;
  const asked = SECTIONS.find((s) => s.key === sp.section)?.key ?? "profile";
  const page = await requireBuyer(`/buyer/company?section=${asked}`);
  const b = page.buyer;
  const db = getDb();
  const scope = scopeFor(page.actor);
  // A199 (founder, 21 Nov 2026): approval exists only once an admin gives someone custom access. Until then the
  // Approval rules tab is hidden and every order goes straight to the supplier.
  const team = await teamView(db, scope, b.organisationId);
  const split = team.members.some((m) => !m.admin);
  const tabs = SECTIONS.filter((x) => x.key !== "rules" || split);
  const section = tabs.some((x) => x.key === asked) ? asked : "profile";
  const data = await companySettings(db, scope, b.organisationId);
  if (!data) notFound();
  const canManage = b.seat.permissions.has("company.manage");
  const canTeam = b.seat.permissions.has("team.manage");
  const role = b.seat.role;
  // One GSTIN per company (A189): every delivery site bills to it.
  const companyGstinRow = data.gstins[0];
  const companyGstinLabel = companyGstinRow
    ? `${companyGstinRow.gstin}${companyGstinRow.place ? ` · ${companyGstinRow.place}` : ""}`
    : null;

  let body: React.ReactNode;
  if (section === "profile") {
    body = (
      <>
        <Heading title="Company profile" detail="How your company appears to suppliers on RFQs and orders." />
        <ProfileForm
          canEdit={canManage}
          start={{
            legalName: data.org.legalName,
            tradeName: data.profile?.tradeName ?? data.org.legalName,
            type: data.profile?.types[0] ?? "",
            size: data.profile?.employees ?? "",
            office: data.org.registeredAddress ?? "",
            about: data.profile?.summary ?? "",
          }}
        />
      </>
    );
  } else if (section === "gstins") {
    // One GSTIN per company (founder QC, 17 Nov 2026, A189).
    const g = data.gstins[0];
    body = (
      <>
        <Heading
          title="GSTIN"
          detail="Your company's GSTIN. Quotes, orders and invoices use it, for every delivery site."
        />
        <GstinCard
          canEdit={canManage}
          current={
            g
              ? {
                  gstin: g.gstin,
                  place: g.place,
                  status: g.portalStatus,
                  checkedOn: g.checkedAt ? formatIstDayMonth(g.checkedAt) : null,
                }
              : null
          }
        />
      </>
    );
  } else if (section === "sites") {
    const showMobile = await mobileFieldsShown(db);
    body = (
      <>
        <Heading
          title="Delivery sites"
          detail={
            showMobile
              ? "Where suppliers deliver. Receiving contacts get the delivery code by SMS and confirm what arrived."
              : "Where suppliers deliver. Receiving contacts confirm what arrived."
          }
          action={canManage ? <SiteDialog label="Add a delivery site" showMobile={showMobile} /> : undefined}
        />
        {data.sites.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-card border border-default bg-page p-5">
            <h3 className="type-h4">No delivery sites yet</h3>
            <p className="type-body-sm text-body">
              Add the plants and yards suppliers deliver to. They fill in RFQs and orders for you.
            </p>
          </div>
        ) : null}
        {data.sites.map((s) => (
          <section key={s.id} className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 type-h4">
                <Icon name="map-pin" size={18} />
                {s.name}
                {s.isDefault ? <StatusBadge status="Default site" tone="neutral" /> : null}
              </h3>
              {canManage ? (
                <span className="flex items-center gap-2">
                  <SiteDialog
                    label="Edit"
                    showMobile={showMobile}
                    start={{
                      id: s.id,
                      name: s.name,
                      address: s.address,
                      city: s.city ?? "",
                      state: s.state ?? "",
                      pincode: s.pincode ?? "",
                      hours: s.hours ?? "",
                      contacts: s.contacts.length ? s.contacts : [{ name: "", role: "", mobile: "" }],
                      isDefault: s.isDefault,
                    }}
                  />
                  {!s.isDefault ? <RemoveSite id={s.id} name={s.name} /> : null}
                </span>
              ) : null}
            </div>
            <dl className="grid grid-cols-1 gap-2 md:grid-cols-[160px_minmax(0,1fr)]">
              <dt className="type-body-sm text-secondary">Address</dt>
              <dd className="type-body-sm">{[s.address, s.city, s.state, s.pincode].filter(Boolean).join(", ")}</dd>
              <dt className="type-body-sm text-secondary">Bills to GSTIN</dt>
              <dd className="type-body-sm">{companyGstinLabel ?? "Add your company GSTIN first"}</dd>
              <dt className="type-body-sm text-secondary">Receiving hours</dt>
              <dd className="type-body-sm">{s.hours || "—"}</dd>
            </dl>
            <h4 className="type-label-sm text-secondary">Receiving contacts</h4>
            {s.contacts.length ? (
              <ul className="flex flex-col gap-2">
                {s.contacts.map((c) => (
                  <li
                    key={`${c.name}${c.mobile}`}
                    className="flex items-center gap-3 rounded-input bg-subtle px-3 py-2"
                  >
                    <span className="flex size-8 items-center justify-center rounded-pill bg-page type-label-sm">
                      {initials(c.name)}
                    </span>
                    <span>
                      <span className="block type-label">{c.name}</span>
                      <span className="block type-caption text-secondary">
                        {[c.role, showMobile ? masked(c.mobile) : null].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="type-body-sm text-secondary">No receiving contacts yet.</p>
            )}
          </section>
        ))}
      </>
    );
  } else if (section === "users") {
    // Founder QC (17 Nov 2026): the same Team panel as suppliers (full or custom access per person, edit, remove),
    // plus an order limit for people with custom access, which only buyers have (A199: admins have none).
    const limited = team.members.filter((m) => !m.admin);
    const limitText = (p: bigint | null) =>
      p === null ? "No limit set" : `Up to ${Money.format(p).replace(/\.00$/, "")}`;
    body = (
      <>
        <Heading
          title="Team"
          detail="Everyone has full access and needs no approval, unless you choose custom access for them."
        />
        <TeamPanel
          view={team}
          company={b.legalName}
          selfId={page.userId}
          manage={canTeam}
          sp={sp}
          basePath="/buyer/company"
          keep={{ section: "users" }}
        />
        {limited.length ? (
          <section
            aria-labelledby="limits"
            className="flex flex-col gap-3 rounded-card border border-default bg-page p-5"
          >
            <div>
              <h3 id="limits" className="type-h4">
                Order limits
              </h3>
              <p className="type-caption text-secondary">
                Only people with custom access have limits. Their orders above it wait for an admin, or someone you
                allow to approve orders. Set thresholds and second approvers in{" "}
                <Link href="/buyer/company?section=rules" className="underline">
                  Approval rules
                </Link>
                .
              </p>
            </div>
            <ul className="flex flex-col divide-y divide-default">
              {limited.map((x) => (
                <li key={x.userId} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block type-label">{x.name || x.email}</span>
                    <span className="block type-caption text-secondary">{limitText(x.orderLimitPaise)}</span>
                  </span>
                  {canTeam ? (
                    <LimitDialog
                      userId={x.userId}
                      name={x.name || x.email}
                      role={x.role}
                      limit={rupees(x.orderLimitPaise)}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </>
    );
  } else if (section === "rules") {
    const delegations = await delegationsOf(db, scope, b.organisationId);
    const accessOf = (m: (typeof team.members)[number]) => (m.admin ? "Full access" : "Custom access");
    const people = team.members.map((m) => ({ id: m.userId, label: `${m.name || m.email} · ${accessOf(m)}` }));
    const approvers = team.members
      .filter((m) => m.admin || m.access.includes("order.approve"))
      .map((m) => ({ id: m.userId, label: `${m.name || m.email} · ${accessOf(m)}` }));
    const st = data.settings;
    body = (
      <>
        <Heading
          title="Approval rules"
          detail="Which orders from people with custom access need approval, and who approves them. Orders by people with full access never need approval."
        />
        <RulesForm
          canEdit={canManage}
          approvers={approvers}
          start={{
            above: rupees(st?.approvalAbovePaise ?? null),
            approverId: st?.approverId ?? "",
            second: st?.secondApproval ?? false,
            secondAbove: rupees(st?.secondAbovePaise ?? null),
            secondApproverId: st?.secondApproverId ?? "",
          }}
        />
        <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
          <h3 className="type-h4">Delegation</h3>
          <p className="type-body-sm text-secondary">Hand approvals to someone else while an approver is away.</p>
          {delegations.length ? (
            <ul className="flex flex-col gap-2">
              {delegations.map(({ d, from, to }) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-input bg-subtle px-3 py-2"
                >
                  <span className="type-body-sm">
                    {from} → {to} · {formatIstDayMonth(d.startsOn)} to {formatIstDayMonth(d.endsOn)}
                  </span>
                  {canManage ? <EndDelegation id={d.id} /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-body-sm text-body">No delegations.</p>
          )}
          {canManage && people.length > 1 ? <Delegation people={people} /> : null}
        </section>
      </>
    );
  } else {
    const sessions = canManage ? await companySessions(db, page.actor, b.organisationId) : [];
    body = (
      <>
        <Heading title="Security" detail={`Sign-in rules for everyone at ${b.legalName}, and who is signed in now.`} />
        <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
          <h3 className="type-h4">How people sign in</h3>
          <p className="type-body-sm text-secondary">
            Everyone signs in with a code sent to their work email. Approvers and admins also confirm approvals and bank
            changes with a fresh code.
          </p>
        </section>
        {canManage ? (
          <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
            <h3 className="type-h4">Signed in now</h3>
            <p className="type-body-sm text-secondary">
              Sign someone out if a device is lost or they&apos;ve left the company.
            </p>
            <ul className="flex flex-col divide-y divide-default">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <span className="flex size-8 items-center justify-center rounded-pill bg-mint type-label-sm">
                    {initials(s.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block type-label">{s.name}</span>
                    <span className="block type-caption text-secondary">
                      {device(s.userAgent)} · {formatIstDayMonth(s.updatedAt)}
                    </span>
                  </span>
                  {s.userId === page.userId ? (
                    <StatusBadge status="You" tone="success" />
                  ) : (
                    <SignOut id={s.id} name={s.name} />
                  )}
                </li>
              ))}
            </ul>
            {sessions.some((s) => s.userId !== page.userId) ? <SignOut id={null} /> : null}
          </section>
        ) : null}
      </>
    );
  }

  return (
    <BuyerWorkspace page={page} current="/buyer/company">
      <div>
        <h1 className="type-h2">Company settings</h1>
        <p className="type-body-sm text-secondary">
          {b.legalName} · you have {role === "Admin" ? "full" : "custom"} access
        </p>
      </div>
      {/* Founder QC (17 Nov 2026): the sections as tabs across the top, the section below at full width. */}
      <nav aria-label="Company settings" className="flex gap-6 overflow-x-auto border-b border-default">
        {tabs.map((x) => (
          <Link
            key={x.key}
            href={`/buyer/company?section=${x.key}`}
            aria-current={x.key === section ? "page" : undefined}
            className={cx(
              "-mb-px inline-flex items-center gap-2 border-b-2 py-3 type-label whitespace-nowrap",
              x.key === section ? "border-inverse text-primary" : "border-transparent text-secondary",
            )}
          >
            <Icon name={x.icon} size={16} />
            {x.label}
          </Link>
        ))}
        <Link
          href="/notifications?tab=email"
          className="-mb-px inline-flex items-center gap-2 border-b-2 border-transparent py-3 type-label whitespace-nowrap text-secondary"
        >
          <Icon name="bell" size={16} />
          Notifications
        </Link>
      </nav>
      <div className="flex min-w-0 flex-col gap-4">{body}</div>
    </BuyerWorkspace>
  );
}
