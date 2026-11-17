import { schema, type Database, type Executor } from "@h2india/db";
import { eq } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import { accountDetailsProblems, type AccountDetailsInput } from "./rules";

// Account details (founder QC, 17 Nov 2026): name and job role for everyone, from /account. Email and mobile change
// only through account recovery (proof of both), so they are not here. Audited.

const u = schema.users;

export class AccountDetailsError extends Error {
  constructor(readonly problems: Partial<Record<keyof AccountDetailsInput, string>>) {
    super("Check the highlighted fields");
  }
}

export async function accountDetails(ex: Executor, userId: string) {
  const [row] = await ex
    .select({ name: u.name, email: u.email, mobile: u.mobile, jobRole: u.jobRole })
    .from(u)
    .where(eq(u.id, userId));
  return row ?? null;
}

/** Saves the person's own name and job role. The user id comes from the session, never the form. */
export async function saveAccountDetails(
  db: Database,
  userId: string,
  input: AccountDetailsInput,
  context?: RequestContext,
) {
  const problems = accountDetailsProblems(input);
  if (Object.keys(problems).length) throw new AccountDetailsError(problems);
  const next = { name: input.name.trim(), jobRole: input.jobRole };
  await db.transaction(async (tx) => {
    const [before] = await tx.select({ name: u.name, jobRole: u.jobRole }).from(u).where(eq(u.id, userId));
    if (!before) throw new AccountDetailsError({ name: "Sign in again to continue" });
    if (before.name === next.name && before.jobRole === next.jobRole) return;
    await tx.update(u).set({ name: next.name, jobRole: next.jobRole, updatedAt: new Date() }).where(eq(u.id, userId));
    await audit(tx, {
      actorId: userId,
      action: "account.details_changed",
      resourceType: "user",
      resourceId: userId,
      before,
      after: next,
      context,
    });
  });
}
