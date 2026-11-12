// Background worker: messages, clocks, imports and search indexing. Step 3.3 adds the first queue, the GSTIN
// check that finishes when the GST portal was down during Join; step 3.7 adds file checks; step 3.8 adds the rest.
import { FILES_QUEUE, GSTIN_QUEUE, processFile, redisConnection, runGstinCheck } from "@h2india/core/jobs";
import { Worker } from "bullmq";

const gstin = new Worker<{ gstin: string }>(
  GSTIN_QUEUE,
  async (job) => {
    // The page made attempt 0; the worker's first try is attempt 1.
    const result = await runGstinCheck(job.data.gstin, job.attemptsMade + 1);
    console.log(`gstin-check ${job.data.gstin}: ${result}`);
    return result;
  },
  { connection: redisConnection(), concurrency: 4 },
);

gstin.on("failed", (job, error) => {
  console.warn(`gstin-check ${job?.data.gstin ?? "?"} attempt ${String(job?.attemptsMade ?? 0)}: ${error.message}`);
});

// Virus scan, type check and image cleaning for uploads. Few at a time: scans and image work use memory.
const files = new Worker<{ fileId: string }>(
  FILES_QUEUE,
  async (job) => {
    const result = await processFile(job.data.fileId);
    console.log(`files ${job.data.fileId}: ${result}`);
    return result;
  },
  { connection: redisConnection(), concurrency: 2 },
);

files.on("failed", (job, error) => {
  console.warn(`files ${job?.data.fileId ?? "?"} attempt ${String(job?.attemptsMade ?? 0)}: ${error.message}`);
});

const stop = async () => {
  await Promise.all([gstin.close(), files.close()]);
  process.exit(0);
};
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());

console.log("H2 India worker ready: gstin-check, files");
