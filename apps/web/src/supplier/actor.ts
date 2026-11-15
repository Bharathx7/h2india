import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { supplierOf } from "@h2india/core/supplier";
import { getSession } from "@/server/auth";

/**
 * The signed-in person and their own supplier company, for supplier server actions (Stage 8). Nothing takes a
 * company id from the form. Kept out of the "use server" files so it isn't itself callable from the browser
 * (step 12.1 route inventory).
 */
export async function supplierActor() {
  const session = await getSession();
  if (!session) throw new Error("Sign in again.");
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  const supplier = await supplierOf(db, actor);
  if (!supplier) throw new Error("This account has no supplier company.");
  return { db, actor, supplier };
}
