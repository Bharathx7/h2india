import { getDb, Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { companySessions, companySettings, delegationsOf } from "@h2india/core/buyer";
import { companyRoles, teamView } from "@h2india/core/supplier";
import { formatIstDayMonth } from "@h2india/core/time";
import { Alert, cx, Icon, StatusBadge, type IconName } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AddGstin,
  Delegation,
  EndDelegation,
  GstinActions,
  LimitDialog,
  PasskeyPolicy,
  ProfileForm,
  RemoveSite,
  RulesForm,
  SignOut,
  SiteDialog,
} from "@/buyer/Settings";
import { BuyerWorkspace, requireBuyer } from "@/buyer/shell";
import { InviteMember, JoinRequest, MemberMenu, RevokeInvite } from "@/supplier/TeamControls";

// Company settings (step 9.1): Company profile 574:8, GSTINs 574:638, Delivery sites 575:331, Users and roles 575:696,
// Approval rules 576:300, Security 576:662; Notifications (577:288) are the person's own choices on /notifications.
export const metadata: Metadata = { title: "Company settings · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

const SECTIONS: { key: string; label: string; icon: IconName }[] = [
  { key: "profile", label: "Company profile", icon: "building" },
  { key: "gstins", label: "GSTINs", icon: "file-text" },
  { key: "sites", label: "Delivery sites", icon: "map-pin" },
  { key: "users", label: "Users and roles", icon: "users" },
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

export default async function CompanySettingsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const sp = await searchParams;
  const section = SECTIONS.find((s) => s.key === sp.section)?.key ?? "profile";
  const page = await requireBuyer(`/buyer/company?section=${section}`);
  const b = page.buyer;
  const db = getDb();
  const scope = scopeFor(page.actor);
  const data = await companySettings(db, scope, b.organisationId);
  if (!data) notFound();
  const canManage = b.seat.permissions.has("company.manage");
  const canTeam = b.seat.permissions.has("team.manage");
  const role = b.seat.role;
  const gstinLabel = new Map(data.gstins.map((g) => [g.id, `${g.gstin}${g.place ? ` · ${g.place}` : ""}`]));
  const defaultGstin = data.gstins.find((g) => g.isDefault);

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
    body = (
      <>
        <Heading
          title="GSTINs"
          detail="Add each state registration you buy under. Orders are billed to the default GSTIN unless you choose another."
          action={canManage ? <AddGstin /> : undefined}
        />
        <div
          tabIndex={0}
          role="region"
          aria-label="GSTINs"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  GSTIN
                </th>
                <th scope="col" className="px-2 py-3">
                  State and place of business
                </th>
                <th scope="col" className="px-2 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.gstins.map((g) => (
                <tr key={g.id} className="border-t border-default">
                  <td className="px-4 py-3">
                    <span className="block type-mono">{g.gstin}</span>
                    {g.isDefault ? <StatusBadge status="Default" tone="neutral" /> : null}
                  </td>
                  <td className="px-2 py-3 type-body-sm">{g.place ?? "—"}</td>
                  <td className="px-2 py-3">
                    {g.portalStatus === "Active" ? (
                      <StatusBadge
                        status={g.checkedAt ? `Verified ${formatIstDayMonth(g.checkedAt)}` : "Verified"}
                        tone="success"
                      />
                    ) : g.portalStatus === "Pending" ? (
                      <StatusBadge status="Checking with GST records" tone="progress" />
                    ) : (
                      <StatusBadge status={g.portalStatus} tone="error" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <GstinActions
                        id={g.id}
                        gstin={g.gstin}
                        isDefault={g.isDefault}
                        active={g.portalStatus === "Active"}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Alert tone="info" title="Verification runs in the background">
          You can request quotes while we check a new GSTIN. Orders can be billed to it once it&apos;s verified.
        </Alert>
      </>
    );
  } else if (section === "sites") {
    const gstins = data.gstins.map((g) => ({ id: g.id, label: gstinLabel.get(g.id) ?? g.gstin }));
    body = (
      <>
        <Heading
          title="Delivery sites"
          detail="Where suppliers deliver. Receiving contacts get the delivery code by SMS and confirm what arrived."
          action={canManage ? <SiteDialog gstins={gstins} label="Add a delivery site" /> : undefined}
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
                    gstins={gstins}
                    label="Edit"
                    start={{
                      id: s.id,
                      name: s.name,
                      address: s.address,
                      city: s.city ?? "",
                      state: s.state ?? "",
                      pincode: s.pincode ?? "",
                      gstinId: s.gstinId ?? "",
                      hours: s.hours ?? "",
                      contacts: s.contacts.length ? s.contacts : [{ name: "", role: "", mobile: "" }],
                      isDefault: s.isDefault,
                    }}
                  />
                  {!s.isDefault ? <RemoveSite id={s.id} name={s.name} /> : null}
                </span>
              ) : null}
            </div>
            <dl className="grid gap-2 md:grid-cols-[160px_minmax(0,1fr)]">
              <dt className="type-body-sm text-secondary">Address</dt>
              <dd className="type-body-sm">{[s.address, s.city, s.state, s.pincode].filter(Boolean).join(", ")}</dd>
              <dt className="type-body-sm text-secondary">Bills to GSTIN</dt>
              <dd className="type-body-sm">{s.gstinId ? gstinLabel.get(s.gstinId) : (defaultGstin?.gstin ?? "—")}</dd>
              <dt className="type-body-sm text-secondary">Receiving hours</dt>
              <dd className="type-body-sm">{s.hours || "—"}</dd>
            </dl>
            <h4 className="type-eyebrow text-secondary">Receiving contacts</h4>
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
                        {[c.role, masked(c.mobile)].filter(Boolean).join(" · ")}
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
    const [team, roles] = await Promise.all([
      teamView(db, scope, b.organisationId),
      companyRoles(db, b.organisationId),
    ]);
    const today = new Date().toDateString();
    const active = (d: Date | null) =>
      !d ? "—" : new Date(d).toDateString() === today ? "Today" : formatIstDayMonth(new Date(d));
    const limitText = (r: string, p: bigint | null) =>
      p === null ? "—" : `${r === "Approver" ? "Approves" : "Orders"} up to ${Money.format(p).replace(/\.00$/, "")}`;
    body = (
      <>
        <Heading
          title="Users and roles"
          detail="Who can request quotes, approve orders and manage company settings."
          action={canTeam ? <InviteMember roles={roles} /> : undefined}
        />
        {team.requests.length && canTeam ? (
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h3 className="type-h4">
              {team.requests.length} {team.requests.length === 1 ? "person" : "people"} asked to join {b.legalName}
            </h3>
            {team.requests.map((q) => (
              <div key={q.id} className="flex flex-wrap items-center gap-3 border-t border-default pt-3">
                <span className="flex size-10 items-center justify-center rounded-pill bg-mint type-label">
                  {initials(q.name || q.email)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block type-label">{q.name || q.email}</span>
                  <span className="block type-caption text-secondary">
                    {q.email} · asked {formatIstDayMonth(q.createdAt)}
                  </span>
                </span>
                <JoinRequest id={q.id} name={q.name || q.email} />
              </div>
            ))}
          </section>
        ) : null}
        <div
          tabIndex={0}
          role="region"
          aria-label="Company members"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  Person
                </th>
                <th scope="col" className="px-2 py-3">
                  Role
                </th>
                <th scope="col" className="px-2 py-3">
                  Limit
                </th>
                <th scope="col" className="px-2 py-3">
                  Last active
                </th>
                <th scope="col" className="px-2 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {team.members.map((x) => (
                <tr key={x.userId} className="border-t border-default">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-pill bg-mint type-label-sm">
                        {initials(x.name || x.email)}
                      </span>
                      <span>
                        <span className="block type-label">
                          {x.name || x.email}
                          {x.userId === page.userId ? " (you)" : ""}
                        </span>
                        <span className="block type-caption text-secondary">{x.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <StatusBadge status={x.role} tone="neutral" />
                  </td>
                  <td className="px-2 py-3 type-body-sm">
                    <span className="flex flex-col items-start">
                      {limitText(x.role, x.orderLimitPaise)}
                      {canTeam ? (
                        <LimitDialog
                          userId={x.userId}
                          name={x.name || x.email}
                          role={x.role}
                          limit={rupees(x.orderLimitPaise)}
                        />
                      ) : null}
                    </span>
                  </td>
                  <td className="px-2 py-3 type-body-sm">{active(x.lastActive)}</td>
                  <td className="px-2 py-3 text-right">
                    {canTeam ? (
                      <MemberMenu
                        userId={x.userId}
                        name={x.name || x.email}
                        email={x.email}
                        role={x.role}
                        lastActive={active(x.lastActive)}
                        company={b.legalName}
                        roles={roles.map((r) => r.name)}
                        self={x.userId === page.userId}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
              {team.invitations.map((i) => (
                <tr key={i.id} className="border-t border-default">
                  <td className="px-4 py-3">
                    <span className="block type-label">{i.email}</span>
                    <span className="block type-caption text-secondary">Expires {formatIstDayMonth(i.expiresAt)}</span>
                  </td>
                  <td className="px-2 py-3">
                    <StatusBadge status={i.role} tone="neutral" />
                  </td>
                  <td className="px-2 py-3 type-body-sm">—</td>
                  <td className="px-2 py-3">
                    <StatusBadge status="Invite sent" tone="warning" />
                  </td>
                  <td className="px-2 py-3 text-right">
                    {canTeam ? <RevokeInvite id={i.id} email={i.email} /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="type-caption text-secondary">
          Orders above a person&apos;s limit need an Approver. Set thresholds and second approvers in{" "}
          <Link href="/buyer/company?section=rules" className="underline">
            Approval rules
          </Link>
          .
        </p>
      </>
    );
  } else if (section === "rules") {
    const [team, delegations] = await Promise.all([
      teamView(db, scope, b.organisationId),
      delegationsOf(db, scope, b.organisationId),
    ]);
    const people = team.members.map((m) => ({ id: m.userId, label: `${m.name || m.email} · ${m.role}` }));
    const approvers = team.members
      .filter((m) => m.role === "Admin" || m.role === "Approver")
      .map((m) => ({ id: m.userId, label: `${m.name || m.email} · ${m.role}` }));
    const st = data.settings;
    body = (
      <>
        <Heading
          title="Approval rules"
          detail="Which orders need approval, and who approves them. They apply when ordering opens."
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
    const [team, sessions] = await Promise.all([
      teamView(db, scope, b.organisationId),
      canManage ? companySessions(db, page.actor, b.organisationId) : Promise.resolve([]),
    ]);
    const counts = Object.fromEntries(
      ["Admin", "Approver", "Requester"].map((r) => {
        const of = team.members.filter((m) => m.role === r);
        return [r, `${String(of.filter((m) => m.passkey).length)} of ${String(of.length)} has a passkey`];
      }),
    );
    body = (
      <>
        <Heading title="Security" detail={`Sign-in rules for everyone at ${b.legalName}, and who is signed in now.`} />
        <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
          <h3 className="type-h4">Require a passkey</h3>
          <p className="type-body-sm text-secondary">
            A passkey signs people in with their fingerprint, face or screen lock. Approvers also confirm each approval
            with it.
          </p>
          <PasskeyPolicy roles={data.settings?.passkeyRoles ?? []} counts={counts} canEdit={canManage} />
          <p className="type-caption text-secondary">
            People without a passkey are asked to add one the next time they sign in.
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
          {b.legalName} · you&apos;re {role === "Admin" ? "an" : "a"} {role}
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <nav aria-label="Company settings" className="self-start rounded-card border border-default bg-page p-2">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {SECTIONS.map((s) => (
              <li key={s.key}>
                <Link
                  href={`/buyer/company?section=${s.key}`}
                  aria-current={s.key === section ? "page" : undefined}
                  className={cx(
                    "flex items-center gap-2 rounded-input px-3 py-2 type-body-sm whitespace-nowrap",
                    s.key === section ? "bg-mint" : "hover:bg-subtle",
                  )}
                >
                  <Icon name={s.icon} size={18} />
                  <span className="flex-1">{s.label}</span>
                  {s.key === section ? <Icon name="check" size={16} /> : null}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/notifications?tab=email"
                className="flex items-center gap-2 rounded-input px-3 py-2 type-body-sm whitespace-nowrap hover:bg-subtle"
              >
                <Icon name="bell" size={18} />
                <span className="flex-1">Notifications</span>
              </Link>
            </li>
          </ul>
        </nav>
        <div className="flex min-w-0 flex-col gap-4">{body}</div>
      </div>
    </BuyerWorkspace>
  );
}
