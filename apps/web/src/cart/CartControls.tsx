"use client";

import { Alert, Button } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { removeCartItemAction } from "./actions";

/** Remove on a cart row (80:5973). */
export function RemoveItem({ itemId, name }: { itemId: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="self-start type-label-sm text-link hover:underline"
      onClick={() => {
        start(async () => {
          await removeCartItemAction(itemId);
          router.refresh();
        });
      }}
    >
      Remove<span className="sr-only"> {name}</span>
    </button>
  );
}

/** Adding another supplier's item asks before the cart is replaced (step 10.2 Done when). */
export function ReplaceCart({ other, product }: { other: string; product: string }) {
  return (
    <Alert
      tone="warning"
      title={`Your cart has items from ${other}`}
      action={
        <span className="flex gap-2">
          <Link href={`/cart/add?product=${encodeURIComponent(product)}&replace=1`} className="type-label underline">
            Start a new cart
          </Link>
          <Link href="/cart" className="type-label underline">
            Keep this cart
          </Link>
        </span>
      }
    >
      A cart holds items from one supplier at a time, so each order gets one GST invoice. Starting a new cart removes
      the items in it now.
    </Alert>
  );
}

export function CheckoutButton({ label, disabled }: { label: ReactNode; disabled: boolean }) {
  const router = useRouter();
  return (
    <Button
      size="lg"
      className="w-full"
      disabled={disabled}
      onClick={() => {
        router.push("/checkout");
      }}
    >
      {label}
    </Button>
  );
}
