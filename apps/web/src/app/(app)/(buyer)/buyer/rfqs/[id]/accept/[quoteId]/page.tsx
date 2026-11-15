import { getDb, Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { companySettings } from "@h2india/core/buyer";
import { acceptable, buyerRfq, milestoneAmounts, quoteVersion, type QuoteStatus } from "@h2india/core/rfq";
import { teamView } from "@h2india/core/supplier";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { isEnabled } from "@h2india/config";
import { Alert, Breadcrumbs, buttonClasses, Icon, VerifiedBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AcceptButton } from "@/buyer/AcceptButton";
import { BuyerWorkspace, requireBuyer } from "@/buyer/shell";

// Accept-quote confirmation (569:9; phones 570:8), step 9.8. Launch 1 has no ordering (C8, founder 11 Nov 2026): the
// screen shows what accepting would do, Confirm is off while the transactions flag is off, and the buyer is pointed to
// Message. The Launch 1 wording ("Ordering opens in Launch 2") isn't in Figma yet and needs design approval (OPEN: C8).
export const metadata: Metadata = { title: "Accept quote · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

const rupees = (p: bigint) => Money.format(p);
const WHEN: Record<string, (supplier: string) => string> = {
  Advance: (s) => `When ${s} confirms the order`,
  "On confirmation": (s) => `When ${s} confirms the order`,
  "Before dispatch": () => "Before the goods are dispatched",
  "On receipt": () => "When you accept the delivery",
  Retention: () => "As set out in the quote",
};

export default async function AcceptQuotePage({ params }: { params: Promise<{ id: string; quoteId: string }> }) {
  const { id, quoteId } = await params;
  const page = await requireBuyer(`/buyer/rfqs/${id}/accept/${quoteId}`);
  const b = page.buyer;
  const db = getDb();
  const scope = scopeFor(page.actor);
  const d = await buyerRfq(db, scope, b.organisationId, id);
  const v = d ? await quoteVersion(db, scope, { organisationId: b.organisationId, side: "buyer" }, quoteId) : null;
  if (!d || !v || v.quote.rfqId !== id) notFound();
  const [settings, team] = await Promise.all([
    companySettings(db, scope, b.organisationId),
    teamView(db, scope, b.organisationId),
  ]);
  const now = new Date();
  const supplier = d.suppliers.find((s) => s.rs.organisationId === v.quote.organisationId);
  const name = supplier?.name ?? supplier?.legalName ?? "the supplier";
  const item = d.items[0];
  const site = settings?.sites.find((s) => s.id === d.rfq.deliverySiteId);
  const gstin =
    settings?.gstins.find((g) => g.id === d.rfq.billingGstinId) ?? settings?.gstins.find((g) => g.isDefault);
  const above = settings?.settings?.approvalAbovePaise ?? null;
  const approver = team.members.find((m) => m.userId === settings?.settings?.approverId);
  const needsApproval = above !== null && v.version.totalPaise > above;
  const amounts = milestoneAmounts(v.version.totalPaise, v.schedule);
  const ok = acceptable(v.quote.status as QuoteStatus, v.version.validUntil, now) && d.rfq.status === "Quotes received";
  const transactions = isEnabled("transactions");
  const others = d.suppliers.filter((s) => s.rs.organisationId !== v.quote.organisationId);
  const otherQuote = (orgId: string) => d.quotes.find((q) => q.organisationId === orgId && q.status !== "Withdrawn");
  const daysLeft = v.version.validUntil
    ? Math.max(0, Math.ceil((v.version.validUntil.getTime() - now.getTime()) / 86_400_000))
    : null;
  return (
    <BuyerWorkspace page={page} current="/buyer/rfqs">
      <Breadcrumbs
        items={[
          { label: "RFQs", href: "/buyer/rfqs" },
          { label: d.rfq.reference, href: `/buyer/rfqs/${id}` },
          { label: "Accept quote" },
        ]}
      />
      <div>
        <h1 className="type-h2">Accept {name}&apos;s quote</h1>
        <p className="type-body-sm text-secondary">
          {d.rfq.reference} · {d.rfq.title}. Check the details before you accept.
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <div className="flex items-start justify-between gap-3">
              <span>
                <span className="block type-h4">{name}</span>
                <VerifiedBadge kind="supplier" />
              </span>
              <span className="type-caption text-secondary">
                {v.version.sentAt ? `Quoted ${formatIstDate(v.version.sentAt)}` : ""}
              </span>
            </div>
            <dl className="grid grid-cols-1 divide-y divide-default md:grid-cols-[160px_minmax(0,1fr)] md:divide-y-0">
              {(
                [
                  [
                    "Price excl. GST",
                    `${rupees(v.version.subtotalPaise)}${item ? ` for ${String(item.quantity)} ${item.unit}` : ""}`,
                  ],
                  [`GST at ${String((v.lines[0]?.gstRateBps ?? 0) / 100)}%`, rupees(v.version.gstPaise)],
                  ["Total incl. GST", rupees(v.version.totalPaise)],
                  [
                    "Lead time",
                    v.version.leadTimeWeeks ? `${String(v.version.leadTimeWeeks)} weeks from order confirmation` : "",
                  ],
                  [
                    "Delivery",
                    [
                      site ? [site.name, site.city, site.pincode].filter(Boolean).join(", ") : "",
                      v.version.deliveryTerms,
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  ],
                  ["Warranty", v.version.warrantyMonths ? `${String(v.version.warrantyMonths)} months` : ""],
                  [
                    "Quote valid until",
                    v.version.validUntil
                      ? `${formatIstDateTime(v.version.validUntil)}${daysLeft !== null ? ` · ${String(daysLeft)} days left` : ""}`
                      : "",
                  ],
                  ["Bill to", gstin ? `${b.legalName} · GSTIN ${gstin.gstin}` : b.legalName],
                ] as [string, string][]
              )
                .filter(([, x]) => x)
                .map(([k, x]) => (
                  <div key={k} className="contents">
                    <dt className="py-2 type-body-sm text-secondary">{k}</dt>
                    <dd className="py-2 type-body-sm">{x}</dd>
                  </div>
                ))}
            </dl>
          </section>
          {v.schedule.length ? (
            <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
              <h2 className="type-h4">Payment schedule</h2>
              <div tabIndex={0} role="region" aria-label="Payment schedule" className="relative overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="bg-subtle text-left type-eyebrow text-secondary">
                      <th scope="col" className="px-3 py-2">
                        Milestone
                      </th>
                      <th scope="col" className="px-3 py-2">
                        When
                      </th>
                      <th scope="col" className="px-3 py-2 text-right">
                        Amount incl. GST
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.schedule.map((l, n) => (
                      <tr key={l.id} className="border-t border-default">
                        <td className="px-3 py-2 type-label">
                          {l.percentBps / 100}% {l.trigger.toLowerCase()}
                        </td>
                        <td className="px-3 py-2 type-body-sm">
                          {(WHEN[l.trigger] ?? (() => "As set out in the quote"))(name)}
                        </td>
                        <td className="px-3 py-2 text-right type-mono">{rupees(amounts[n] ?? 0n)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
          {others.length ? (
            <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
              <h2 className="type-h4">Other suppliers will be told &quot;Not selected&quot;</h2>
              <ul className="flex flex-col gap-2">
                {others.map((s) => {
                  const oq = otherQuote(s.rs.organisationId);
                  return (
                    <li key={s.rs.id}>
                      <span className="block type-label">{s.name ?? s.legalName}</span>
                      <span className="block type-caption text-secondary">
                        {oq
                          ? "Quoted"
                          : `${s.rs.status === "Viewed" ? "Viewed, no quote" : "No quote"}. The RFQ closes for them.`}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="rounded-card bg-subtle p-3">
                <p className="type-eyebrow text-secondary">What they see</p>
                <p className="type-body-sm">
                  Your quote for {d.rfq.reference} · {d.rfq.title} was not selected. Thank you for quoting.
                </p>
              </div>
            </section>
          ) : null}
        </div>
        <aside className="flex flex-col gap-4 self-start">
          {!transactions ? (
            <Alert tone="info" title="Ordering opens in Launch 2">
              You can compare quotes and choose now. Until ordering opens, agree next steps with {name} in Messages.
            </Alert>
          ) : needsApproval ? (
            <Alert tone="warning" title="Needs approval first">
              {rupees(v.version.totalPaise)} is above your company&apos;s {rupees(above)} limit.
              {approver
                ? ` ${approver.name} (Approver) is asked to approve.`
                : " An approver is asked to approve."}{" "}
              {name} gets the order after approval.
            </Alert>
          ) : null}
          {!ok ? (
            <Alert tone="error" title="This quote can't be accepted">
              It was withdrawn or has expired, or the RFQ is closed.
            </Alert>
          ) : null}
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <p className="type-caption text-secondary">Order total incl. GST</p>
            <p className="type-h2">{rupees(v.version.totalPaise)}</p>
            {amounts[0] !== undefined && v.schedule[0] ? (
              <p className="type-caption text-secondary">
                First payment: {v.schedule[0].percentBps / 100}% {v.schedule[0].trigger.toLowerCase()},{" "}
                {rupees(amounts[0])}, after {name} confirms.
              </p>
            ) : null}
            <AcceptButton
              id={id}
              quoteId={quoteId}
              enabled={transactions && ok}
              label={needsApproval ? "Accept and send for approval" : "Accept quote"}
            />
            <Link
              href={`/buyer/messages?rfq=${id}&supplier=${v.quote.organisationId}`}
              className={buttonClasses({ variant: "outline" })}
            >
              <Icon name="message-square" size={16} />
              Message {name}
            </Link>
            <Link href={`/buyer/rfqs/${id}`} className="self-center type-label">
              Back to comparison
            </Link>
          </section>
        </aside>
      </div>
    </BuyerWorkspace>
  );
}
