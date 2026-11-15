import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { buyerOf } from "@h2india/core/buyer";
import { getSession } from "@/server/auth";

/** The signed-in person and their buyer company, for the cart and checkout (step 10.2). Null when signed out. */
export async function cartBuyer() {
  const session = await getSession();
  if (!session) return null;
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  const buyer = await buyerOf(db, actor);
  if (!buyer) return null;
  return { db, actor, buyer, userId: session.user.id };
}
