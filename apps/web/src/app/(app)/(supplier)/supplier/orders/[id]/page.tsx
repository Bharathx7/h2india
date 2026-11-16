import { getDb, Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import {
  checklistFor,
  itemsLeft,
  orderDetail,
  rateCardFor,
  ratingOf,
  settle,
  type OrderDetail,
} from "@h2india/core/orders";
import { formatIstDate, formatIstDateTime, formatIstDayMonth } from "@h2india/core/time";
import { Alert, buttonClasses, Icon, StatusBadge, Stepper, type StepItem } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireTransactionsPage } from "@/orders/guard";
import { milestoneWord } from "@/orders/views";
import {
  AcceptDecline,
  DateRequest,
  DispatchChecklist,
  DisputeResponse,
  ProofOfDelivery,
} from "@/supplier/orders/Panels";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Supplier order (step 10.7 to 10.10): accept or decline (693:8), awaiting payment (811:12584), dispatch checklist
// (693:814), in transit and delivered (693:814 Delivery status), dispute open (813:12602).
export const metadata: Metadata = { title: "Order · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const rupees = (p: bigint) => Money.format(p);
const istInput = (d: Date) => new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

function Card({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section
      className={`flex flex-col gap-2 self-start rounded-card border border-default bg-page p-5 ${className ?? ""}`}
    >
      {title ? <h2 className="pb-1 type-h4">{title}</h2> : null}
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="flex flex-col gap-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-4 max-md:flex-col max-md:gap-0.5">
          <dt className="w-35 shrink-0 type-caption text-secondary">{k}</dt>
          <dd className="type-body-sm">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Summary({ d }: { d: OrderDetail }) {
  const rate = d.lines[0]?.gstRateBps;
  return (
    <Card title="Order summary" className="w-full">
      {d.lines.map((l) => (
        <div key={l.id} className="flex items-center gap-3 border-t border-default py-3">
          <Icon name="package" size={24} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="type-label">
              {l.description} × {l.quantity}
            </p>
            <p className="type-caption text-secondary">
              {d.order.source === "cart" ? "fixed price" : "quoted"} {rupees(l.unitPricePaise)} each
            </p>
          </div>
          <p className="type-label">{rupees(l.unitPricePaise * BigInt(l.quantity))}</p>
        </div>
      ))}
      <div className="flex border-t border-default py-2 type-body-sm">
        <span className="flex-1 text-body">
          GST{rate !== undefined && d.lines.every((l) => l.gstRateBps === rate) ? ` ${String(rate / 100)}%` : ""}
        </span>
        <span>{rupees(d.order.gstPaise)}</span>
      </div>
      {d.order.freightPaise > 0n ? (
        <div className="flex border-t border-default py-2 type-body-sm">
          <span className="flex-1 text-body">Shipping</span>
          <span>{rupees(d.order.freightPaise)}</span>
        </div>
      ) : null}
      <div className="flex border-t border-default py-2 type-label">
        <span className="flex-1">Total the buyer pays</span>
        <span>{rupees(d.order.totalPaise)}</span>
      </div>
    </Card>
  );
}

function deliverySteps(d: OrderDetail): StepItem[] {
  const s = d.status;
  const shipped = d.shipment?.shippedAt;
  const order = ["Ready to dispatch", "Shipped", "Delivered", "Accepted by buyer", "Closed"];
  const at = order.indexOf(s);
  const status = (i: number, done: boolean): StepItem["status"] =>
    done ? "complete" : i === at ? "current" : "upcoming";
  return [
    {
      label: "Ready to dispatch",
      status: status(0, Boolean(shipped)),
      detail: d.order.dispatchBy ? `Ship by ${formatIstDate(d.order.dispatchBy)}` : undefined,
    },
    {
      label: "In transit",
      status: status(1, Boolean(d.shipment?.podAt)),
      detail: shipped
        ? `${d.shipment?.transporter ?? ""} · LR ${d.shipment?.lrNumber ?? ""}`
        : "After you mark it shipped",
    },
    {
      label: "Delivered",
      status: d.shipment?.podAt ? "complete" : "upcoming",
      detail: d.shipment?.podAt
        ? `Proof of delivery uploaded ${formatIstDayMonth(d.shipment.podAt)}`
        : "Proof of delivery uploaded",
    },
    {
      label: "Delivery code confirmed",
      status: d.receipt ? "complete" : d.shipment?.podAt ? "current" : "upcoming",
      detail: d.receipt
        ? `${d.receipt.condition} · ${formatIstDateTime(d.receipt.at)}`
        : `${d.buyerName}'s receiving contact enters the SMS code`,
    },
    {
      label: "Accepted",
      status: s === "Accepted by buyer" || s === "Closed" ? "complete" : "upcoming",
      detail: "Buyer accepts within 5 working days. Payout follows 2 working days later.",
    },
  ];
}

export default async function SupplierOrderPage({ params }: { params: Promise<{ id: string }> }) {
  requireTransactionsPage();
  const { id } = await params;
  const page = await requireSupplier(`/supplier/orders/${id}`);
  const s = page.supplier;
  const db = getDb();
  const d = await orderDetail(scopeFor(page.actor), db, id);
  if (!d || d.order.supplierOrganisationId !== s.organisationId) notFound();
  const canManage = s.seat.permissions.has("order.manage");
  const item = d.lines[0];
  const summary = `${item ? `${item.description} × ${String(item.quantity)}` : ""}${d.lines.length > 1 ? ` + ${String(d.lines.length - 1)} more` : ""}`;
  const pendingDate = d.dateChanges.find((c) => c.status === "Requested");
  const dispute = d.disputes.find((x) => x.status !== "Resolved") ?? null;
  const advance = d.milestones[0];
  const balance = d.milestones.find((m) => m.trigger === "Before dispatch");
  const exGst = d.order.subtotalPaise + d.order.freightPaise;
  const card = await rateCardFor(db, d.order.acceptedAt ?? new Date());
  const fee = settle({
    card,
    releasedPaise: d.order.totalPaise,
    orderTotalPaise: d.order.totalPaise,
    orderExGstPaise: exGst,
    acceptedAt: d.order.acceptedAt ?? new Date(),
    supplierId: s.organisationId,
  });
  const fullFee = settle({
    card: { ...card, launchOfferFrom: null, launchOfferTo: null },
    releasedPaise: d.order.totalPaise,
    orderTotalPaise: d.order.totalPaise,
    orderExGstPaise: exGst,
    acceptedAt: new Date(),
    supplierId: s.organisationId,
  });
  const uncapped = Money.percent(exGst, card.feeBps);
  const { items } = await checklistFor(db, d.order, d.buyerName);
  const rating = await ratingOf(db, d.order.id);
  const left = itemsLeft(items);
  const paidForDispatch = d.milestones
    .filter((m) => m.trigger !== "On receipt" && m.trigger !== "Retention")
    .every((m) => m.status === "Paid");

  const title =
    d.status === "Pending acceptance" ? `New order ${d.order.reference}` : `${d.order.reference} · ${d.buyerName}`;
  const meta =
    d.status === "Pending acceptance"
      ? `Placed ${formatIstDateTime(d.order.createdAt)} by ${d.buyerName}${d.acceptBy ? ` · reply ${d.overdue ? "was " : ""}due ${formatIstDateTime(d.acceptBy)}` : ""}`
      : [
          d.order.acceptedAt ? `Accepted ${formatIstDate(d.order.acceptedAt)}` : null,
          d.order.deliveredAt ? `Delivered ${formatIstDate(d.order.deliveredAt)}` : null,
          summary,
          `${rupees(d.order.totalPaise)} incl. GST`,
        ]
          .filter(Boolean)
          .join(" · ");
  const hoursLate = d.acceptBy ? Math.max(1, Math.round((new Date().getTime() - d.acceptBy.getTime()) / 3_600_000)) : 0;

  return (
    <SupplierShell page={page} current="/supplier/orders" title="Orders">
      <Link href="/supplier/orders" className="inline-flex items-center gap-2 self-start type-label">
        <Icon name="arrow-left" size={16} />
        Orders
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="type-h2">{title}</h1>
        <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
          {d.status === "Pending acceptance" && d.overdue ? (
            <StatusBadge status={`Overdue by ${String(hoursLate)} hours`} tone="error" />
          ) : (
            <StatusBadge status={d.status} tone={d.badge.tone} />
          )}
          {meta}
        </p>
      </div>

      {d.status === "Pending acceptance" && d.overdue ? (
        <Alert tone="warning" title="Reply now. This order is past the 48-hour window.">
          Late replies lower {s.tradeName}&apos;s acceptance rate, which buyers see on your storefront.
        </Alert>
      ) : null}
      {pendingDate ? (
        <DateRequest orderId={d.order.id} requestId={pendingDate.id}>
          From {d.order.dispatchBy ? formatIstDate(d.order.dispatchBy) : "the agreed date"} to{" "}
          {formatIstDate(pendingDate.toDate)}: “{pendingDate.reason}”. If you agree, the balance due date moves with it.
        </DateRequest>
      ) : null}

      {d.status === "Pending acceptance" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex flex-col gap-4">
            <Summary d={d} />
            <Card title="Delivery and buyer" className="w-full">
              <Rows
                rows={[
                  ["Buyer", `${d.buyerName}${d.gstin ? " · verified GSTIN" : ""}`],
                  ["Deliver to", d.site ?? "Shared after you accept"],
                  [
                    "Receiving contact",
                    `${d.order.receiverName ?? "The buyer's site"} · gets the delivery code by SMS`,
                  ],
                  ["Payment", "Buyer pays into escrow after you accept. Dispatch only once payment shows as received."],
                ]}
              />
            </Card>
          </div>
          {canManage ? (
            <AcceptDecline
              orderId={d.order.id}
              reference={d.order.reference}
              value={`${rupees(exGst)} before GST`}
              buyerContact={d.placedByName}
              defaultDate={d.order.dispatchBy ? istInput(d.order.dispatchBy) : ""}
              shipsIn={null}
            />
          ) : null}
        </div>
      ) : null}

      {d.status === "Awaiting payment" || d.status === "Accepted" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Card
            title={`Waiting for ${d.buyerName}'s ${advance && d.milestones.length > 1 ? "advance" : "payment"}`}
            className="w-full"
          >
            {advance ? (
              <p className="type-body text-body">
                The {String(advance.percentBps / 100)}% {milestoneWord(advance.trigger).toLowerCase()} of{" "}
                {rupees(advance.amountPaise)} is due
                {advance.dueAt ? ` by ${formatIstDate(advance.dueAt)}` : ""} into this order&apos;s escrow account.
                {balance ? " Start production planning; don't dispatch until the balance is paid." : ""}
              </p>
            ) : null}
            <Rows
              rows={[
                ...d.milestones.map((m): [string, ReactNode] => [
                  `${milestoneWord(m.trigger)} · ${String(m.percentBps / 100)}%`,
                  `${rupees(m.amountPaise)} · ${m.status === "Paid" ? "paid" : m.dueAt ? `due ${formatIstDate(m.dueAt)}` : m.trigger === "Before dispatch" ? "due before dispatch" : `due ${m.trigger.toLowerCase()}`}${m.status === "Due" ? " · not paid yet" : ""}`,
                ]),
                [
                  "You receive",
                  d.milestones.length > 1
                    ? "The advance 2 working days after the buyer pays it into escrow; the rest 2 working days after the buyer accepts the delivery. Minus TCS and TDS."
                    : "2 working days after the buyer accepts the delivery, minus TCS and TDS.",
                ],
              ]}
            />
            <div className="mt-2 flex flex-col gap-2 rounded-card bg-subtle p-5">
              <p className="type-label">H2 Economy fee for this order</p>
              {(
                [
                  [`${String(card.feeBps / 100)}% of ${rupees(exGst)} (before GST)`, rupees(uncapped)],
                  ...(card.feeCapPaise && uncapped > BigInt(card.feeCapPaise)
                    ? [["Capped at", rupees(BigInt(card.feeCapPaise))]]
                    : []),
                  [`GST on fee (${String(card.gstOnFeeBps / 100)}%)`, rupees(fullFee.gstOnFeePaise)],
                  ...(fee.launchOffer
                    ? [["Launch offer", `− ${rupees(fullFee.feePaise + fullFee.gstOnFeePaise)}`]]
                    : []),
                  ["You pay", rupees(fee.feePaise + fee.gstOnFeePaise)],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex type-body-sm">
                  <span className="flex-1 text-body">{k}</span>
                  <span className="type-spec">{v}</span>
                </div>
              ))}
              {fee.launchOffer && card.launchOfferTo ? (
                <p className="type-caption text-secondary">
                  No H2 Economy fee until {formatIstDate(new Date(`${card.launchOfferTo}T00:00:00+05:30`))} under the
                  launch offer.
                </p>
              ) : card.sample ? (
                <p className="type-caption text-secondary">Sample rate card; figures confirmed before launch.</p>
              ) : null}
            </div>
          </Card>
          <Card title="Buyer and delivery">
            <Rows
              rows={[
                ["Buyer", `${d.buyerName}${d.gstin ? ` · GSTIN ${d.gstin}` : ""}`],
                ["Deliver to", d.site ?? ""],
                ["Receiving contact", `${d.order.receiverName ?? ""} · shared after dispatch`],
                [
                  "Dispatch date",
                  d.order.dispatchBy ? formatIstDate(d.order.dispatchBy) : "Set when the balance is paid",
                ],
              ]}
            />
            <Link href={`/supplier/messages`} className={buttonClasses({ variant: "outline" }) + " mt-2 self-start"}>
              Message buyer
            </Link>
          </Card>
        </div>
      ) : null}

      {["Ready to dispatch", "Shipped", "Delivered", "Accepted by buyer", "Closed"].includes(d.status) ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {d.status === "Ready to dispatch" && canManage ? (
            <DispatchChecklist
              orderId={d.order.id}
              organisationId={s.organisationId}
              items={items}
              left={left}
              paid={paidForDispatch}
            />
          ) : d.status === "Shipped" ? (
            <Card title="In transit" className="w-full">
              <p className="type-body-sm text-body">
                {d.shipment?.transporter} · LR {d.shipment?.lrNumber}
                {d.shipment?.expectedAt ? ` · expected ${formatIstDate(d.shipment.expectedAt)}` : ""}. When it reaches{" "}
                {d.buyerName}, upload the signed delivery note. Their receiving contact then gets the delivery code.
              </p>
              {canManage ? (
                <span className="mt-2">
                  <ProofOfDelivery
                    orderId={d.order.id}
                    organisationId={s.organisationId}
                    reference={d.order.reference}
                    buyer={d.buyerName}
                  />
                </span>
              ) : null}
            </Card>
          ) : (
            <Summary d={d} />
          )}
          <div className="flex flex-col gap-4">
            {rating ? (
              <Card title="The buyer's rating">
                <p className="type-body-sm text-body">
                  {rating.rating} of 5{rating.comment ? ` · “${rating.comment}”` : ""}
                </p>
              </Card>
            ) : null}
            <Card title="Delivery status">
              <Stepper orientation="vertical" steps={deliverySteps(d)} />
              <p className="type-caption text-secondary">
                If the buyer reports a problem, the order moves to In dispute and the payout waits.
              </p>
            </Card>
          </div>
        </div>
      ) : null}

      {d.status === "Disputed" && dispute ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-4">
            <Alert
              tone="error"
              title={`${d.buyerName} reported a problem${dispute.status === "Open" ? "" : ` · ${dispute.status.toLowerCase()}`}`}
            >
              {dispute.reason}
              {dispute.acceptedPaise > 0n ? "; the rest was accepted" : ""}. {rupees(dispute.disputedPaise)} is held in
              escrow until you both agree or H2 Economy decides.
            </Alert>
            <Card title="What the buyer sent" className="w-full">
              <p className="type-body text-body">“{dispute.details}”</p>
              {dispute.wantedFix ? (
                <p className="type-body-sm text-body">What would fix it: {dispute.wantedFix}</p>
              ) : null}
              {dispute.photoFileIds.length ? (
                <ul className="flex flex-wrap gap-3">
                  {dispute.photoFileIds.map((f, i) => (
                    <li key={f}>
                      <a href={`/api/v1/files/${f}/link`} className="type-body-sm underline">
                        Photo {i + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {d.receipt ? (
                <p className="type-caption text-secondary">
                  Delivery confirmed with the code{d.receipt.receivedBy ? ` by ${d.receipt.receivedBy}` : ""},{" "}
                  {formatIstDateTime(d.receipt.at)}.
                </p>
              ) : null}
            </Card>
            {dispute.status === "Open" && canManage ? (
              <DisputeResponse orderId={d.order.id} disputeId={dispute.id} organisationId={s.organisationId} />
            ) : (
              <Card title="Your response" className="w-full">
                <p className="type-body-sm text-body">
                  {dispute.supplierReply ?? "H2 Economy is reviewing the evidence."}
                </p>
              </Card>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <Card title="Money on this order">
              <Rows
                rows={[
                  [
                    "Paid by buyer",
                    <span key="p" className="type-spec">
                      {rupees(
                        d.payments.filter((p) => p.status === "Succeeded").reduce((t, p) => t + p.amountPaise, 0n),
                      )}
                    </span>,
                  ],
                  [
                    "Held for the dispute",
                    <span key="h" className="type-spec">
                      {rupees(dispute.disputedPaise)}
                    </span>,
                  ],
                ]}
              />
            </Card>
            <Card title="What happens next">
              <ul className="flex list-disc flex-col gap-2 pl-5 type-body-sm">
                <li>Reply within 2 working days</li>
                <li>The buyer accepts your offer or replies</li>
                <li>No agreement: H2 Economy reviews the evidence and decides</li>
                <li>The held amount is released or refunded as agreed</li>
              </ul>
            </Card>
          </div>
        </div>
      ) : null}

      {d.status === "Declined" || d.status === "Cancelled" ? (
        <Card
          title={d.status === "Declined" ? "You declined this order" : "This order was cancelled"}
          className="w-full"
        >
          <p className="type-body-sm text-body">{d.order.declineReason ?? d.order.cancelReason ?? ""}</p>
        </Card>
      ) : null}
    </SupplierShell>
  );
}
