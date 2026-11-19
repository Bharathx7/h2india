"use server";

import { checkoutView, OrderError, placeCartOrder, saveCheckout, type CheckoutChoices } from "@h2india/core/orders";
import { FlagOffError } from "@h2india/config";
import { requestContext } from "@/server/request-context";
import { cartBuyer } from "@/cart/session";

// Checkout actions (step 10.2). Each step saves its choices on the cart; Place order re-reads everything on the
// server (prices, stock, limits) and creates the order. Nothing is charged.

export type CheckoutResult =
  { ok: true; orderId?: string } | { ok: false; error: string; errors?: Record<string, string> };

export async function saveStepAction(patch: CheckoutChoices): Promise<CheckoutResult> {
  const me = await cartBuyer();
  if (!me) return { ok: false, error: "Sign in again." };
  try {
    await saveCheckout(me.db, me.actor, me.buyer.organisationId, patch);
  } catch (error) {
    if (error instanceof OrderError) return { ok: false, error: error.message, errors: error.errors };
    throw error;
  }
  return { ok: true };
}

export async function placeOrderAction(): Promise<CheckoutResult> {
  const me = await cartBuyer();
  if (!me) return { ok: false, error: "Sign in again." };
  const v = await checkoutView(me.db, me.actor, me.buyer.organisationId);
  const c = v.choices;
  // The receiver's mobile is needed only while the `mobileFields` switch is on (founder, 19 Nov 2026).
  if (
    !c.deliverySiteId ||
    !c.billingGstinId ||
    !c.receiverName ||
    (v.mobileFields && !c.receiverMobile) ||
    !c.paymentMethod
  )
    return { ok: false, error: "Some checkout steps aren't finished yet" };
  try {
    const order = await placeCartOrder(
      me.db,
      me.actor,
      me.buyer.organisationId,
      {
        deliverySiteId: c.deliverySiteId,
        billingGstinId: c.billingGstinId,
        receiverName: c.receiverName,
        receiverMobile: c.receiverMobile,
        paymentMethod: c.paymentMethod,
        poNumber: c.poNumber,
        poFileId: c.poFileId,
      },
      await requestContext(),
    );
    return { ok: true, orderId: order.id };
  } catch (error) {
    if (error instanceof OrderError) return { ok: false, error: error.message, errors: error.errors };
    if (error instanceof FlagOffError) return { ok: false, error: "This payment method isn't available yet" };
    throw error;
  }
}
