import { createDb, schema } from "@h2india/db";
import { sql } from "drizzle-orm";
import { signSimWebhook } from "../src/adapters/payments/sim";
import { receiveWebhook } from "../src/orders/money";

// Drill 5 (step 12.6): replay every payment webhook already received and prove the ledger doesn't move. Simulated
// partner only (it signs with our own key); on a real partner use its dashboard's "resend" for a test day instead.
//   pnpm drill:webhooks
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const { db, pool } = createDb(url, { max: 2 });

const ledger = async () => {
  const r = await db.execute<{ lines: number; debit: string; credit: string; orders: string }>(sql`
    select count(*)::int as lines, coalesce(sum(debit_paise), 0)::text as debit, coalesce(sum(credit_paise), 0)::text as credit,
      (select string_agg(status, ',' order by id) from core.orders) as orders
    from core.ledger_lines`);
  return r.rows[0];
};

try {
  const before = await ledger();
  const events = await db.select().from(schema.paymentWebhookEvents);
  const outcomes: Record<string, number> = {};
  for (const e of events) {
    const raw = JSON.stringify(e.payload);
    let outcome: string;
    try {
      outcome = await receiveWebhook(db, raw, signSimWebhook(raw));
    } catch (error) {
      outcome = `refused: ${(error as Error).message}`;
    }
    outcomes[outcome] = (outcomes[outcome] ?? 0) + 1;
  }
  const after = await ledger();
  const same = JSON.stringify(before) === JSON.stringify(after);
  console.log({ replayed: events.length, outcomes, ledgerBefore: before, ledgerUnchanged: same });
  if (!same) process.exitCode = 1;
} finally {
  await pool.end();
}
