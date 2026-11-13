import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { parseServerEnv } from "@h2india/config";
import { schema, type Database, type Executor } from "@h2india/db";
import { renderBankChanged } from "@h2india/emails";
import { and, desc, eq, inArray } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { can } from "../authz/can";
import { inScope, type Scope } from "../authz/scope";
import { cancelDeadline, onDeadline, startClock } from "../clocks/clocks";
import { deliverSms } from "../notify/channels";
import { notify } from "../notify/notify";
import { passkeyConfirmedRecently } from "../sign-in/step-up";
import { formatIstDateTime } from "../time";
import { bankAdapter } from "./adapters/bank";

// Payout bank account (step 8.6; 588:222): where payout fraud happens, so every change is suspicious until the hold
// ends. A change needs a passkey confirmed in the last few minutes (step-up), is checked through the bank adapter
// (name match against the GST legal name), notifies every admin of the company by email and SMS, and holds payouts
// for the bankChangeHold clock (C5, default 72 hours). Only the last four digits are ever shown or logged.

const a = schema.payoutBankAccounts;

export class BankError extends Error {}

export { passkeyConfirmedRecently, recordPasskeyStepUp, STEP_UP_SECONDS } from "../sign-in/step-up";

// ------------------------------------------------------------------------------------------------ encryption

const key = () => createHash("sha256").update(`payout-bank:${parseServerEnv().AUTH_SECRET}`).digest();

