import { ADMIN_FLAGS, isEnabled, TWO_PERSON_FLAGS } from "@h2india/config";
import { getDb } from "@h2india/core";
import { clockValues, openProposals, systemHealth } from "@h2india/core/admin/system";
import { can } from "@h2india/core/authz";
import { formatIstDateTime } from "@h2india/core/time";
import { buttonClasses, EmptyState, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { ClockRow, FailedJob, FlagRow, Proposal } from "@/admin/system/Controls";

// System settings (707:793), step 11.8: switches, clocks, integrations and failed jobs. Every change needs a reason
// and is audited; switches that open money flows need a second operator; clocks apply to new deadlines only.
export const metadata: Metadata = { title: "System settings · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const FLAG_WORDS: Record<string, { label: string; hint: string }> = {
  maintenance: {
    label: "Maintenance",
    hint: "Every public page shows the maintenance page. Admin, the CMS and sign-in stay open.",
  },
  comingSoon: {
    label: "Coming soon",
    hint: "Public pages show Coming soon except to operators and the pre-launch list.",
  },
  searchIndexing: { label: "Search engines may index the site", hint: "Turn on at Launch 1." },
  transactions: { label: "Orders and payments", hint: "Launch 2: carts, checkout, orders and payouts." },
  payLater: { label: "Pay later", hint: "Credit at checkout (Launch 2, M19)." },
  letterOfCredit: { label: "Letter of credit", hint: "Tier D orders (Launch 2, M19)." },
};

const unitOf = (d: { hours?: number; days?: number; workingDays?: number }) =>
  "hours" in d && d.hours !== undefined
    ? { amount: d.hours, unit: "hours" as const }
    : "days" in d && d.days !== undefined
      ? { amount: d.days, unit: "days" as const }
      : { amount: d.workingDays ?? 1, unit: "workingDays" as const };

export default async function SettingsPage() {
  const { userId, actor } = await requireOperator("settings.view", "/admin/settings");
  const db = getDb();
  const [health, clocks, proposals] = await Promise.all([
    systemHealth(db, actor),
    clockValues(db),
    openProposals(db, actor),
  ]);
  const canEdit = can(actor, "settings.edit");
  return (
    <AdminShell userId={userId} current="/admin/settings" title="Settings">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">System settings</h1>
          <p className="type-body-sm text-secondary">
            Switches, clocks, integrations and failed jobs. Every change is kept in the audit log with your reason.
          </p>
        </div>
        <Link href="/admin/settings/search" className={buttonClasses({ variant: "outline" })}>
          Search management
        </Link>
      </div>
      <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
        <h2 className="type-h4">Switches</h2>
        {canEdit ? (
          <ul className="flex flex-col divide-y divide-default">
            {ADMIN_FLAGS.map((f) => (
              <FlagRow
                key={f}
                flag={f}
                label={FLAG_WORDS[f]?.label ?? f}
                hint={FLAG_WORDS[f]?.hint ?? ""}
                on={isEnabled(f)}
                twoPerson={TWO_PERSON_FLAGS.includes(f)}
              />
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col gap-1">
            {ADMIN_FLAGS.map((f) => (
              <li key={f} className="type-body-sm">
                {FLAG_WORDS[f]?.label}: {isEnabled(f) ? "On" : "Off"}
              </li>
            ))}
          </ul>
        )}
        {proposals.length ? (
          <div className="flex flex-col gap-2 border-t border-default pt-3">
            <h3 className="type-label">Waiting for a second operator</h3>
            {proposals.map(({ p, by }) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                <span className="type-body-sm">
                  {by} wants to turn {FLAG_WORDS[p.key.replace("flag.", "")]?.label ?? p.key}{" "}
                  {p.value === true ? "on" : "off"}: {p.reason} · {formatIstDateTime(p.proposedAt)}
                </span>
                {canEdit && p.proposedBy !== userId ? (
                  <Proposal id={p.id} />
                ) : (
                  <StatusBadge status="Waiting" tone="neutral" />
                )}
              </div>
            ))}
          </div>
        ) : null}
      </section>
      <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
        <h2 className="type-h4">Clocks</h2>
        <p className="type-caption text-secondary">
          A change applies to new deadlines only; deadlines already running keep their time.
        </p>
        <div tabIndex={0} role="region" aria-label="Clocks" className="relative overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-3 py-2">
                  Clock
                </th>
                <th scope="col" className="px-3 py-2">
                  Value
                </th>
                <th scope="col" className="px-3 py-2">
                  Reason
                </th>
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Save</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {clocks.map((c) => {
                const v = unitOf(c.value);
                return canEdit ? (
                  <ClockRow key={c.name} name={c.name} label={c.label} amount={v.amount} unit={v.unit} />
                ) : (
                  <tr key={c.name} className="border-t border-default">
                    <td className="px-3 py-2 type-body-sm">{c.label}</td>
                    <td className="px-3 py-2 type-body-sm">
                      {v.amount} {v.unit === "workingDays" ? "working days" : v.unit}
                    </td>
                    <td />
                    <td />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">Integrations</h2>
          <ul className="flex flex-col divide-y divide-default">
            {health.integrations.map((i) => (
              <li key={i.name} className="flex justify-between gap-3 py-2">
                <span className="type-label">{i.name}</span>
                <span className="text-right type-caption text-secondary">{i.status}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">Failed jobs</h2>
          {health.failed.length ? (
            <ul className="flex flex-col divide-y divide-default">
              {health.failed.map((f) => (
                <li key={f.id} className="flex flex-col gap-1 py-2">
                  <span className="type-label">
                    {f.queue} · {f.jobName}
                  </span>
                  <span className="type-caption text-error">{f.error}</span>
                  <span className="flex flex-wrap items-center justify-between gap-2 type-caption text-secondary">
                    Failed {formatIstDateTime(f.failedAt)} after {f.attempts} tries
                    {canEdit ? <FailedJob id={f.id} /> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No failed jobs">Jobs that fail every retry show here, ready to retry.</EmptyState>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
