// Background worker (steps 3.3, 3.7, 3.8): GSTIN checks, file checks, and the clocks queue that runs the deadline
// engine and housekeeping on a schedule. Every job retries with back-off; one that fails every attempt is written to
// the dead-letter list with its error. Search indexing (5.2) runs on the index queue; datasheets and spreadsheet
// imports (Stage 8) on the imports queue.
import {
  callWeb,
  installSchedules,
  processFile,
  QUEUES,
  recordFailedJob,
  redisConnection,
  runGstinCheck,
  runImportJob,
  runScheduled,
} from "@h2india/core/jobs";
import { Worker, type Processor } from "bullmq";

const workers: Worker[] = [];

function work<T>(name: string, processor: Processor<T>, concurrency: number) {
  const worker = new Worker<T>(name, processor, { connection: redisConnection(), concurrency });
  worker.on("failed", (job, error) => {
    console.warn(`${name} ${job?.name ?? "?"} attempt ${String(job?.attemptsMade ?? 0)}: ${error.message}`);
    void recordFailedJob(name, job, error).catch((e: unknown) => {
      console.error(`${name}: could not record a dead letter`, e);
    });
  });
  worker.on("error", (error) => {
    console.error(`${name}: ${error.message}`);
  });
  workers.push(worker);
}

work<{ gstin: string }>(
  QUEUES.gstin,
  async (job) => {
    // The page made attempt 0; the worker's first try is attempt 1.
    const result = await runGstinCheck(job.data.gstin, job.attemptsMade + 1);
    console.log(`gstin-check ${job.data.gstin}: ${result}`);
    return result;
  },
  4,
);

// Virus scan, type check and image cleaning for uploads. Few at a time: scans and image work use memory.
work<{ fileId: string }>(
  QUEUES.files,
  async (job) => {
    const result = await processFile(job.data.fileId);
    console.log(`files ${job.data.fileId}: ${result}`);
    return result;
  },
  2,
);

// Search (step 5.2): a save nudges this queue; the web app applies the waiting outbox rows to the index.
work(QUEUES.index, () => callWeb("/api/internal/search-sync"), 1);

// Messages that live in the web app (email templates render there): webinar reminders (step 5.7). Each job carries
// only ids; the web app reads the rest and sends at most once.
work<Record<string, string>>(
  QUEUES.notify,
  (job) => callWeb(`/api/internal/notify-job?${new URLSearchParams({ job: job.name, ...job.data }).toString()}`),
  2,
);

// Datasheet reading (8.4) and spreadsheet imports (8.5): the engine is called only from here, never the browser.
work<Record<string, string>>(
  QUEUES.imports,
  async (job) => {
    const result = await runImportJob(job.name, job.data);
    console.log(`imports ${job.name}: ${result}`);
    return result;
  },
  1,
);

// One at a time, so two ticks never race; each job reads its work from the database.
work(QUEUES.clocks, (job) => runScheduled(job.name), 1);

await installSchedules();

const stop = async () => {
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
};
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());

console.log(`H2 India worker ready: ${workers.map((w) => w.name).join(", ")}`);
