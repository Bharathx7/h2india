import { Queue } from "bullmq";
import { redisConnection } from "../companies/jobs";

// The worker queue for file checks (step 3.7). Retries with back-off while storage or the virus scanner is down.
export const FILES_QUEUE = "files";

let queue: Queue | undefined;

export async function enqueueFileCheck(fileId: string): Promise<void> {
  queue ??= new Queue(FILES_QUEUE, { connection: redisConnection() });
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => {
      reject(new Error("redis did not answer in 2 seconds"));
    }, 2000).unref(),
  );
  try {
    await Promise.race([
      timeout,
      queue.add(
        "check",
        { fileId },
        {
          jobId: `file-${fileId}`,
          attempts: 10,
          backoff: { type: "exponential", delay: 3000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      ),
    ]);
  } catch (error) {
    // The file stays Checking; sweepFiles() queues it again.
    console.error(`files: could not queue ${fileId}`, error);
  }
}
