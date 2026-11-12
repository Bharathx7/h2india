import { schema } from "@h2india/db";
import { sql } from "drizzle-orm";
import { pruneAuditLog } from "../audit";
import { runDeadlines } from "../clocks/clocks";
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
  // 00:05 IST every day: record statuses follow the date (Closing soon, Closed), so their result rows are rebuilt.
  { id: "search-refresh", pattern: "35 18 * * *", run: () => callWeb("/api/internal/search-sync?refresh=records") },
  { id: "search-outbox-prune", every: 60 * MINUTE, run: () => pruneSearchOutbox(getDb()) },
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
  // 02:30 IST every day: "We keep notifications for 90 days" (97:2564).
  { id: "notifications-prune", pattern: "0 21 * * *", run: () => pruneNotifications(getDb()) },
  // 03:00 IST every day.
  { id: "audit-retention", pattern: "30 21 * * *", run: () => pruneAuditLog(getDb()) },
  // 03:15 IST every day: report leads are deleted 24 months after the download (A33). The web app runs the CMS.
  { id: "report-leads-prune", pattern: "45 21 * * *", run: () => callWeb("/api/internal/report-leads-prune") },
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
