import { schema, type Executor } from "@h2india/db";
import { and, eq, gte, lt, sql } from "drizzle-orm";

// The double-entry ledger (step 10.6, 705:8). Every money event posts one balanced transaction in the same database
// transaction as the order change; entries are append-only (the database refuses UPDATE and DELETE and checks the
// balance at commit); corrections are reversing transactions. The source event id is unique, so a duplicate webhook
// can never post twice. Accounts follow playbook Section 8.

export const LEDGER_ACCOUNTS = {
  /** Money at the payment partner (what was collected and not yet paid out or refunded). Debit-normal. */
  partner_cash: "Funds at the payment partner",
  /** Buyer's money held for acceptance, per order. */
  held_for_acceptance: "Held for acceptance",
  /** Released to the supplier, waiting for the payout run. */
  supplier_payable: "Supplier payable",
  platform_fee: "H2 Economy fee",
  gst_on_fee: "GST on fee",
  tcs_payable: "TCS payable",
  tds_payable: "TDS payable",
  /** Approved refunds waiting for the partner. */
  refunds_payable: "Refunds payable",
  /** Overpayments, flagged for Finance (G9). */
  unallocated: "Unallocated receipts",
} as const;
export type LedgerAccount = keyof typeof LEDGER_ACCOUNTS;

export interface PostingLine {
  account: LedgerAccount;
  orderId?: string | null;
  organisationId?: string | null;
  debit?: bigint;
  credit?: bigint;
}

export interface Posting {
  ref: string;
  sourceEventId: string;
  kind: string;
  orderId?: string | null;
  memo?: string;
  reverses?: string;
  lines: PostingLine[];
}

export class LedgerError extends Error {
  readonly code = "LEDGER";
}

/** Checks a posting balances before it reaches the database (which checks again at commit). Pure. */
export function balanceProblem(lines: PostingLine[]): string | null {
  let debit = 0n;
  let credit = 0n;
  for (const l of lines) {
    const d = l.debit ?? 0n;
    const c = l.credit ?? 0n;
    if (d < 0n || c < 0n) return "Amounts can't be negative";
    if ((d === 0n) === (c === 0n)) return "Each line is a debit or a credit";
    debit += d;
    credit += c;
  }
  if (lines.length < 2) return "A transaction needs at least two lines";
  if (debit !== credit) return `Debits ${String(debit)} and credits ${String(credit)} don't match`;
  return null;
}

/**
 * Posts one balanced transaction. Returns false (and posts nothing) when the source event was posted before, so a
 * repeated webhook changes the ledger once. Zero-amount lines are dropped.
 */
export async function post(tx: Executor, p: Posting): Promise<boolean> {
  const lines = p.lines.filter((l) => (l.debit ?? 0n) !== 0n || (l.credit ?? 0n) !== 0n);
  if (lines.length === 0) return false;
  const problem = balanceProblem(lines);
  if (problem) throw new LedgerError(`${p.ref}: ${problem}`);
  const [row] = await tx
    .insert(schema.ledgerTransactions)
    .values({
      ref: p.ref,
      sourceEventId: p.sourceEventId,
      kind: p.kind,
      orderId: p.orderId ?? null,
      memo: p.memo ?? null,
      reverses: p.reverses ?? null,
    })
    .onConflictDoNothing({ target: schema.ledgerTransactions.sourceEventId })
    .returning({ id: schema.ledgerTransactions.id });
  if (!row) return false;
  await tx.insert(schema.ledgerLines).values(
    lines.map((l) => ({
      transactionId: row.id,
      account: l.account,
      orderId: l.orderId ?? p.orderId ?? null,
      organisationId: l.organisationId ?? null,
      debitPaise: l.debit ?? 0n,
      creditPaise: l.credit ?? 0n,
    })),
  );
  return true;
}

/** Reverses a transaction with the opposite lines (the only way to correct the ledger). */
export async function reverse(tx: Executor, transactionId: string, reason: string, sourceEventId: string) {
  const [t] = await tx.select().from(schema.ledgerTransactions).where(eq(schema.ledgerTransactions.id, transactionId));
  if (!t) throw new LedgerError("No such ledger transaction");
  const lines = await tx.select().from(schema.ledgerLines).where(eq(schema.ledgerLines.transactionId, transactionId));
  return post(tx, {
    ref: `${t.ref}:reversal`,
    sourceEventId,
    kind: "reversal",
    orderId: t.orderId,
    memo: reason,
    reverses: t.id,
    lines: lines.map((l) => ({
      account: l.account as LedgerAccount,
      orderId: l.orderId,
      organisationId: l.organisationId,
      debit: l.creditPaise,
      credit: l.debitPaise,
    })),
  });
}

