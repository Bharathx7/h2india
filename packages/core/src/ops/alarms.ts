import type { Executor } from "@h2india/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { monthlyIdentity } from "../ledger";
import { QUEUES, queue } from "../queue/queues";
import { defineSetting, getSetting } from "../settings";
import { clearThrottle, readThrottle, startThrottle } from "../sign-in/throttle";

// Alarms (step 13.3): symptoms people feel (errors, stuck clocks, money that doesn't add up), not every warning.
// /api/health/deep answers 503 when a critical one fails, and the outside uptime check (.github/workflows/uptime.yml)
// turns that into an alert. Money checks alarm on any difference; the rest have limits in the ops.alarms setting.

export const ALARM_LIMITS = defineSetting<{
  failedJobs: number;
  failedMessagesPerHour: number;
  lockedSignInsPerHour: number;
  queueWaiting: number;
  queueOldestMinutes: number;
}>({
  key: "ops.alarms",
  description: "When the operational alarms go off (failed jobs, failed messages, sign-in lockouts, queue backlog)",
  schema: z.object({
    failedJobs: z.number().int().min(0),
    failedMessagesPerHour: z.number().int().min(0),
    lockedSignInsPerHour: z.number().int().min(0),
    queueWaiting: z.number().int().min(1),
    queueOldestMinutes: z.number().int().min(1),
  }),
  // Starting points for the team to tune after launch (A182), not product rules.
  fallback: {
    failedJobs: 0,
    failedMessagesPerHour: 20,
    lockedSignInsPerHour: 20,
    queueWaiting: 1000,
    queueOldestMinutes: 15,
  },
});

export interface Alarm {
  key: string;
  label: string;
  /** critical: people or money are affected now; warning: look today. */
  severity: "critical" | "warning";
  ok: boolean;
  value: string;
  runbook: string;
}

const n = async (ex: Executor, query: ReturnType<typeof sql>) =>
  (await ex.execute<{ n: number }>(query)).rows[0]?.n ?? 0;

