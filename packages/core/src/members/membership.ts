import { schema, type Database, type Executor } from "@h2india/db";
import { eq } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import { hasOperatorRole } from "../authz/actor";
import { isMemberFacts, mayUseMemberFeatures, type MembershipFacts } from "./membership-rules";

// Membership on the account (founder QC, 17 Nov 2026). See membership-rules.ts for the rule.

const u = schema.users;

export async function membershipFacts(ex: Executor, userId: string): Promise<MembershipFacts> {
  const [row] = await ex
    .select({ profileType: u.profileType, memberSince: u.memberSince })
    .from(u)
    .where(eq(u.id, userId));
  return {
    profileType: row?.profileType ?? null,
    memberSince: row?.memberSince ?? null,
    operator: await hasOperatorRole(ex, userId),
  };
}

export async function isMember(ex: Executor, userId: string): Promise<boolean> {
  const [row] = await ex
    .select({ profileType: u.profileType, memberSince: u.memberSince })
    .from(u)
    .where(eq(u.id, userId));
  return row ? isMemberFacts({ profileType: row.profileType, memberSince: row.memberSince }) : false;
}

/** Whether this person may open member features (members and staff). */
export async function mayUseMember(ex: Executor, userId: string): Promise<boolean> {
  return mayUseMemberFeatures(await membershipFacts(ex, userId));
}

export class MembershipError extends Error {}

/**
 * Join as member (founder QC, 17 Nov 2026): a signed-in buyer or supplier switches membership on for their own
 * account. Someone who hasn't finished Join (no profile type) joins through /join/member instead. Audited; joining
 * twice changes nothing.
 */
export async function joinAsMember(db: Database, userId: string, context?: RequestContext): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ profileType: u.profileType, memberSince: u.memberSince })
      .from(u)
      .where(eq(u.id, userId))
      .for("update");
    if (!row) throw new MembershipError("Sign in again to continue.");
    if (!row.profileType) throw new MembershipError("Finish creating your account first.");
    if (isMemberFacts(row)) return;
    const now = new Date();
    await tx.update(u).set({ memberSince: now, updatedAt: now }).where(eq(u.id, userId));
    await audit(tx, {
      actorId: userId,
      action: "member.joined",
      resourceType: "user",
      resourceId: userId,
      before: { member: false },
      after: { member: true, profileType: row.profileType },
      context,
    });
  });
}
