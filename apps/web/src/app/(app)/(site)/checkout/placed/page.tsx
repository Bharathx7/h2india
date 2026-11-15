import { Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { orderDetail } from "@h2india/core/orders";
import { buttonClasses, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cartBuyer } from "@/cart/session";
import { requireTransactionsPage } from "@/orders/guard";

// Order placed (79:5587; phones 82:9036), step 10.2: what happens next. Built without its frame (A178).
export const metadata: Metadata = { title: "Order placed · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrderPlacedPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  requireTransactionsPage();
  const sp = await searchParams;
  const me = await cartBuyer();
  if (!me) redirect("/sign-in?next=/buyer/orders");
  const d = sp.order ? await orderDetail(scopeFor(me.actor), me.db, sp.order) : null;
  if (!d || d.side !== "buyer") notFound();
  const approval = d.status === "Awaiting approval";
  const next = approval
    ? [
        "Your company's approver reviews the order. We email them now.",
        `Once approved, ${d.supplierName} has 48 hours to confirm it.`,
        "Then you pay into the order's escrow account. Nothing is charged before that.",
      ]
    : [
        `${d.supplierName} has 48 hours to confirm the order and its dispatch date.`,
        "Then you pay into the order's escrow account. We email you the payment details.",
        "The money is held until you accept the delivery.",
      ];
  return (
    <main className="bg-subtle">
      <div className="mx-auto flex max-w-180 flex-col items-center gap-6 px-4 py-14 text-center md:py-20">
        <span className="flex size-16 items-center justify-center rounded-pill bg-tint">
          <Icon name="check" size={32} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="type-h1">{approval ? "Sent for approval" : "Order placed"}</h1>
          <p className="type-body text-body">
            <span className="type-spec">{d.order.reference}</span> · {d.supplierName} ·{" "}
            {Money.format(d.order.totalPaise)} incl. GST. Nothing has been charged.
          </p>
        </div>
        <section className="flex w-full flex-col gap-3 rounded-card border border-default bg-page p-6 text-left">
          <h2 className="type-h4">What happens next</h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5 type-body-sm text-body">
            {next.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ol>
        </section>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/buyer/orders/${d.order.id}`} className={buttonClasses({})}>
            View order
          </Link>
          <Link href="/marketplace" className={buttonClasses({ variant: "outline" })}>
            Keep browsing
          </Link>
        </div>
      </div>
    </main>
  );
}
