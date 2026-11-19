import { isEnabled } from "@h2india/config";
import { checkoutView } from "@h2india/core/orders";
import { Stepper, type StepItem } from "@h2india/ui";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cartBuyer } from "@/cart/session";
import { CheckoutSummary } from "@/checkout/Summary";
import { BillingStep, DeliveryStep, PaymentStep, ReviewStep, type Step } from "@/checkout/Steps";
import { requireTransactionsPage } from "@/orders/guard";

// Checkout (365:27759), step 10.2: 1 Delivery (80:6431; 82:8912), 2 Billing (768:47189; 768:47559), 3 Payment
// (80:6464; 134:10078) and 4 Review (80:6687; 134:10179). Payment and Review are built without their frames (A178).
export const metadata: Metadata = { title: "Checkout · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const STEPS: { key: Step; label: string }[] = [
  { key: "delivery", label: "Delivery" },
  { key: "billing", label: "Billing" },
  { key: "payment", label: "Payment" },
  { key: "review", label: "Review" },
];

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  requireTransactionsPage();
  const sp = await searchParams;
  const me = await cartBuyer();
  if (!me) redirect("/sign-in?next=/checkout");
  const v = await checkoutView(me.db, me.actor, me.buyer.organisationId);
  if (!v.cart.supplier || !v.cart.items.some((i) => i.available)) redirect("/cart");
  const c = v.choices;
  // A step opens only when the ones before it are done. The receiver's mobile counts only while the `mobileFields`
  // switch is on (founder, 19 Nov 2026); off, a receiver's name is enough.
  const contact = v.mobileFields ? Boolean(c.receiverMobile) : Boolean(c.receiverName);
  const ready: Record<Step, boolean> = {
    delivery: true,
    billing: Boolean(c.deliverySiteId && contact),
    payment: Boolean(c.deliverySiteId && contact && c.billingGstinId),
    review: Boolean(c.deliverySiteId && contact && c.billingGstinId && c.paymentMethod),
  };
  const wanted = STEPS.find((s) => s.key === sp.step)?.key ?? "delivery";
  const step = ready[wanted] ? wanted : (STEPS.filter((s) => ready[s.key]).pop()?.key ?? "delivery");
  const at = STEPS.findIndex((s) => s.key === step);
  const steps: StepItem[] = STEPS.map((s, i) => ({
    label: s.label,
    status: i < at ? "complete" : i === at ? "current" : "upcoming",
  }));
  return (
    <main className="bg-subtle">
      <div className="mx-auto flex max-w-310 flex-col gap-6 px-4 py-10 md:px-8 md:py-14">
        <h1 className="type-h1">Checkout</h1>
        <Stepper steps={steps} className="max-md:hidden" />
        <p className="type-label text-secondary md:hidden">
          Step {at + 1} of 4 · {STEPS[at]?.label}
        </p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_314px]">
          <div className="flex flex-col gap-4">
            {step === "delivery" ? <DeliveryStep v={v} /> : null}
            {step === "billing" ? <BillingStep v={v} organisationId={me.buyer.organisationId} /> : null}
            {step === "payment" ? (
              <PaymentStep v={v} payLater={isEnabled("payLater")} letterOfCredit={isEnabled("letterOfCredit")} />
            ) : null}
            {step === "review" ? <ReviewStep v={v} /> : null}
          </div>
          <CheckoutSummary v={v} />
        </div>
      </div>
    </main>
  );
}
