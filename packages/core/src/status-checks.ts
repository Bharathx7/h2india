import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { buckets, s3 } from "./files/storage";
import { queue, QUEUES } from "./queue/queues";
import { searchClient } from "./search/client";

// The status page (A176; M26 stand-in until a status provider is chosen): a quick check of each of our own services,
// each with a 2-second limit. Public: it says only whether each part works, never addresses or errors.

export type ServiceState = "operational" | "degraded";

async function within(ms: number, work: () => Promise<unknown>): Promise<ServiceState> {
  try {
    await Promise.race([
      work(),
      new Promise((_, reject) =>
        setTimeout(() => {
          reject(new Error("timeout"));
        }, ms).unref(),
      ),
    ]);
    return "operational";
  } catch {
    return "degraded";
  }
}

export interface StatusReport {
  checkedAt: Date;
  services: { key: string; label: string; state: ServiceState }[];
}

export async function serviceStatus(): Promise<StatusReport> {
  const [site, queues, search, files] = await Promise.all([
    within(2000, () => getDb().execute(sql`select 1`)),
    within(2000, () => queue(QUEUES.clocks).getJobCounts("waiting")),
    within(2000, () => searchClient().health()),
    within(2000, () => s3().send(new HeadBucketCommand({ Bucket: buckets().public }))),
  ]);
  return {
    checkedAt: new Date(),
    services: [
      { key: "site", label: "Website and accounts", state: site },
      { key: "search", label: "Search", state: search },
      { key: "files", label: "Documents and images", state: files },
      { key: "messages", label: "Emails, alerts and background work", state: queues },
    ],
  };
}
