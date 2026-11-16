import { getDb, Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { orderDetail } from "@h2india/core/orders";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { Alert, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApprovePanel } from "@/buyer/orders/Panels";
import { BuyerWorkspace, requireBuyer } from "@/buyer/shell";
import { requireTransactionsPage } from "@/orders/guard";

// Approve order (806:14572; phones 806:14918) with Confirm it's you (744:29031), step 10.3. Nobody approves their own
// order; the server checks the route, the passkey and an expired quote again (G4). Built without its frame (A178).
export const metadata: Metadata = { title: "Approve order · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const rupees = (p: bigint) => Money.format(p);

export default async function ApproveOrderPage({ params }: { params: Promise<{ id: string }> }) {
  requireTransactionsPage();
  const { id } = await params;
  const page = await requireBuyer(`/buyer/orders/${id}/approve`);
  const d = await orderDetail(scopeFor(page.actor), getDb(), id);
  if (!d || d.order.buyerOrganisationId !== page.buyer.organisationId) notFound();
  const own = d.order.placedBy === page.userId;
  return (
    <BuyerWorkspace page={page} current="/buyer/orders">
      <Link href={`/buyer/orders/${d.order.id}`} className="inline-flex items-center gap-2 self-start type-label">
        <Icon name="arrow-left" size={16} />
        {d.order.reference}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="type-h2">Approve order {d.order.reference}</h1>
        <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
          <StatusBadge status={d.status} tone={d.badge.tone} />
          {d.placedByName} asked on {formatIstDateTime(d.order.createdAt)}
        </p>
      </div>
      {d.status !== "Awaiting approval" ? (
        <Alert tone="info" title="This order doesn't need your approval now" />
      ) : own ? (
        <Alert tone="warning" title="You placed this order, so someone else must approve it" />
      ) : !page.buyer.seat.permissions.has("order.approve") ? (
        <Alert tone="warning" title="Your role can't approve orders" />
      ) : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">What is being ordered</h2>
          {d.lines.map((l) => (
            <div key={l.id} className="flex gap-3 border-t border-default pt-3 type-body-sm">
              <span className="flex-1">
                {l.description} × {l.quantity}
              </span>
              <span className="type-spec">{rupees(l.unitPricePaise * BigInt(l.quantity))}</span>
            </div>
          ))}
          <div className="flex border-t border-default pt-3 type-label">
            <span className="flex-1">Total incl. GST</span>
            <span>{rupees(d.order.totalPaise)}</span>
          </div>
          <dl className="mt-2 flex flex-col gap-2 type-body-sm">
            {(
              [
                ["Supplier", d.supplierName],
                ["Deliver to", d.site ?? ""],
                ["Bill to GSTIN", d.gstin ?? ""],
                [
                  "Payment",
                  d.milestones.map((m) => `${String(m.percentBps / 100)}% ${m.trigger.toLowerCase()}`).join(", "),
                ],
                ["Placed", formatIstDate(d.order.createdAt)],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="flex gap-4">
                <dt className="w-32 shrink-0 type-caption text-secondary">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        {d.status === "Awaiting approval" && !own && page.buyer.seat.permissions.has("order.approve") ? (
          <ApprovePanel orderId={d.order.id} requester={d.placedByName} />
        ) : null}
      </div>
    </BuyerWorkspace>
  );
}
