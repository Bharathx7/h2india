"use server";

import { getDb } from "@h2india/core";
import { simCheckoutFacts, simFinishCheckout } from "@h2india/core/orders";
import { loadActor } from "@h2india/core/authz";
import { isEnabled } from "@h2india/config";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";

// The simulated partner's checkout (A176): the tester chooses the outcome, which reaches H2 India only as a signed
// webhook, exactly as a real partner's would. Only someone at the paying company may finish it.
const OUTCOMES = ["succeed", "fail", "pending", "timeout"] as const;
const BACK = { succeed: "success", fail: "failed", pending: "pending", timeout: "timed-out" } as const;

export async function finishCheckout(paymentId: string, form: FormData) {
  if (process.env.NODE_ENV !== "development" && !isEnabled("devPages")) throw new Error("Not available");
  const outcome = OUTCOMES.find((x) => x === form.get("outcome"));
  if (!outcome) throw new Error("Choose an outcome");
  const db = getDb();
  const facts = await simCheckoutFacts(db, paymentId);
  if (!facts) throw new Error("No such payment");
  const session = await getSession();
  const actor = await loadActor(db, session?.user.id);
  if (!actor.companies.has(facts.buyerOrganisationId)) throw new Error("Only the buyer can finish this payment");
  await simFinishCheckout(db, paymentId, outcome);
  redirect(`/buyer/orders/${facts.orderId}?payment=${BACK[outcome]}`);
}
