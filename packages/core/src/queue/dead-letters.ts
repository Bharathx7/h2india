import { schema, type Executor } from "@h2india/db";
import { desc, eq, isNull, sql } from "drizzle-orm";
import { audit, mask, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { getDb } from "../db";
import { enqueue, type QueueName } from "./queues";

// Dead-letter list (step 3.8): jobs that failed every retry, with the error, until a Super admin retries or dismisses
// them (the admin screen comes in Stage 11). Job data must never hold secrets; it is stored here, masked.

const { deadLetters: dl } = schema;

export interface FailedJob {
  name: string;
  id?: string | null;
  data: unknown;
  attemptsMade: number;
  opts: { attempts?: number };
}

/** Called from a worker's "failed" event. Records the job only once it has used up its attempts. */
export async function recordFailedJob(queueName: string, job: FailedJob | undefined, error: Error): Promise<boolean> {
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return false;
  await getDb()
    .insert(dl)
    .values({
      queue: queueName,
      jobName: job.name,
      jobId: job.id ?? null,
      data: mask(job.data ?? null) as Record<string, unknown> | null,
      error: error.message.slice(0, 2000),
      stack: error.stack?.slice(0, 8000) ?? null,
      attempts: job.attemptsMade,
    });
  return true;
}

export async function listDeadLetters(
  ex: Executor,
  actor: Actor,
  opts: { includeResolved?: boolean; limit?: number; offset?: number } = {},
) {
  assertCan(actor, "settings.view");
  return ex
    .select()
    .from(dl)
    .where(opts.includeResolved ? undefined : isNull(dl.resolvedAt))
    .orderBy(desc(dl.failedAt))
    .limit(opts.limit ?? 200)
    .offset(opts.offset ?? 0);
}

/** How many failed jobs wait to be retried (for the Failed jobs pages). */
export async function countDeadLetters(ex: Executor, actor: Actor): Promise<number> {
  assertCan(actor, "settings.view");
  const [row] = await ex
    .select({ n: sql<number>`count(*)::int` })
    .from(dl)
    .where(isNull(dl.resolvedAt));
  return row?.n ?? 0;
}

/** Retry puts the job back on its queue with its data; dismiss just closes it. Audited. */
export async function resolveDeadLetter(
  ex: Executor,
  actor: Actor,
  input: { id: string; resolution: "Retried" | "Dismissed" },
  context?: RequestContext,
): Promise<void> {
  assertCan(actor, "settings.edit");
  const [row] = await ex.select().from(dl).where(eq(dl.id, input.id));
  if (!row || row.resolvedAt) return;
  if (input.resolution === "Retried") {
    const queued = await enqueue(row.queue as QueueName, row.jobName, row.data ?? {});
    if (!queued) throw new Error("The queue isn't answering. Try again in a minute.");
  }
  await ex
    .update(dl)
    .set({ resolution: input.resolution, resolvedBy: actor.userId, resolvedAt: new Date() })
    .where(eq(dl.id, row.id));
  await audit(ex, {
    actorId: actor.userId,
    action: `dead_letter.${input.resolution.toLowerCase()}`,
    resourceType: "dead_letter",
    resourceId: row.id,
    after: { queue: row.queue, job: row.jobName },
    context,
  });
}
