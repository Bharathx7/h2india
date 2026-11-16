import { schema } from "@h2india/db";
import { sql } from "drizzle-orm";
import { runAlerts, sendDigests } from "../alerts/engine";
import { sweepExtractions } from "../products/jobs";
import { rollUpYesterday } from "../supplier/analytics";
import { expireDocuments, sendExpiryNotices } from "../supplier/verification";
import { pruneAuditLog } from "../audit";
import { runRetention } from "../compliance/retention";
import { parseServerEnv } from "@h2india/config";
import { sendOpsAlarm } from "../notify/events";
import { tellOnCall } from "../ops/alarms";
import { runDeadlines } from "../clocks/clocks";
// Registers the webinar reminder handler in the worker (step 5.7).
import "../events/reminders";
// Registers the end of a payout bank change hold (step 8.6).
import "../supplier/bank";
import "../rfq/records";
import "../newsletter/sends";
import "../compliance/escalation";
import { expireJoinRequests } from "../companies/join-requests";
import { enqueueGstinCheck, pendingGstins } from "../companies/jobs";
import { getDb } from "../db";
import { enqueueFileCheck } from "../files/jobs";
import { sweepFiles } from "../files/files";
import { sendDueDeliveries } from "../notify/channels";
import { pruneNotifications } from "../notify/inapp";
import { callWeb } from "../internal";
import { pruneSearchOutbox } from "../search/outbox";
import { pruneThrottle } from "../sign-in/throttle";
import { QUEUES, queue } from "./queues";
import { rollUpYesterdayReports } from "../admin/system";
// Registers the order clocks (48 hours to accept, 5 working days to accept a delivery), Stage 10.
import "../orders/flow";
import { deliverSimWebhooks, reconcile, runPayouts } from "../orders/money";

// The schedule runner (step 3.8): housekeeping and the deadline tick, as BullMQ job schedulers on the clocks queue.
// Every job reads its work from the database, so a missed run (worker down, Redis flushed) is caught up by the next.

interface Scheduled {
  /** Also the job name. */
  id: string;
  /** Milliseconds between runs, or a cron pattern in UTC. */
  every?: number;
  pattern?: string;
  run: () => Promise<unknown>;
}

const MINUTE = 60_000;

