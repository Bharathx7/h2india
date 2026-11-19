import { ADMIN_FLAGS, isEnabled, TWO_PERSON_FLAGS } from "@h2india/config";
import { getDb } from "@h2india/core";
import { clockValues, openProposals, systemHealth } from "@h2india/core/admin/system";
import { can } from "@h2india/core/authz";
import { listHolidays } from "@h2india/core/clocks";
import { countDeadLetters, listDeadLetters } from "@h2india/core/queue";
import { formatIstDateTime } from "@h2india/core/time";
import { buttonClasses, EmptyState, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pageWindow, pagingQuery } from "@/lib/paging";
import { ClockRow, FailedJob, FlagRow, Holidays, Proposal } from "@/admin/system/Controls";

// System settings (707:793), step 11.8: switches, clocks, integrations and failed jobs. Every change needs a reason
// and is audited; switches that open money flows need a second operator; clocks apply to new deadlines only.
export const metadata: Metadata = { title: "System settings · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const FLAG_WORDS: Record<string, { label: string; hint: string }> = {
  comingSoon: {
    label: "Coming soon page",
    hint: "Shows the coming soon page to visitors who aren't signed in. Off while the site is public.",
  },
  maintenance: {
    label: "Maintenance mode",
    hint: "Takes the site offline and shows the maintenance page. Admin, the CMS and sign-in stay open.",
  },
  searchIndexing: { label: "Search engines may index the site", hint: "Turn on at Launch 1." },
  transactions: { label: "Orders and payments", hint: "Carts, checkout, orders and payouts (Launch 2)." },
  payLater: {
    label: "Pay later with a credit partner",
    hint: "Off until a lender is signed. Checkout doesn't show the option.",
  },
  letterOfCredit: { label: "Letter of credit for capital orders", hint: "Shown at checkout for Tier D orders only." },
  testerSignIn: {
    label: "Test account sign-in",
    hint: "Lets the test accounts made with pnpm testers:create sign in with a password at /sign-in/test. Turn off after testing.",
  },
  mobileVerification: {
    label: "Mobile number check (SMS code)",
    hint: "Join asks for a code sent to the mobile number. Off: the number is saved without a code. Turn on once an SMS provider is connected.",
  },
  buyerChecklist: {
    label: "Buyer set-up checklist",
    hint: "Shows new buyers the five set-up steps before their dashboard. Off: buyers go straight to the dashboard.",
  },
};
const SITE_FLAGS = ["comingSoon", "maintenance", "searchIndexing"] as const;
const FEATURE_FLAGS = [
  "transactions",
  "payLater",
  "letterOfCredit",
  "buyerChecklist",
  "testerSignIn",
  "mobileVerification",
] as const;

/** An integration's state as a badge: connected, a built-in stand-in, or not connected yet. */
const integrationBadge = (status: string) =>
  status.startsWith("Not")
    ? { word: "Not connected", tone: "warning" as const }
    : status.startsWith("Built-in")
      ? { word: "Built-in stand-in", tone: "neutral" as const }
      : { word: "Connected", tone: "success" as const };

