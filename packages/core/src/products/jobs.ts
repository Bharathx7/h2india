import { schema } from "@h2india/db";
import { and, eq, lt } from "drizzle-orm";
import { getDb } from "../db";
import { enqueue, QUEUES } from "../queue/queues";
import { runExtraction } from "./datasheet";

// The imports queue (Stage 8): datasheet reading (8.4) and spreadsheet imports (8.5) run here, in the worker only.

export async function runImportJob(name: string, data: Record<string, string>): Promise<string> {
  switch (name) {
    case "datasheet-extract":
      return runExtraction(getDb(), data.id ?? "");
    default:
      throw new Error(`Unknown imports job ${name}`);
  }
}

/** Every few minutes: datasheets still queued after a minute (Redis was down) are queued again. */
export async function sweepExtractions(): Promise<number> {
  const x = schema.datasheetExtractions;
  const stuck = await getDb()
    .select({ id: x.id })
    .from(x)
    .where(and(eq(x.status, "Queued"), lt(x.createdAt, new Date(Date.now() - 60_000))));
  for (const s of stuck)
    await enqueue(QUEUES.imports, "datasheet-extract", { id: s.id }, { jobId: `datasheet-${s.id}` });
  return stuck.length;
}
