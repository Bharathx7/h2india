import { getDb } from "@h2india/core";
import { deliveryLink } from "@h2india/core/orders";
import { Alert, Logo } from "@h2india/ui";
import type { Metadata } from "next";
import { ReceiptForm } from "@/delivery/ReceiptForm";

// The receiving contact's page (695:13; Receipt recorded 695:110), step 10.9: no account, a single-use link from the
// SMS (668:232) and its code. Shows only the order number and items, never prices. Built without its frame (A178).
export const metadata: Metadata = { title: "Record a delivery · H2 India", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const CLOSED: Record<string, string> = {
  invalid: "This link isn't right. Open the link from the SMS again.",
  used: "This delivery was already recorded. Thank you.",
  locked: "This link is locked after too many wrong codes. H2 India will contact the buyer.",
  expired: "This link has expired. Ask the buyer to request a new code.",
};

export default async function DeliveryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await deliveryLink(getDb(), token);
  return (
    <main className="min-h-dvh bg-subtle">
      <div className="mx-auto flex max-w-120 flex-col gap-5 px-4 py-6">
        <Logo version="primary" className="h-8 w-auto self-start" />
        {link.state !== "open" ? (
          <Alert tone="info" title="Nothing to record here">
            {CLOSED[link.state]}
          </Alert>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="type-h2">Record what arrived</h1>
              <p className="type-body text-body">
                Order <span className="type-spec">{link.reference}</span>. Check the goods, then enter the code from the
                SMS.
              </p>
            </div>
            <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
              <h2 className="type-label">In this delivery</h2>
              <ul className="flex flex-col gap-1 type-body-sm text-body">
                {link.items.map((i) => (
                  <li key={`${i.description}-${String(i.quantity)}`}>
                    {i.description} × {i.quantity}
                    {i.unit === "units" ? "" : ` ${i.unit}`}
                  </li>
                ))}
              </ul>
            </section>
            <ReceiptForm token={token} reference={link.reference} />
          </>
        )}
      </div>
    </main>
  );
}
