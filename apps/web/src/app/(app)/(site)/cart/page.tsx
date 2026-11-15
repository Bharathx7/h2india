import { Money } from "@h2india/core";
import { viewCart } from "@h2india/core/orders";
import { ArrowLink, Alert, EmptyState, buttonClasses, VerifiedBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutButton, RemoveItem, ReplaceCart } from "@/cart/CartControls";
import { cartBuyer } from "@/cart/session";
import { requireTransactionsPage } from "@/orders/guard";

// Cart (80:5973; phones 82:8772), step 10.2: fixed-price items from one supplier, priced from the product records
// now. Turn this cart into a quote request opens the RFQ wizard with the items.
export const metadata: Metadata = { title: "Cart · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

const rupees = (p: bigint) => Money.format(p);

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ other?: string; product?: string; problem?: string }>;
}) {
  requireTransactionsPage();
  const sp = await searchParams;
  const me = await cartBuyer();
  if (!me) redirect("/sign-in?next=/cart");
  const cart = await viewCart(me.db, me.actor, me.buyer.organisationId);
  const live = cart.items.filter((i) => i.available);
  const units = (n: number) => `${String(n)} ${n === 1 ? "unit" : "units"}`;
  return (
    <main className="bg-subtle">
      <div className="mx-auto flex max-w-310 flex-col gap-6 px-4 py-10 md:px-8 md:py-14">
        <h1 className="type-h1">Cart</h1>
        {sp.other && sp.product ? <ReplaceCart other={sp.other} product={sp.product} /> : null}
        {sp.problem ? <Alert tone="error" title={sp.problem} /> : null}
        {!cart.supplier || cart.items.length === 0 ? (
          <div className="rounded-card border border-default bg-page">
            <EmptyState
              title="Your cart is empty"
              action={
                <Link href="/marketplace" className={buttonClasses({})}>
                  Browse the marketplace
                </Link>
              }
            >
              Add fixed-price products from their pages. For anything else, request a quote.
            </EmptyState>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_334px]">
            <div className="flex flex-col gap-3">
              <section className="overflow-hidden rounded-card border border-default bg-page">
                <header className="flex flex-wrap items-center gap-3 border-b border-default px-5 py-4">
                  <h2 className="type-label-lg">{cart.supplier.name}</h2>
                  {cart.supplier.verified ? <VerifiedBadge kind="supplier" /> : null}
                  {cart.supplier.city || cart.supplier.state ? (
                    <span className="ml-auto type-caption text-secondary max-md:hidden">
                      Ships from {[cart.supplier.city, cart.supplier.state].filter(Boolean).join(", ")}
                    </span>
                  ) : null}
                </header>
                <ul>
                  {cart.items.map((i) => (
                    <li
                      key={i.id}
                      className="flex items-center gap-4 border-b border-default px-5 py-5 last:border-b-0"
                    >
                      <span className="size-14 shrink-0 rounded-control bg-mint max-md:hidden" aria-hidden="true" />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <Link href={`/marketplace/products/${i.slug}`} className="type-label-lg hover:underline">
                          {i.name}
                        </Link>
                        <p className="type-caption text-secondary">
                          {i.available
                            ? `Fixed price${i.minOrder ? ` · MOQ ${String(i.minOrder)}` : ""}`
                            : "No longer available at a fixed price"}
                          <span className="md:hidden"> · {units(i.quantity)}</span>
                        </p>
                        <RemoveItem itemId={i.id} name={i.name} />
                      </div>
                      <span className="type-body-sm text-body max-md:hidden">{units(i.quantity)}</span>
                      <span className="type-spec">{rupees(i.unitPricePaise * BigInt(i.quantity))}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <p className="type-caption text-secondary">
                Your cart holds items from one supplier at a time, so each order gets one GST invoice.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
                <h2 className="type-h3">Order summary</h2>
                <dl className="flex flex-col gap-3 type-body-sm">
                  <div className="flex">
                    <dt className="flex-1 text-body">
                      {live.length} {live.length === 1 ? "item" : "items"}
                    </dt>
                    <dd className="type-spec">{rupees(cart.subtotalPaise)}</dd>
                  </div>
                  <div className="flex">
                    <dt className="flex-1 text-body">Subtotal</dt>
                    <dd className="type-spec">{rupees(cart.subtotalPaise)}</dd>
                  </div>
                  {cart.gst.map((g) => (
                    <div key={g.label} className="flex">
                      <dt className="flex-1 text-body">{g.label}</dt>
                      <dd className="type-spec">{rupees(g.paise)}</dd>
                    </div>
                  ))}
                  {cart.freightPaise > 0n ? (
                    <div className="flex">
                      <dt className="flex-1 text-body">Shipping</dt>
                      <dd className="type-spec">{rupees(cart.freightPaise)}</dd>
                    </div>
                  ) : null}
                  <div className="flex items-baseline border-t border-default pt-4">
                    <dt className="flex-1 type-label">Total</dt>
                    <dd className="type-h3">{rupees(cart.totalPaise)}</dd>
                  </div>
                </dl>
                <p className="type-caption text-secondary">
                  Sold by {cart.supplier.legalName}
                  {cart.supplier.city ? `, ${cart.supplier.city}` : ""}
                  {cart.supplier.gstin ? ` (GSTIN ${cart.supplier.gstin})` : ""}. The GST invoice is issued in your
                  company&apos;s name.
                </p>
              </section>
              <div className="max-md:sticky max-md:bottom-0 max-md:-mx-4 max-md:border-t max-md:border-default max-md:bg-page max-md:p-4">
                <CheckoutButton
                  disabled={live.length === 0}
                  label={
                    <>
                      Proceed to checkout<span className="md:hidden"> · {rupees(cart.totalPaise)}</span>
                    </>
                  }
                />
              </div>
              <ArrowLink href={`/rfq/new?products=${live.map((i) => i.productId).join(",")}&from=cart`}>
                Turn this cart into a quote request
              </ArrowLink>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