const unitOf = (d: { hours?: number; days?: number; workingDays?: number }) =>
  "hours" in d && d.hours !== undefined
    ? { amount: d.hours, unit: "hours" as const }
    : "days" in d && d.days !== undefined
      ? { amount: d.days, unit: "days" as const }
      : { amount: d.workingDays ?? 1, unit: "workingDays" as const };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId, actor } = await requireOperator("settings.view", "/admin/settings");
  const sp = await searchParams;
  const db = getDb();
  // Three lists on one page, each with its own pages (founder, 19 Nov 2026).
  const failedReq = pageRequest(sp, "failed");
  const [health, clocks, allProposals, allHolidays, failedRows, failedTotal] = await Promise.all([
    systemHealth(db, actor),
    clockValues(db),
    openProposals(db, actor),
    listHolidays(db, actor),
    listDeadLetters(db, actor, pageWindow(failedReq)),
    countDeadLetters(db, actor),
  ]);
  const holidaysPage = pageOf(allHolidays, pageRequest(sp, "holidays"));
  const holidays = holidaysPage.rows;
  const proposalsPage = pageOf(allProposals, pageRequest(sp, "proposals"));
  const proposals = proposalsPage.rows;
  const failed = { ...failedReq, rows: failedRows, total: failedTotal };
  const canEdit = can(actor, "settings.edit");
  const flagRows = (list: readonly (typeof ADMIN_FLAGS)[number][]) =>
    list
      .filter((f) => ADMIN_FLAGS.includes(f))
      .map((f) => (
        <FlagRow
          key={f}
          flag={f}
          label={FLAG_WORDS[f]?.label ?? f}
          hint={FLAG_WORDS[f]?.hint ?? ""}
          on={isEnabled(f)}
          twoPerson={TWO_PERSON_FLAGS.includes(f)}
          canEdit={canEdit}
        />
      ));
  return (
    <AdminShell userId={userId} current="/admin/settings" title="Settings">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">System settings</h1>
          <p className="type-body-sm text-secondary">
            Switches and values that affect the whole site. Every change is recorded in the audit log.
          </p>
        </div>
        <Link href="/admin/settings/search" className={buttonClasses({ variant: "outline" })}>
          Search management
        </Link>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-1 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Site</h2>
            <ul className="flex flex-col divide-y divide-default">{flagRows(SITE_FLAGS)}</ul>
          </section>
          <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">SLA values</h2>
            <p className="type-caption text-secondary">
              Used for timers, queue colours and reminders everywhere. A change applies to new deadlines only.
            </p>
            <div tabIndex={0} role="region" aria-label="SLA values" className="relative overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-subtle text-left type-caption text-secondary">
                    <th scope="col" className="px-3 py-2">
                      Rule
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Value
                    </th>
                    {canEdit ? (
                      <>
                        <th scope="col" className="px-3 py-2">
                          Reason
                        </th>
                        <th scope="col" className="px-3 py-2">
                          <span className="sr-only">Save</span>
                        </th>
                      </>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {clocks.map((c) => {
                    const v = unitOf(c.value);
                    return canEdit ? (
                      <ClockRow key={c.name} name={c.name} label={c.label} amount={v.amount} unit={v.unit} />
                    ) : (
                      <tr key={c.name} className="border-t border-default">
                        <td className="px-3 py-3 type-body-sm">{c.label}</td>
                        <td className="px-3 py-3 type-body-sm">
                          {v.amount} {v.unit === "workingDays" ? "working days" : v.unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Holidays</h2>
            <p className="type-caption text-secondary">
              Working-day clocks (SLA, review times) skip these days, Monday to Saturday otherwise. A change applies to
              deadlines started after it.
            </p>
            <Holidays rows={holidays} canEdit={canEdit} />
            <ListPager paged={holidaysPage} query={pagingQuery(sp, "holidays")} name="holidays" />
          </section>
          <section className="flex flex-col gap-1 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Feature flags</h2>
            <ul className="flex flex-col divide-y divide-default">{flagRows(FEATURE_FLAGS)}</ul>
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
                <ListPager paged={proposalsPage} query={pagingQuery(sp, "proposals")} name="proposals" />
              </div>
            ) : null}
          </section>
        </div>
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Message template IDs</h2>
            <p className="type-caption text-secondary">IDs registered with each provider.</p>
            <div className="rounded-card bg-subtle">
              <EmptyState title="No provider IDs yet">
                SMS (DLT) and WhatsApp template IDs show here with their status once the providers are chosen (M5).
                Email templates need no ID.
              </EmptyState>
            </div>
          </section>
          <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Integrations</h2>
            <div tabIndex={0} role="region" aria-label="Integrations" className="relative overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-subtle text-left type-caption text-secondary">
                    <th scope="col" className="px-3 py-2">
                      Service
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {health.integrations.map((i) => {
                    const b = integrationBadge(i.status);
                    return (
                      <tr key={i.name} className="border-t border-default">
                        <td className="px-3 py-3 type-body-sm">{i.name}</td>
                        <td className="px-3 py-3">
                          <StatusBadge status={b.word} tone={b.tone} />
                        </td>
                        <td className="px-3 py-3 type-caption text-secondary">{i.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Failed jobs</h2>
            {failed.rows.length ? (
              <ul className="flex flex-col divide-y divide-default">
                {failed.rows.map((f) => (
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
            <ListPager paged={failed} query={pagingQuery(sp, "failed")} name="failed" />
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
