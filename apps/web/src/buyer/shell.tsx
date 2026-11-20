import { getDb } from "@h2india/core";
import { loadActor, type Actor } from "@h2india/core/authz";
import { buyerOf, type BuyerContext } from "@h2india/core/buyer";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/server/auth";

// The buyer workspace (Figma page 13, Stage 9): Workspace sidebar v2, buyer variant, with Request a quote in the top
// bar. Orders and payments are left out while transactions are off.

export interface BuyerPage {
  userId: string;
  actor: Actor;
  buyer: BuyerContext;
}

export async function requireBuyer(path: string): Promise<BuyerPage> {
  const session = await getSession();
  if (!session) redirect(`/buyer/sign-in?next=${encodeURIComponent(path)}`);
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  const buyer = await buyerOf(db, actor);
  if (!buyer) redirect("/join/buyer");
  return { userId: session.user.id, actor, buyer };
}

/** A buyer page's content area. The frame (sidebar, Request a quote) is drawn by the buyer layout (BuyerFrame). */
export function BuyerWorkspace({ children }: { page: BuyerPage; current?: string; children: ReactNode }) {
  return <div className="flex flex-col gap-6 p-4 md:p-8">{children}</div>;
}