export function sealAccount(number: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(number, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

export function openAccount(sealed: string): string {
  const [iv, tag, body] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !body) throw new Error("bad account cipher");
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}

const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// ------------------------------------------------------------------------------------------------ reads

export type BankAccount = Omit<typeof a.$inferSelect, "accountCipher">;

/** The row without the encrypted number: nothing outside this file ever gets it. */
function withoutCipher(r: typeof a.$inferSelect): BankAccount {
  const out: Partial<typeof a.$inferSelect> = { ...r };
  delete out.accountCipher;
  return out as BankAccount;
}

/** The current account, a change in progress, and the last failed check, for the page. Company-scoped. */
export async function bankState(db: Executor, scope: Scope, organisationId: string, now: Date = new Date()) {
  const rows = await db
    .select()
    .from(a)
    .where(and(inScope(scope, a.organisationId), eq(a.organisationId, organisationId)))
    .orderBy(desc(a.createdAt))
    .limit(10);
  const strip = (r: typeof a.$inferSelect | undefined): BankAccount | null => {
    if (!r) return null;
    return withoutCipher(r);
  };
  const current = strip(rows.find((r) => r.status === "Active"));
  const change = strip(rows.find((r) => r.status === "Pending" || r.status === "Held"));
  const failed = strip(rows.find((r, i) => r.status === "Failed" && i === 0));
  return {
    current,
    change,
    failed,
    payoutsHeld: Boolean(change?.status === "Held" && change.holdUntil && change.holdUntil > now),
  };
}

/** Payouts are held while a change is in its hold period (enforced by payouts, step 10.11). */
export async function payoutsHeld(db: Executor, organisationId: string, now: Date = new Date()): Promise<boolean> {
  const rows = await db
    .select({ holdUntil: a.holdUntil })
    .from(a)
    .where(and(eq(a.organisationId, organisationId), eq(a.status, "Held")));
  return rows.some((r) => r.holdUntil && r.holdUntil > now);
}

// ------------------------------------------------------------------------------------------------ the change

/** Steps 1 and 2 (588:748): the new account, checked through the bank adapter. Nothing changes for payouts yet. */
export async function addBankAccount(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { holderName: string; accountNumber: string; confirmNumber: string; ifsc: string; context?: RequestContext },
): Promise<BankAccount> {
  if (!can(actor, "payout_bank.change", { organisationId }))
    throw new BankError("Only a company admin can change the payout account");
  const number = input.accountNumber.replace(/\s+/g, "");
  if (!/^\d{9,18}$/.test(number)) throw new BankError("Enter the account number: 9 to 18 digits");
  if (number !== input.confirmNumber.replace(/\s+/g, "")) throw new BankError("The account numbers don't match");
  const ifsc = input.ifsc.trim().toUpperCase();
  if (!IFSC.test(ifsc)) throw new BankError("Enter the 11-character IFSC, like HDFC0001234");
  const [org] = await db
    .select({ legalName: schema.organisations.legalName })
    .from(schema.organisations)
    .where(eq(schema.organisations.id, organisationId));
  if (!org) throw new BankError("No such company");
  // A change already under way must be finished or cancelled first.
  const open = await db
    .select({ id: a.id })
    .from(a)
    .where(and(eq(a.organisationId, organisationId), inArray(a.status, ["Pending", "Held"])));
  if (open.length) throw new BankError("A change is already in progress. Cancel it first.");
  const check = await bankAdapter().check({
    accountNumber: number,
    ifsc,
    holderName: input.holderName.trim(),
    legalName: org.legalName,
  });
  const ok = check.result === "match";
  const [row] = await db
    .insert(a)
    .values({
      organisationId,
      holderName: input.holderName.trim(),
      accountLast4: number.slice(-4),
      accountCipher: sealAccount(number),
      ifsc,
      branch: check.branch,
      status: ok ? "Pending" : "Failed",
      checkMethod: check.method,
      bankName: check.nameOnAccount,
      nameMatches: ok,
      failReason: ok
        ? null
        : check.result === "unavailable"
          ? "The bank didn't answer. Try again in a few minutes."
          : `The bank returned the name ${check.nameOnAccount ?? "—"}, which doesn't match your GST legal name, ${org.legalName}.`,
      checkedAt: new Date(),
      createdBy: actor.userId,
    })
    .returning();
  if (!row) throw new Error("account not saved");
  await audit(db, {
    actorId: actor.userId,
    action: ok ? "bank.account.checked" : "bank.account.check_failed",
    resourceType: "payout_bank_account",
    resourceId: row.id,
    companyId: organisationId,
    after: { accountLast4: row.accountLast4, ifsc, nameMatches: ok, method: check.method },
    context: input.context,
  });
  return withoutCipher(row);
}

async function admins(db: Executor, organisationId: string) {
  return db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      mobile: schema.users.mobile,
      verified: schema.users.mobileVerifiedAt,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(and(eq(schema.memberships.organisationId, organisationId), eq(schema.memberships.role, "Admin")));
}

/**
 * Step 3 (588:748 "Confirm with your passkey"): needs a passkey sign-in within the last few minutes. The first account
 * becomes active at once; a change starts the hold and tells every admin by email and SMS.
 */
export async function confirmBankAccount(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { id: string; context?: RequestContext },
  now: Date = new Date(),
) {
  if (!can(actor, "payout_bank.change", { organisationId }))
    throw new BankError("Only a company admin can change the payout account");
  if (!actor.userId || !(await passkeyConfirmedRecently(db, actor.userId))) {
    throw new BankError("Confirm with your passkey first. A bank change can't be made without it.");
  }
  const [row] = await db
    .select()
    .from(a)
    .where(and(eq(a.id, input.id), eq(a.organisationId, organisationId), eq(a.status, "Pending")));
  if (!row) throw new BankError("This change can't be confirmed");
  const [current] = await db
    .select()
    .from(a)
    .where(and(eq(a.organisationId, organisationId), eq(a.status, "Active")));
  const first = !current;
  const holdUntil = await db.transaction(async (tx) => {
    let until: Date | null = null;
    if (first) {
      await tx.update(a).set({ status: "Active", confirmedAt: now, updatedAt: now }).where(eq(a.id, row.id));
    } else {
      const deadline = await startClock(tx, {
        clock: "bankChangeHold",
        subjectType: "payout_bank_account",
        subjectId: row.id,
        from: now,
      });
      until = deadline.dueAt;
      await tx
        .update(a)
        .set({ status: "Held", confirmedAt: now, holdUntil: until, updatedAt: now })
        .where(eq(a.id, row.id));
    }
    await audit(tx, {
      actorId: actor.userId,
      action: first ? "bank.account.added" : "bank.account.changed",
      resourceType: "payout_bank_account",
      resourceId: row.id,
      companyId: organisationId,
      before: current ? { accountLast4: current.accountLast4 } : null,
      after: { accountLast4: row.accountLast4, holdUntil: until?.toISOString() ?? null, passkey: true },
      context: input.context,
    });
    return until;
  });
  if (!first && holdUntil) {
    const [prof] = await db
      .select({ name: schema.companyProfiles.tradeName })
      .from(schema.companyProfiles)
      .where(eq(schema.companyProfiles.organisationId, organisationId));
    const [org] = await db
      .select({ legal: schema.organisations.legalName })
      .from(schema.organisations)
      .where(eq(schema.organisations.id, organisationId));
    const company = prof?.name ?? org?.legal ?? "";
    const [who] = await db
      .select({ name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.id, actor.userId));
    const until = formatIstDateTime(holdUntil);
    const app = parseServerEnv().APP_URL;
    for (const person of await admins(db, organisationId)) {
      // Security notices: every admin, whatever their choices (account.security can't be turned off by email).
      await notify({
        event: "bank.changed",
        topic: "account.security",
        userId: person.id,
        scope: organisationId,
        email: {
          template: "email.bank_account_changed",
          mail: await renderBankChanged(app, {
            name: person.name,
            company,
            changedBy: who?.name ?? "",
            newLast4: row.accountLast4,
            oldLast4: current.accountLast4,
            holdUntil: until,
            url: `${app}/supplier/bank`,
          }),
        },
        inApp: {
          category: "account",
          icon: "alert-triangle",
          title: "Payout bank account changed",
          body: `Payouts on hold until ${until} IST`,
          href: "/supplier/bank",
        },
      });
      if (person.mobile && person.verified) {
        await deliverSms({
          template: "sms.bank_account_changed",
          event: "bank.changed",
          userId: person.id,
          to: person.mobile,
          data: { company, last4: row.accountLast4, until },
        }).catch(() => undefined);
      }
    }
  }
  return { holdUntil };
}

/** "Cancel this change" (588:1179): any admin, during the hold or before confirming. Payouts stay with the old account. */
export async function cancelBankChange(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { id: string; context?: RequestContext },
) {
  if (!can(actor, "payout_bank.change", { organisationId }))
    throw new BankError("Only a company admin can cancel this change");
  const done = await db
    .update(a)
    .set({ status: "Cancelled", updatedAt: new Date() })
    .where(and(eq(a.id, input.id), eq(a.organisationId, organisationId), inArray(a.status, ["Pending", "Held"])))
    .returning({ id: a.id, last4: a.accountLast4 });
  if (!done.length) throw new BankError("This change has already ended");
  await cancelDeadline(db, { type: "bankChangeHold", subjectType: "payout_bank_account", subjectId: input.id });
  await audit(db, {
    actorId: actor.userId,
    action: "bank.change.cancelled",
    resourceType: "payout_bank_account",
    resourceId: input.id,
    companyId: organisationId,
    after: { accountLast4: done[0]?.last4 ?? "" },
    context: input.context,
  });
}

/** When the hold ends (the deadline engine): the new account becomes active and the old one is replaced. */
onDeadline("bankChangeHold", async (tx, deadline, event) => {
  if (event !== "expire") return;
  const [row] = await tx
    .select()
    .from(a)
    .where(and(eq(a.id, deadline.subjectId), eq(a.status, "Held")));
  if (!row) return;
  await tx
    .update(a)
    .set({ status: "Replaced", updatedAt: new Date() })
    .where(and(eq(a.organisationId, row.organisationId), eq(a.status, "Active")));
  await tx.update(a).set({ status: "Active", updatedAt: new Date() }).where(eq(a.id, row.id));
  await audit(tx, {
    actorId: null,
    action: "bank.account.activated",
    resourceType: "payout_bank_account",
    resourceId: row.id,
    companyId: row.organisationId,
    after: { accountLast4: row.accountLast4 },
  });
});
