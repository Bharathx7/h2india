import { getDb } from "@h2india/core";
import { mobileFieldsShown } from "@h2india/core/admin/system";
import { scopeFor } from "@h2india/core/authz";
import { bankState, type BankAccount } from "@h2india/core/supplier";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { Alert, Breadcrumbs, cx, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { CancelChange, ConfirmChange, NewAccountForm, TryAnother } from "@/supplier/BankControls";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Payout bank account (588:222): Current account 588:223, Change account confirm 588:748, Hold period 588:1179 and
// 589:8, Verification failed 588:1586. Only the last four digits are shown. The Next payout card arrives with payouts.
export const metadata: Metadata = { title: "Payout bank account · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const dots = "•••• ••••";

function Details({
  title,
  a,
  badge,
  extra,
}: {
  title: string;
  a: BankAccount;
  badge?: React.ReactNode;
  extra?: [string, string][];
}) {
  const rows: [string, string][] = [
    ["Account holder", a.holderName],
    ["Account number", `${dots} ${a.accountLast4}`],
    ["IFSC", `•••••••${a.ifsc.slice(-4)}`],
    ...(a.branch ? ([["Branch", a.branch]] as [string, string][]) : []),
    ...(extra ?? []),
  ];
  return (
    <section className="flex flex-col rounded-card border border-default bg-page p-5">
      <div className="flex items-center justify-between pb-2">
        <h2 className="type-h4">{title}</h2>
        {badge}
      </div>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[160px_minmax(0,1fr)] border-t border-default py-2.5">
            <dt className="type-body-sm text-secondary">{k}</dt>
            <dd className={k === "Account number" || k === "IFSC" ? "type-spec" : "type-body-sm"}>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default async function BankPage() {
  const page = await requireSupplier("/supplier/bank");
  const s = page.supplier;
  const db = getDb();
  const [state, sms] = await Promise.all([
    bankState(db, scopeFor(page.actor), s.organisationId),
    mobileFieldsShown(db),
  ]);
  const canChange = s.seat.permissions.has("payout_bank.change");
  const change = state.change;
  const step = change?.status === "Held" ? 4 : change ? 3 : 1;
  const steps = ["New account", "Test deposit", "Confirm it's you", "Hold period"];
  return (
    <SupplierShell page={page} current="/supplier/invoices" title="Fees & invoices">
      <Breadcrumbs
        items={[{ label: "Fees & invoices", href: "/supplier/invoices" }, { label: "Payout bank account" }]}
        renderLink={(c, className) => (
          <Link href={c.href} className={className}>
            {c.label}
          </Link>
        )}
      />
      <div>
        <h1 className="type-h2">Payout bank account</h1>
        <p className="type-body-sm text-secondary">
          Where H2 Economy sends your payouts. The account name must match your GST legal name.
        </p>
      </div>
      {change?.status === "Held" && change.holdUntil ? (
        <Alert tone="warning" title={`Payouts on hold until ${formatIstDateTime(change.holdUntil)} IST`}>
          We&apos;re checking your new account ending {change.accountLast4}. Payouts go to it once the hold ends.
        </Alert>
      ) : null}
      {state.failed && !change ? (
        <Alert tone="error" title="We couldn't verify the new account">
          {state.failed.failReason}
          {state.current ? ` Your payouts still go to the account ending ${state.current.accountLast4}.` : ""}
        </Alert>
      ) : null}
      <div className="flex max-w-3xl flex-col gap-5">
        {change && state.current ? (
          <ol className="flex flex-wrap gap-5" aria-label="Steps">
            {steps.map((label, i) => (
              <li key={label} className="flex items-center gap-2" aria-current={i + 1 === step ? "step" : undefined}>
                <span
                  className={cx(
                    "flex size-7 items-center justify-center rounded-pill type-label",
                    i + 1 < step
                      ? "bg-accent"
                      : i + 1 === step
                        ? "bg-inverse text-inverse"
                        : "border border-control text-secondary",
                  )}
                >
                  {i + 1 < step ? <Icon name="check" size={16} /> : i + 1}
                </span>
                <span className="type-label">{label}</span>
              </li>
            ))}
          </ol>
        ) : null}
        {change?.status === "Pending" ? (
          <>
            <Details title={state.current ? "New account" : "Your account"} a={change} />
            <Alert tone="success" title="Test deposit matched">
              We sent ₹1. The bank returned the name {change.bankName}, which matches your GST legal name.
            </Alert>
            {canChange ? (
              <ConfirmChange
                id={change.id}
                first={!state.current}
                holdUntil={state.current ? "the hold period ends" : null}
              />
            ) : null}
          </>
        ) : null}
        {change?.status === "Held" ? (
          <>
            <Details
              title="New account"
              a={change}
              badge={
                change.holdUntil ? (
                  <StatusBadge status={`Active from ${formatIstDateTime(change.holdUntil)}`} tone="warning" />
                ) : undefined
              }
              extra={[
                [
                  "Changed",
                  `${change.confirmedAt ? formatIstDateTime(change.confirmedAt) : ""}, confirmed by email code`,
                ],
              ]}
            />
            {state.current ? (
              <Details
                title="Previous account"
                a={state.current}
                badge={<StatusBadge status="Being replaced" tone="neutral" />}
              />
            ) : null}
            {canChange && state.current ? (
              <CancelChange id={change.id} oldLast4={state.current.accountLast4} company={s.tradeName} sms={sms} />
            ) : null}
          </>
        ) : null}
        {!change && state.current ? (
          <>
            <Details
              title="Current account"
              a={state.current}
              badge={<StatusBadge status="Payouts active" tone="success" />}
              extra={[
                ["Name check", state.current.nameMatches ? "Matches your GST legal name" : "Not checked"],
                [
                  "How we checked",
                  `${state.current.checkMethod ?? ""}${state.current.checkedAt ? ` on ${formatIstDate(state.current.checkedAt)}` : ""}`,
                ],
              ]}
            />
            {canChange ? (
              state.failed ? (
                <TryAnother defaultHolder={s.legalName} />
              ) : (
                <details className="rounded-card border border-default bg-page p-5">
                  <summary className="cursor-pointer type-label">Change account</summary>
                  <div className="mt-4">
                    <NewAccountForm defaultHolder={s.legalName} />
                  </div>
                </details>
              )
            ) : null}
            <Alert tone="success" title="Changing your account pauses payouts">
              We check the new account with a ₹1 test deposit and a code to your email, then hold payouts before
              switching.
            </Alert>
          </>
        ) : null}
        {!change && !state.current ? (
          canChange ? (
            <NewAccountForm defaultHolder={s.legalName} first />
          ) : (
            <p className="type-body-sm text-body">A company admin adds the payout account.</p>
          )
        ) : null}
        <Link href="/supplier" className="type-label text-link">
          Back to dashboard
        </Link>
      </div>
    </SupplierShell>
  );
}
