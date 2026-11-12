import { Queue, type JobsOptions } from "bullmq";
import { redisConnection } from "../companies/jobs";

// The worker's queues (step 3.8). Every job retries with back-off; one that fails every attempt lands in the
// dead-letter list (core.dead_letters) with its error. Payments get their queue with Batch 6 (on hold).

export const QUEUES = {
  gstin: "gstin-check",
  files: "files",
  clocks: "clocks",
  notify: "notify",
  index: "index",
  imports: "imports",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export const DEFAULT_JOB: JobsOptions = {
  attempts: 8,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

const open = new Map<string, Queue>();

export function queue(name: QueueName): Queue {
  let q = open.get(name);
  if (!q) {
    q = new Queue(name, { connection: redisConnection(), defaultJobOptions: DEFAULT_JOB });
    open.set(name, q);
  }
  return q;
}

/**
 * Adds a job without ever holding up the person: if Redis doesn't answer in 2 seconds it gives up and returns false.
 * Callers keep the work findable in the database (status Pending, Checking...) so a sweep queues it again.
 */
export async function enqueue(
  name: QueueName,
  jobName: string,
  data: Record<string, unknown>,
  opts: JobsOptions = {},
): Promise<boolean> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => {
      reject(new Error("redis did not answer in 2 seconds"));
    }, 2000).unref(),
  );
  try {
    await Promise.race([timeout, queue(name).add(jobName, data, opts)]);
    return true;
  } catch (error) {
    console.error(`${name}: could not queue ${jobName}`, error);
    return false;
  }
}

export async function closeQueues(): Promise<void> {
  await Promise.all([...open.values()].map((q) => q.close()));
  open.clear();
}
