"use server";

import { getDb } from "@h2india/core";
import { saveCompareList } from "@h2india/core/products";
import { getSession } from "@/server/auth";

/** Keeps a signed-in person's compare selection on the server too (step 6.5), so it follows them between browsers. */
export async function saveCompareAction(productIds: string[]): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await saveCompareList(getDb(), session.user.id, productIds);
}
