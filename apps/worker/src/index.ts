// Background worker: messages, clocks, imports and search indexing. Step 3.3 adds the first queue, the GSTIN
// check that finishes when the GST portal was down during Join; step 3.8 adds the rest.
import { GSTIN_QUEUE, redisConnection, runGstinCheck } from "@h2india/core/jobs";
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

const stop = async () => {
  await gstin.close();
  process.exit(0);
};
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());

console.log("H2 India worker ready: gstin-check");
