import { Money } from "@h2india/core";
import type { CheckoutView } from "@h2india/core/orders";
import { Icon } from "@h2india/ui";

// The order summary beside every checkout step (80:6431, 768:47189) and the approver note.
const rupees = (p: bigint) => Money.format(p);

export function CheckoutSummary({ v }: { v: CheckoutView }) {
  const c = v.cart;
  const n = c.items.filter((i) => i.available).length;
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
        <h2 className="type-h3">Order summary</h2>
        <dl className="flex flex-col gap-2.5 type-body-sm">
          <div className="flex">
            <dt className="flex-1 text-body">
              {n} {n === 1 ? "item" : "items"}
            </dt>
            <dd className="type-spec">{rupees(c.subtotalPaise)}</dd>
          </div>
          <div className="flex">
            <dt className="flex-1 text-body">Subtotal</dt>
            <dd className="type-spec">{rupees(c.subtotalPaise)}</dd>
          </div>
          {c.gst.map((g) => (
            <div key={g.label} className="flex">
              <dt className="flex-1 text-body">{g.label}</dt>
              <dd className="type-spec">{rupees(g.paise)}</dd>
            </div>
          ))}
          {c.freightPaise > 0n ? (
            <div className="flex">
              <dt className="flex-1 text-body">Shipping</dt>
              <dd className="type-spec">{rupees(c.freightPaise)}</dd>
            </div>
          ) : null}
          <div className="flex items-baseline border-t border-default pt-3">
            <dt className="flex-1 type-label">Total</dt>
            <dd className="type-h3">{rupees(c.totalPaise)}</dd>
          </div>
        </dl>
        {c.supplier ? (
          <p className="type-caption text-secondary">
            Sold by {c.supplier.legalName}
            {c.supplier.city ? `, ${c.supplier.city}` : ""}
            {c.supplier.gstin ? ` (GSTIN ${c.supplier.gstin})` : ""}. The GST invoice is issued in your company&apos;s
            name.
          </p>
        ) : null}
      </section>
      {v.approval ? (
        <div className="flex gap-3 rounded-card bg-mint p-4">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-icon-link" />
          <div className="flex flex-col gap-1">
            <p className="type-label">This order needs an Approver</p>
            <p className="type-body-sm text-body">
              It is above {v.approval.ownLimit ? `your ${v.approval.ownLimit} limit` : "your company's approval limit"},
              so it goes to {v.approval.approvers[0]?.join(" or ") || "your company's approver"} before it is sent to{" "}
              {c.supplier?.name ?? "the supplier"}. We email {v.approval.approvers[0]?.[0] ?? "them"} when you place it.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
