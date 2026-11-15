"use server";

import { addToCart, OrderError, OtherSupplierInCart, setCartQuantity } from "@h2india/core/orders";
import { revalidatePath } from "next/cache";
import { cartBuyer } from "./session";

// Cart actions (step 10.2). The company is the signed-in person's buyer company; prices are never sent.

export type CartResult = { ok: true } | { ok: false; error: string; otherSupplier?: string };

export async function removeCartItemAction(itemId: string): Promise<CartResult> {
  const me = await cartBuyer();
  if (!me) return { ok: false, error: "Sign in again." };
  await setCartQuantity(me.db, me.actor, me.buyer.organisationId, { itemId, quantity: 0 });
  revalidatePath("/cart");
  return { ok: true };
}

export async function addToCartAction(productId: string, quantity: number, replace = false): Promise<CartResult> {
  const me = await cartBuyer();
  if (!me) return { ok: false, error: "Sign in again." };
  try {
    await addToCart(me.db, me.actor, me.buyer.organisationId, { productId, quantity, replace });
  } catch (error) {
    if (error instanceof OtherSupplierInCart)
      return { ok: false, error: error.message, otherSupplier: error.supplierName };
    if (error instanceof OrderError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/cart");
  return { ok: true };
}
