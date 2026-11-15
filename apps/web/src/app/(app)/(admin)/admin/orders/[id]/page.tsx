import { getDb, Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { heldOn, orderDetail } from "@h2india/core/orders";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { DecideDispute, DeliveryFallback } from "@/admin/orders/Controls";
import { AdminShell, requireOperator } from "@/admin/shell";
import { requireTransactionsPage } from "@/orders/guard";

// Admin order (step 11.5): both sides, the money held, the history, the delivery fallback (G5) and the dispute
// decision (refund, release or split). Built from the design system (A178).
export const metadata: Metadata = { title: "Order · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const rupees = (p: bigint) => Money.format(p);

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5">
      <h2 className="type-h4">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  requireTransactionsPage();
  const { id } = await params;
  const { userId, actor } = await requireOperator("orders.view", `/admin/orders/${id}`);
  const db = getDb();
  const d = await orderDetail(scopeFor(actor, { operatorArea: "orders" }), db, id);
  if (!d) notFound();
  const held = await heldOn(db, d.order.id);
  const canEdit = actor.operator.has("orders.edit");
  const dispute = d.disputes.find((x) => x.status !== "Resolved") ?? d.disputes[0] ?? null;
  return (
    <AdminShell userId={userId} current="/admin/orders" title="Orders">
      <Link href="/admin/orders" className="inline-flex items-center gap-2 self-start type-label">
        <Icon name="arrow-left" size={16} />
        Orders
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="type-h2">{d.order.reference}</h1>
        <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
          <StatusBadge status={d.badge.label} tone={d.badge.tone} />
          {d.buyerName} → {d.supplierName} · {rupees(d.order.totalPaise)} · placed {formatIstDate(d.order.createdAt)}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          {dispute ? (
            <Card title={`Dispute ${dispute.reference} · ${dispute.status}`}>
              <dl className="flex flex-col gap-2 type-body-sm">
                {(
                  [
                    ["What went wrong", dispute.reason],
                    ["Details", dispute.details],
                    ["What would fix it", dispute.wantedFix ?? "—"],
                    ["Held", rupees(dispute.disputedPaise)],
                    ["Accepted and released", rupees(dispute.acceptedPaise)],
                    [
                      "Supplier's response",
                      dispute.supplierReply ? `${dispute.offer ?? ""}: ${dispute.supplierReply}` : "No reply yet",
                    ],
                    [
                      "Asked H2 India",
                      dispute.escalatedBy
                        ? `${dispute.escalatedBy}, ${dispute.escalatedAt ? formatIstDateTime(dispute.escalatedAt) : ""}`
                        : "—",
                    ],
                    ...(dispute.status === "Resolved"
                      ? ([["Decision", `${dispute.outcome ?? ""}: ${dispute.decisionNote ?? ""}`]] as [
                          string,
                          string,
                        ][])
                      : []),
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div key={k} className="flex gap-4">
                    <dt className="w-40 shrink-0 type-caption text-secondary">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {[...dispute.photoFileIds, ...dispute.supplierFileIds].length ? (
                <ul className="flex flex-wrap gap-3">
                  {[...dispute.photoFileIds, ...dispute.supplierFileIds].map((f, i) => (
                    <li key={f}>
                      <a href={`/api/v1/files/${f}/link`} className="type-body-sm underline">
                        File {i + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          ) : null}
          {canEdit && dispute && dispute.status !== "Resolved" ? (
            <DecideDispute orderId={d.order.id} disputeId={dispute.id} held={rupees(dispute.disputedPaise)} />
          ) : null}
          {canEdit && d.status === "Delivered" && !d.receipt ? <DeliveryFallback orderId={d.order.id} /> : null}
          <Card title="History">
            <ol className="flex flex-col gap-2 type-body-sm">
              {d.history.map((h) => (
                <li key={h.id} className="flex gap-3">
                  <span className="w-40 shrink-0 type-caption text-secondary">{formatIstDateTime(h.at)}</span>
                  <span>
                    {h.fromStatus ? `${h.fromStatus} → ` : ""}
                    {h.toStatus}
                    {h.reason ? ` · ${h.reason}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Money">
            <dl className="flex flex-col gap-2 type-body-sm">
              {(
                [
                  [
                    "Paid in",
                    rupees(d.payments.filter((p) => p.status === "Succeeded").reduce((t, p) => t + p.amountPaise, 0n)),
                  ],
                  ["Held in escrow", rupees(held)],
                  [
                    "Refunded",
                    rupees(d.refunds.filter((r) => r.status === "Refunded").reduce((t, r) => t + r.amountPaise, 0n)),
                  ],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex">
                  <dt className="flex-1 text-body">{k}</dt>
                  <dd className="type-spec">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Delivery">
            <p className="type-body-sm text-body">
              {d.site ?? ""} · receiving contact {d.order.receiverName ?? "—"}
              {d.shipment?.transporter ? ` · ${d.shipment.transporter}, LR ${d.shipment.lrNumber ?? ""}` : ""}
              {d.receipt ? ` · received: ${d.receipt.condition} (${d.receipt.via})` : ""}
            </p>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