/** Balance per account (debits minus credits), optionally for one order or a period. */
export async function balances(
  ex: Executor,
  filter: { orderId?: string; from?: Date; to?: Date } = {},
): Promise<Record<LedgerAccount, bigint>> {
  const l = schema.ledgerLines;
  const t = schema.ledgerTransactions;
  const where = [
    filter.orderId ? eq(l.orderId, filter.orderId) : undefined,
    filter.from ? gte(t.at, filter.from) : undefined,
    filter.to ? lt(t.at, filter.to) : undefined,
  ].filter(Boolean);
  const rows = await ex
    .select({
      account: l.account,
      net: sql<string>`coalesce(sum(${l.debitPaise}), 0) - coalesce(sum(${l.creditPaise}), 0)`,
    })
    .from(l)
    .innerJoin(t, eq(t.id, l.transactionId))
    .where(where.length ? and(...where) : undefined)
    .groupBy(l.account);
  const out = Object.fromEntries(Object.keys(LEDGER_ACCOUNTS).map((k) => [k, 0n])) as Record<LedgerAccount, bigint>;
  for (const r of rows) out[r.account as LedgerAccount] = BigInt(r.net);
  return out;
}

export interface MonthlyIdentity {
  collected: bigint;
  paidOut: bigint;
  refunded: bigint;
  fees: bigint;
  gstOnFees: bigint;
  tcs: bigint;
  tds: bigint;
  held: bigint;
  /** Released or approved but not yet paid out or refunded, plus unallocated receipts. */
  owed: bigint;
  /** Must be zero. */
  difference: bigint;
}

/**
 * The identity on Ledger and reconciliation (705:8): collected = paid out + fees + GST on fees + TCS + TDS + held
 * (plus refunds and what is owed but not yet sent). Worked out from the movements on each account.
 */
export async function monthlyIdentity(ex: Executor, from: Date, to: Date): Promise<MonthlyIdentity> {
  const l = schema.ledgerLines;
  const t = schema.ledgerTransactions;
  const rows = await ex
    .select({
      account: l.account,
      kind: t.kind,
      debit: sql<string>`coalesce(sum(${l.debitPaise}), 0)`,
      credit: sql<string>`coalesce(sum(${l.creditPaise}), 0)`,
    })
    .from(l)
    .innerJoin(t, eq(t.id, l.transactionId))
    .where(and(gte(t.at, from), lt(t.at, to)))
    .groupBy(l.account, t.kind);
  const sum = (account: LedgerAccount, side: "debit" | "credit", kind?: string) =>
    rows
      .filter((r) => r.account === account && (!kind || r.kind === kind))
      .reduce((a, r) => a + BigInt(side === "debit" ? r.debit : r.credit), 0n);
  const net = (account: LedgerAccount) => sum(account, "credit") - sum(account, "debit");
  const collected = sum("partner_cash", "debit");
  const paidOut = sum("partner_cash", "credit", "payout");
  const refunded = sum("partner_cash", "credit", "refund_confirmed");
  const fees = net("platform_fee");
  const gstOnFees = net("gst_on_fee");
  const tcs = net("tcs_payable");
  const tds = net("tds_payable");
  const held = net("held_for_acceptance");
  const owed = net("supplier_payable") + net("refunds_payable") + net("unallocated");
  const difference = collected - (paidOut + refunded + fees + gstOnFees + tcs + tds + held + owed);
  return { collected, paidOut, refunded, fees, gstOnFees, tcs, tds, held, owed, difference };
}

/**
 * The status and the ledger must agree (10.1 watch-out): checks each order's held balance against its status and its
 * confirmed payments. Returns one line per problem.
 */
export async function orderLedgerProblems(ex: Executor): Promise<{ orderId: string; problem: string }[]> {
  const rows = await ex.execute<{ id: string; status: string; held: string; paid: string; collected: string }>(sql`
    select o.id, o.status,
      coalesce((select sum(credit_paise) - sum(debit_paise) from core.ledger_lines ll
        where ll.order_id = o.id and ll.account = 'held_for_acceptance'), 0)::text as held,
      coalesce((select sum(amount_paise) from core.payments p
        where p.order_id = o.id and p.status = 'Succeeded'), 0)::text as paid,
      coalesce((select sum(debit_paise) from core.ledger_lines ll
        where ll.order_id = o.id and ll.account = 'partner_cash'), 0)::text as collected
    from core.orders o`);
  const out: { orderId: string; problem: string }[] = [];
  for (const r of rows.rows) {
    const held = BigInt(r.held);
    const collected = BigInt(r.collected);
    if (held < 0n) out.push({ orderId: r.id, problem: "Held balance is negative" });
    if (collected !== BigInt(r.paid))
      out.push({ orderId: r.id, problem: `Ledger collected ${r.collected} but confirmed payments are ${r.paid}` });
    if ((r.status === "Closed" || r.status === "Cancelled" || r.status === "Declined") && held !== 0n)
      out.push({ orderId: r.id, problem: `${r.status} order still has ${r.held} paise held` });
  }
  return out;
}
