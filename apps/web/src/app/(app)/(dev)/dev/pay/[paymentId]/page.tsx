import { getDb, Money } from "@h2india/core";
import { simCheckoutFacts } from "@h2india/core/orders";
import { Alert, Button } from "@h2india/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { finishCheckout } from "./actions";

// Test pay page of the simulated payment partner (A176). It stands in for the partner's hosted checkout (792:15399)
// until M3 is connected: no money moves, and whatever is chosen here reaches the order as a signed webhook.
export const metadata: Metadata = { title: "Simulated checkout · H2 India" };

const METHOD: Record<string, string> = { upi: "UPI", card: "Card", netbanking: "Net banking" };

export default async function SimulatedCheckout({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const facts = await simCheckoutFacts(getDb(), paymentId);
  if (!facts) notFound();
  const action = finishCheckout.bind(null, paymentId);
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-6 md:p-10">
      <header className="flex flex-col gap-2">
        <p className="type-eyebrow text-secondary">Simulated payment partner</p>
        <h1 className="type-h2">Pay {Money.format(facts.amountPaise)}</h1>
        <p className="type-body text-body">
          {facts.reference} · {METHOD[facts.method] ?? facts.method}
        </p>
      </header>
      <Alert tone="warning" title="Test checkout">
        No money moves. Choose what the bank does; H2 India hears about it by webhook, as it will from the real partner.
      </Alert>
      {facts.status !== "Pending" ? (
        <p className="type-body text-body">This payment is already {facts.status.toLowerCase()}.</p>
      ) : (
        <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button type="submit" name="outcome" value="succeed">
            Payment succeeds
          </Button>
          <Button type="submit" name="outcome" value="fail" variant="secondary">
            Bank declines
          </Button>
          <Button type="submit" name="outcome" value="pending" variant="secondary">
            Stays pending
          </Button>
          <Button type="submit" name="outcome" value="timeout" variant="secondary">
            Times out
          </Button>
        </form>
      )}
    </main>
  );
}
