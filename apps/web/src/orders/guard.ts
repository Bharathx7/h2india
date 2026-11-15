import { isEnabled } from "@h2india/config";
import { notFound } from "next/navigation";

/**
 * Every cart, checkout, order and payment page (Stage 10): with `transactions` off the page doesn't exist (404).
 * Core functions check the flag and the pilot list again on every action; hiding a page is never the only guard.
 */
export function requireTransactionsPage(): void {
  if (!isEnabled("transactions")) notFound();
}