export const SCHEDULES: Scheduled[] = [
  { id: "deadlines-tick", every: MINUTE, run: () => runDeadlines(getDb()) },
  // Step 4.2: articles scheduled for now are published by the web app, which runs the CMS.
  { id: "cms-publish-due", every: MINUTE, run: () => callWeb("/api/internal/publish-due") },
  // Step 5.2: applies search changes a save's nudge missed (Redis down, worker restarting). The CMS lives in the web
  // app, so the web app reads the records and writes the index. Unpublished content leaves search within a minute.
  { id: "search-sync", every: MINUTE, run: () => callWeb("/api/internal/search-sync") },
  // H2 Economy Weekly issues whose send time has come (step 11.3), a batch a minute.
  { id: "newsletter-send", every: MINUTE, run: () => callWeb("/api/internal/newsletter-send") },
  // 00:05 IST every day: record statuses follow the date (Closing soon, Closed), so their result rows are rebuilt.
  { id: "search-refresh", pattern: "35 18 * * *", run: () => callWeb("/api/internal/search-sync?refresh=records") },
  { id: "search-outbox-prune", every: 60 * MINUTE, run: () => pruneSearchOutbox(getDb()) },
  // Step 7.3: match changes the search worker applied against alerts, then send instant alerts.
  { id: "alerts-run", every: MINUTE, run: () => runAlerts(getDb()) },
  // 07:00 IST every day: daily digests; on Mondays the weekly ones too (665:307 "Sent 7:00 AM IST").
  { id: "alerts-digests", pattern: "30 1 * * *", run: () => sendDigests(getDb()) },
  // 00:20 IST every day: supplier analytics roll-up of the day before (step 8.8).
  { id: "analytics-rollup", pattern: "50 18 * * *", run: () => rollUpYesterday(getDb()) },
  // Reports (step 11.8): yesterday's figures at 00:40 IST, so reports never read live tables.
  { id: "reports-rollup", pattern: "10 19 * * *", run: () => rollUpYesterdayReports(getDb()) },
  // Step 8.4: datasheets a Redis outage left waiting.
  { id: "datasheet-sweep", every: 5 * MINUTE, run: () => sweepExtractions() },
  // 06:00 IST every day (673:221 "Sent 6:05 AM IST"): documents past expiry pause their badges; notices go ahead.
  {
    id: "verification-expiry",
    pattern: "30 0 * * *",
    run: async () => {
      await expireDocuments(getDb());
      await sendExpiryNotices(getDb());
    },
  },
  // Step 3.9: WhatsApp held by quiet hours, and failed emails due for a retry.
  { id: "notify-due", every: MINUTE, run: () => sendDueDeliveries() },
  { id: "files-sweep", every: 15 * MINUTE, run: () => sweepFiles(enqueueFileCheck) },
  {
    id: "gstin-sweep",
    every: 30 * MINUTE,
    run: async () => Promise.all((await pendingGstins()).map(enqueueGstinCheck)),
  },
  { id: "join-requests-expire", every: 60 * MINUTE, run: () => expireJoinRequests(getDb()) },
  { id: "throttle-prune", every: 60 * MINUTE, run: () => pruneThrottle(getDb()) },
  {
    id: "verifications-prune",
    every: 60 * MINUTE,
    // Sign-in codes and links are kept a day after expiry (Better Auth's own cleanup is off, ADR 0003).
    run: () =>
      getDb()
        .delete(schema.verifications)
        .where(sql`${schema.verifications.expiresAt} < now() - interval '1 day'`),
  },
  // Stage 10 (A176): webhooks the simulated payment partner owes (refunds and payouts settling). No-op for a real one.
  { id: "payments-sim-webhooks", every: 15_000, run: () => deliverSimWebhooks(getDb()) },
  // Payout runs at 11:00 and 16:00 IST (step 10.11); releases due on a holiday wait for the next working day's run.
  { id: "payouts-1100", pattern: "30 5 * * *", run: () => runPayouts(getDb()) },
  { id: "payouts-1600", pattern: "30 10 * * *", run: () => runPayouts(getDb()) },
  // 02:00 IST every day: yesterday's settlement report against the ledger (steps 10.4, 10.6).
  {
    id: "payments-reconcile",
    pattern: "30 20 * * *",
    run: () => reconcile(getDb(), new Date(Date.now() + 5.5 * 3_600_000 - 86_400_000).toISOString().slice(0, 10)),
  },
  // 02:30 IST every day: "We keep notifications for 90 days" (97:2564).
  { id: "notifications-prune", pattern: "0 21 * * *", run: () => pruneNotifications(getDb()) },
  // 03:00 IST every day.
  { id: "audit-retention", pattern: "30 21 * * *", run: () => pruneAuditLog(getDb()) },
  // 03:15 IST every day: report leads are deleted 24 months after the download (A33). The web app runs the CMS.
  { id: "report-leads-prune", pattern: "45 21 * * *", run: () => callWeb("/api/internal/report-leads-prune") },
  // Step 13.3: alarms checked every five minutes; OPS_ALERT_EMAIL hears when one starts failing and when all clear.
  {
    id: "ops-alarms",
    every: 5 * MINUTE,
    run: () => tellOnCall(getDb(), sendOpsAlarm, { to: parseServerEnv().OPS_ALERT_EMAIL }),
  },
  // 03:30 IST every day (step 12.2): personal data past its period. Reports only until periods are decided and
  // privacy.retention.enforce is on; the report is the job's return value (kept with the completed job).
  { id: "privacy-retention", pattern: "0 22 * * *", run: () => runRetention(getDb(), { apply: true }) },
];

/** Registers (or updates) every schedule. Safe to call on every worker start. */
export async function installSchedules(): Promise<void> {
  const q = queue(QUEUES.clocks);
  for (const s of SCHEDULES) {
    await q.upsertJobScheduler(s.id, s.pattern ? { pattern: s.pattern } : { every: s.every ?? MINUTE }, {
      name: s.id,
      data: {},
      opts: { attempts: 3, backoff: { type: "exponential", delay: 10_000 }, removeOnComplete: 100, removeOnFail: 500 },
    });
  }
}

export async function runScheduled(id: string): Promise<unknown> {
  const s = SCHEDULES.find((x) => x.id === id);
  if (!s) throw new Error(`No schedule ${id}`);
  return s.run();
}
