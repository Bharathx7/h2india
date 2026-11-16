import { schema } from "@h2india/db";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { getDb } from "../db";

type Db = ReturnType<typeof getDb>;

// Signing in never creates an account (public QC 2, 16 Nov 2026): accounts come from sign-up (Join's confirm link)
// or an invitation. So an email code is sent, and accepted, only for an email that has an account or an open
// invitation to a company team.

/** Whether this email may get and use a sign-in code. `email` is already normalised. */
export async function maySignIn(db: Db, email: string): Promise<boolean> {
  const [user] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
  if (user) return true;
  const i = schema.invitations;
  const [invite] = await db
    .select({ id: i.id })
    .from(i)
    .where(and(eq(i.email, email), isNull(i.acceptedAt), isNull(i.revokedAt), gt(i.expiresAt, new Date())))
    .limit(1);
  return Boolean(invite);
}