/** Every alarm and its state now. `queues: false` skips Redis (when it's the thing being checked separately). */
export async function alarmChecks(ex: Executor, opts: { queues?: boolean; now?: Date } = {}): Promise<Alarm[]> {
  const limits = await getSetting(ex, ALARM_LIMITS);
  const now = opts.now ?? new Date();
  const alarms: Alarm[] = [];
  const add = (a: Omit<Alarm, "ok"> & { failing: boolean }) => {
    const { failing, ...rest } = a;
    alarms.push({ ...rest, ok: !failing });
  };

  // Clocks: an Open deadline more than 10 minutes past due means the deadline tick isn't running (drill 3).
  const stuck = await n(
    ex,
    sql`select count(*)::int as n from core.deadlines where status = 'Open' and expired_at is null
        and due_at < now() - interval '10 minutes'`,
  );
  add({
    key: "clocks",
    label: "Deadlines not being processed",
    severity: "critical",
    failing: stuck > 0,
    value: `${String(stuck)} overdue`,
    runbook: "docs/runbooks/site-down.md",
  });

  // Money.
  const webhooks = await n(
    ex,
    sql`select count(*)::int as n from core.payment_webhook_events
        where processed_at is null and received_at < now() - interval '15 minutes'`,
  );
  add({
    key: "webhooks",
    label: "Payment webhooks not processed",
    severity: "critical",
    failing: webhooks > 0,
    value: `${String(webhooks)} waiting over 15 minutes`,
    runbook: "docs/runbooks/payments.md",
  });
  const mismatches = await n(
    ex,
    sql`select count(*)::int as n from core.reconciliation_issues where resolved_at is null`,
  );
  add({
    key: "reconciliation",
    label: "Payments that don't match the partner's report",
    severity: "critical",
    failing: mismatches > 0,
    value: `${String(mismatches)} open`,
    runbook: "docs/runbooks/payments.md",
  });
  const payouts = await n(
    ex,
    sql`select count(*)::int as n from core.payouts where status = 'Failed' and updated_at > now() - interval '1 day'`,
  );
  add({
    key: "payouts",
    label: "Payouts failed",
    severity: "critical",
    failing: payouts > 0,
    value: `${String(payouts)} in the last day`,
    runbook: "docs/runbooks/payout-failed.md",
  });
  const ist = new Date(now.getTime() + 5.5 * 3_600_000);
  const monthStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 5.5 * 3_600_000);
  const identity = await monthlyIdentity(ex, monthStart, now);
  add({
    key: "ledger",
    label: "Ledger identity this month",
    severity: "critical",
    failing: identity.difference !== 0n,
    value: identity.difference === 0n ? "balanced" : `difference ${identity.difference.toString()} paise`,
    runbook: "docs/runbooks/payments.md",
  });

  // Jobs, messages, sign-in.
  const failedJobs = await n(ex, sql`select count(*)::int as n from core.dead_letters where resolved_at is null`);
  add({
    key: "dead-letters",
    label: "Background jobs that failed for good",
    severity: "warning",
    failing: failedJobs > limits.failedJobs,
    value: `${String(failedJobs)} unresolved`,
    runbook: "docs/runbooks/site-down.md",
  });
  const failedMessages = await n(
    ex,
    sql`select count(*)::int as n from core.notification_deliveries
        where status = 'Failed' and updated_at > now() - interval '1 hour'`,
  );
  add({
    key: "messages",
    label: "Emails, SMS and WhatsApp failing",
    severity: "warning",
    failing: failedMessages > limits.failedMessagesPerHour,
    value: `${String(failedMessages)} in the last hour`,
    runbook: "docs/runbooks/message-provider-outage.md",
  });
  const locked = await n(
    ex,
    sql`select count(*)::int as n from core.sign_in_throttle
        where key like 'sign-in:paused:%' and expires_at > now() - interval '1 hour'`,
  );
  add({
    key: "sign-in",
    label: "Sign-in pauses (too many wrong codes)",
    severity: "warning",
    failing: locked > limits.lockedSignInsPerHour,
    value: `${String(locked)} in the last hour`,
    runbook: "docs/runbooks/site-down.md",
  });

  // Queues (Redis).
  if (opts.queues !== false) {
    for (const name of Object.values(QUEUES)) {
      try {
        const q = queue(name);
        const counts = await q.getJobCounts("waiting", "delayed", "failed");
        const [oldest] = await q.getWaiting(0, 0);
        const minutes = oldest ? (now.getTime() - oldest.timestamp) / 60_000 : 0;
        add({
          key: `queue:${name}`,
          label: `Queue ${name}`,
          severity: "warning",
          failing: (counts.waiting ?? 0) > limits.queueWaiting || minutes > limits.queueOldestMinutes,
          value: `${String(counts.waiting ?? 0)} waiting, oldest ${String(Math.round(minutes))} min`,
          runbook: "docs/runbooks/site-down.md",
        });
      } catch (error) {
        add({
          key: `queue:${name}`,
          label: `Queue ${name}`,
          severity: "critical",
          failing: true,
          value: `Redis unreachable: ${(error as Error).message}`,
          runbook: "docs/runbooks/site-down.md",
        });
      }
    }
  }
  return alarms;
}

// ------------------------------------------------------------------------------------------------ telling people

const stateKey = (key: string) => `ops:alarm:${key}`;
/** While an alarm stays failing, it's repeated this often. */
const REPEAT_SECONDS = 6 * 3600;

/**
 * Every five minutes (worker schedule): emails OPS_ALERT_EMAIL when an alarm starts failing (and every six hours
 * while it stays failing), and once when everything is clear again. Returns what it sent, for the job log.
 */
export async function tellOnCall(
  db: Executor,
  send: (to: string[], failing: Alarm[]) => Promise<void>,
  opts: { to?: string; now?: Date; queues?: boolean } = {},
): Promise<"sent" | "clear" | "quiet"> {
  const alarms = await alarmChecks(db, { now: opts.now, queues: opts.queues });
  const failing = alarms.filter((a) => !a.ok);
  const fresh: Alarm[] = [];
  for (const a of failing) {
    if (await readThrottle(db, stateKey(a.key))) continue;
    fresh.push(a);
    await startThrottle(db, stateKey(a.key), REPEAT_SECONDS);
  }
  let recovered = false;
  for (const a of alarms.filter((x) => x.ok)) {
    if (await readThrottle(db, stateKey(a.key))) {
      recovered = true;
      await clearThrottle(db, stateKey(a.key));
    }
  }
  const to = (opts.to ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (fresh.length) {
    if (to.length) await send(to, failing);
    return "sent";
  }
  if (recovered && failing.length === 0) {
    if (to.length) await send(to, []);
    return "clear";
  }
  return "quiet";
}
