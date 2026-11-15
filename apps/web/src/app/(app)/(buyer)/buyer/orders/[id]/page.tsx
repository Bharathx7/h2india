import { getDb, Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { heldOn, orderDetail, timelineStep, TIMELINE_STEPS, type OrderDetail } from "@h2india/core/orders";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { Alert, buttonClasses, Icon, StatusBadge, Stepper, type StepItem } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AcceptOrReport, CancelOrder, OfferActions, PayOnline, RequestDate } from "@/buyer/orders/Panels";
import { BuyerWorkspace, requireBuyer } from "@/buyer/shell";
import { requireTransactionsPage } from "@/orders/guard";
import { milestoneWord } from "@/orders/views";

// Buyer order (77:1178; phones 81:8452; all states 807:14435), steps 10.1 to 10.10: the seven-step timeline and the
// one main action of each state, pay the advance (330:26743) and the balance (339:27238), payment outcomes
// (691:12 to 691:1014), accept or report (330:27033), dispute (697:579) and refund status (700:8). Built from the
// supplier frames and the design system while Figma is out of reach (A178).
export const metadata: Metadata = { title: "Order · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

const rupees = (p: bigint) => Money.format(p);
const CANCELLABLE = ["Awaiting approval", "Pending acceptance", "Accepted", "Awaiting payment", "Ready to dispatch"];

function Card({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section
      className={`flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5 ${className ?? ""}`}
    >
      {title ? <h2 className="type-h4">{title}</h2> : null}
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="flex flex-col gap-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-4 max-md:flex-col max-md:gap-0.5">
          <dt className="w-40 shrink-0 type-caption text-secondary">{k}</dt>
          <dd className="type-body-sm">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const OUTCOMES: Record<string, { tone: "success" | "info" | "warning" | "error"; title: string; body: string }> = {
  success: {
    tone: "success",
    title: "Payment received",
    body: "The payment partner confirmed it. It's held in escrow until you accept the delivery.",
  },
  pending: {
    tone: "info",
    title: "Your payment is being confirmed",
    body: "Your bank hasn't confirmed it yet. Don't pay again: we'll update this order as soon as it does.",
  },
  "timed-out": {
    tone: "warning",
    title: "The payment timed out",
    body: "Nothing was taken. Try again, or pay by bank transfer into this order's account.",
  },
  failed: {
    tone: "error",
    title: "The payment didn't go through",
    body: "Your bank declined it and nothing was taken. Try again, or pay by bank transfer.",
  },
};

function timeline(d: OrderDetail): StepItem[] {
  const stoppedAt = d.history.length > 1 ? d.history[d.history.length - 2]?.toStatus : undefined;
  const at = timelineStep(d.status, stoppedAt as never);
  const final = d.status === "Closed";
  return TIMELINE_STEPS.map((label, i) => ({
    label,
    status: final || i + 1 < at ? "complete" : i + 1 === at ? "current" : "upcoming",
  }));
}

export default async function BuyerOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  requireTransactionsPage();
  const { id } = await params;
  const sp = await searchParams;
  const page = await requireBuyer(`/buyer/orders/${id}`);
  const db = getDb();
  const d = await orderDetail(scopeFor(page.actor), db, id);
  if (!d || d.order.buyerOrganisationId !== page.buyer.organisationId) notFound();
  const seat = page.buyer.seat.permissions;
  const canPlace = seat.has("order.place");
  const held = await heldOn(db, d.order.id);
  const due = d.milestones.filter((m) => m.status === "Due" || m.status === "Partly paid");
  const next = due[0];
  const paid = d.payments.filter((p) => p.status === "Succeeded").reduce((t, p) => t + p.amountPaise, 0n);
  const outcome = sp.payment ? OUTCOMES[sp.payment] : undefined;
  const failedTries = next
    ? d.payments.filter((p) => p.milestoneId === next.id && p.status !== "Succeeded" && p.status !== "Pending").length
    : 0;
  const dispute = d.disputes[0] ?? null;
  const pendingDate = d.dateChanges.find((c) => c.status === "Requested");
  const docs = [
    d.order.poFileId
      ? { id: d.order.poFileId, label: `Purchase order${d.order.poNumber ? ` ${d.order.poNumber}` : ""}` }
      : null,
    d.shipment?.invoiceFileId
      ? { id: d.shipment.invoiceFileId, label: `GST invoice ${d.shipment.invoiceNumber ?? ""}` }
      : null,
    d.shipment?.ewayBillFileId ? { id: d.shipment.ewayBillFileId, label: "E-way bill" } : null,
    ...(d.shipment?.podFileIds ?? []).map((f) => ({ id: f, label: "Proof of delivery" })),
  ].filter((x): x is { id: string; label: string } => Boolean(x));

  return (
    <BuyerWorkspace page={page} current="/buyer/orders">
      <Link href="/buyer/orders" className="inline-flex items-center gap-2 self-start type-label">
        <Icon name="arrow-left" size={16} />
        Orders
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="type-h2">
          {d.order.reference} · {d.supplierName}
        </h1>
        <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
          <StatusBadge status={d.badge.label} tone={d.badge.tone} />
          Placed {formatIstDate(d.order.createdAt)} by {d.placedByName} · {rupees(d.order.totalPaise)} incl. GST
        </p>
      </div>
      <Stepper steps={timeline(d)} className="max-md:hidden" />

      {outcome ? (
        <Alert tone={outcome.tone} title={outcome.title} live>
          {outcome.body}
          {sp.payment !== "success" && failedTries >= 3
            ? " You've reached the limit of 3 tries online; pay by bank transfer."
            : ""}
        </Alert>
      ) : null}
      {next && next.dueAt && next.dueAt.getTime() < new Date().getTime() ? (
        <Alert
          tone="error"
          title={`${milestoneWord(next.trigger)} of ${rupees(next.amountPaise - next.paidPaise)} was due ${formatIstDate(next.dueAt)}`}
        >
          Pay now so {d.supplierName} can keep to the dispatch date. The order isn&apos;t cancelled for a late payment.
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          {d.status === "Awaiting approval" ? (
            <Card title="Waiting for approval" className="w-full">
              <p className="type-body-sm text-body">
                This order is above the approval limit, so your company&apos;s approver checks it before it goes to{" "}
                {d.supplierName}.
              </p>
              {seat.has("order.approve") && d.order.placedBy !== page.userId ? (
                <Link href={`/buyer/orders/${d.order.id}/approve`} className={`${buttonClasses({})} self-start`}>
                  Review and approve
                </Link>
              ) : null}
            </Card>
          ) : null}

          {d.status === "Pending acceptance" ? (
            <Card title={`Waiting for ${d.supplierName} to confirm`} className="w-full">
              <p className="type-body-sm text-body">
                They have until {d.acceptBy ? formatIstDateTime(d.acceptBy) : "48 hours after you placed it"} to confirm
                the order and its dispatch date. You pay only after that.
              </p>
            </Card>
          ) : null}

          {next &&
          ["Accepted", "Awaiting payment", "Ready to dispatch", "Delivered", "Accepted by buyer"].includes(d.status) ? (
            <Card title={`Pay the ${milestoneWord(next.trigger).toLowerCase()}`} className="w-full">
              <p className="type-body text-body">
                {rupees(next.amountPaise - next.paidPaise)} is due{next.dueAt ? ` by ${formatIstDate(next.dueAt)}` : ""}
                . It&apos;s held in escrow until you accept the delivery.
                {next.status === "Partly paid"
                  ? ` ${rupees(next.paidPaise)} of ${rupees(next.amountPaise)} received so far.`
                  : ""}
              </p>
              {canPlace ? (
                <PayOnline
                  orderId={d.order.id}
                  milestoneId={next.id}
                  amount={rupees(next.amountPaise - next.paidPaise)}
                />
              ) : null}
              {d.account ? (
                <div className="mt-2 flex flex-col gap-2 rounded-card bg-subtle p-4">
                  <p className="type-label">Or pay by bank transfer (NEFT or RTGS)</p>
                  <Rows
                    rows={[
                      ["Account name", d.account.payeeName],
                      [
                        "Account number",
                        <span key="a" className="type-spec">
                          {d.account.accountNumber}
                        </span>,
                      ],
                      [
                        "IFSC",
                        <span key="i" className="type-spec">
                          {d.account.ifsc}
                        </span>,
                      ],
                      [
                        "Amount",
                        <span key="m" className="type-spec">
                          {rupees(next.amountPaise - next.paidPaise)}
                        </span>,
                      ],
                      [
                        "Reference",
                        <span key="r" className="type-spec">
                          {d.order.reference}
                        </span>,
                      ],
                    ]}
                  />
                  <p className="type-caption text-secondary">
                    This account belongs to this order at our payment partner, not to the supplier. The payment shows
                    here once the bank confirms it, usually within 2 hours on a working day.
                  </p>
                </div>
              ) : null}
            </Card>
          ) : null}

          {d.status === "Shipped" ? (
            <Card title="On its way" className="w-full">
              <Rows
                rows={[
                  ["Carrier", d.shipment?.transporter ?? ""],
                  ["LR or tracking", d.shipment?.lrNumber ?? ""],
                  ["Expected", d.shipment?.expectedAt ? formatIstDate(d.shipment.expectedAt) : ""],
                  ["Receiving contact", `${d.order.receiverName ?? ""} gets a delivery code by SMS when it arrives`],
                ]}
              />
            </Card>
          ) : null}

          {d.status === "Delivered" && canPlace ? (
            <AcceptOrReport
              orderId={d.order.id}
              reference={d.order.reference}
              supplier={d.supplierName}
              organisationId={page.buyer.organisationId}
              held={rupees(held)}
            />
          ) : null}

          {dispute ? (
            <Card title={`Problem reported · ${dispute.reference}`} className="w-full">
              <StatusBadge status={dispute.status} tone={dispute.status === "Resolved" ? "success" : "warning"} />
              <Rows
                rows={[
                  ["What went wrong", dispute.reason],
                  ["Details", dispute.details],
                  ...(dispute.wantedFix ? ([["What would fix it", dispute.wantedFix]] as [string, string][]) : []),
                  ["Held", rupees(dispute.disputedPaise)],
                  ...(dispute.acceptedPaise > 0n
                    ? ([["Accepted and released", rupees(dispute.acceptedPaise)]] as [string, string][])
                    : []),
                ]}
              />
              {dispute.supplierReply ? (
                <div className="flex flex-col gap-1 rounded-card bg-subtle p-4">
                  <p className="type-label">
                    {d.supplierName}&apos;s response
                    {dispute.offer === "partial_refund" && dispute.offerRefundPaise
                      ? ` · offers a refund of ${rupees(dispute.offerRefundPaise)}`
                      : dispute.offer === "replace"
                        ? " · will replace or repair at their cost"
                        : dispute.offer === "disagree"
                          ? " · disagrees"
                          : ""}
                  </p>
                  <p className="type-body-sm text-body">{dispute.supplierReply}</p>
                </div>
              ) : dispute.status === "Open" ? (
                <p className="type-body-sm text-body">{d.supplierName} has 2 working days to reply.</p>
              ) : null}
              {dispute.status === "Under review" ? (
                <p className="type-body-sm text-body">
                  H2 India is reviewing the evidence and will decide within 5 working days.
                </p>
              ) : null}
              {dispute.status === "Resolved" ? (
                <p className="type-body-sm text-body">Decided: {dispute.decisionNote}</p>
              ) : null}
              {canPlace && (dispute.status === "Open" || dispute.status === "Supplier replied") ? (
                <OfferActions
                  orderId={d.order.id}
                  disputeId={dispute.id}
                  canAccept={dispute.status === "Supplier replied" && dispute.offer !== "disagree"}
                />
              ) : null}
            </Card>
          ) : null}

          {d.refunds.length ? (
            <Card title="Refunds" className="w-full">
              {d.refunds.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 border-t border-default pt-3">
                  <span className="type-spec">{r.reference}</span>
                  <span className="type-body-sm">{rupees(r.amountPaise)}</span>
                  <StatusBadge
                    status={r.status}
                    tone={r.status === "Refunded" ? "success" : r.status === "Failed" ? "error" : "progress"}
                  />
                  <span className="type-caption text-secondary">
                    {r.status === "Refunded" && r.confirmedAt
                      ? `Back in your account ${formatIstDate(r.confirmedAt)}`
                      : "Usually 5 to 7 working days to reach your bank"}
                  </span>
                </div>
              ))}
            </Card>
          ) : null}

          {d.status === "Declined" ? (
            <Card title={`${d.supplierName} declined this order`} className="w-full">
              <p className="type-body-sm text-body">“{d.order.declineReason}”</p>
              <Link href="/rfq/new" className={`${buttonClasses({ variant: "outline" })} self-start`}>
                Request quotes again
              </Link>
            </Card>
          ) : null}
          {d.status === "Cancelled" ? (
            <Card title="This order was cancelled" className="w-full">
              <p className="type-body-sm text-body">{d.order.cancelReason}</p>
            </Card>
          ) : null}

          <Card title="Items" className="w-full">
            {d.lines.map((l) => (
              <div key={l.id} className="flex gap-3 border-t border-default pt-3 type-body-sm">
                <span className="flex-1">
                  {l.description} × {l.quantity}
                </span>
                <span className="type-spec">{rupees(l.unitPricePaise * BigInt(l.quantity))}</span>
              </div>
            ))}
            <div className="flex border-t border-default pt-3 type-body-sm">
              <span className="flex-1 text-body">GST</span>
              <span className="type-spec">{rupees(d.order.gstPaise)}</span>
            </div>
            {d.order.freightPaise > 0n ? (
              <div className="flex type-body-sm">
                <span className="flex-1 text-body">Freight</span>
                <span className="type-spec">{rupees(d.order.freightPaise)}</span>
              </div>
            ) : null}
            <div className="flex border-t border-default pt-3 type-label">
              <span className="flex-1">Total</span>
              <span>{rupees(d.order.totalPaise)}</span>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Payments">
            <Rows
              rows={[
                ...d.milestones.map((m): [string, string] => [
                  `${milestoneWord(m.trigger)} · ${String(m.percentBps / 100)}%`,
                  `${rupees(m.amountPaise)} · ${m.status === "Paid" ? "paid" : m.status === "Upcoming" ? "later" : m.dueAt ? `due ${formatIstDate(m.dueAt)}` : "due"}`,
                ]),
                ["Paid so far", rupees(paid)],
                ["Held in escrow", rupees(held)],
              ]}
            />
          </Card>
          <Card title="Delivery and billing">
            <Rows
              rows={[
                ["Deliver to", d.site ?? ""],
                ["Receiving contact", d.order.receiverName ?? ""],
                ["Bill to GSTIN", d.gstin ?? ""],
                [
                  "Dispatch date",
                  d.order.dispatchBy ? formatIstDate(d.order.dispatchBy) : "Set when the supplier confirms",
                ],
              ]}
            />
            {pendingDate ? (
              <p className="type-caption text-secondary">
                You asked to move it to {formatIstDate(pendingDate.toDate)}; waiting for {d.supplierName}.
              </p>
            ) : canPlace && ["Accepted", "Awaiting payment", "Ready to dispatch"].includes(d.status) ? (
              <RequestDate
                orderId={d.order.id}
                supplier={d.supplierName}
                current={d.order.dispatchBy ? formatIstDate(d.order.dispatchBy) : null}
              />
            ) : null}
          </Card>
          {docs.length ? (
            <Card title="Documents">
              <ul className="flex flex-col gap-2">
                {docs.map((x) => (
                  <li key={x.id}>
                    <a
                      href={`/api/v1/files/${x.id}/link`}
                      className="inline-flex items-center gap-2 type-body-sm underline"
                    >
                      <Icon name="file-text" size={16} />
                      {x.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {canPlace && CANCELLABLE.includes(d.status) ? (
            <CancelOrder orderId={d.order.id} reference={d.order.reference} refund={paid > 0n ? rupees(held) : null} />
          ) : null}
        </div>
      </div>
    </BuyerWorkspace>
  );
}
