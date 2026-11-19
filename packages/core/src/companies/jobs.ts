import { parseServerEnv } from "@h2india/config";
import { schema } from "@h2india/db";
import { Queue, type ConnectionOptions } from "bullmq";
import { and, eq, inArray, ne } from "drizzle-orm";
import { audit } from "../audit";
import { getDb } from "../db";
import { gstinProvider } from "./adapters/gstin";
import { organisationFieldsForGstin } from "./gstin";

// Background GSTIN checks (playbook: "GSTIN service is down"). The page saves the GSTIN as Pending and the
// worker retries with back-off until the portal answers. Step 3.8 adds the other queues and the clocks.

export const GSTIN_QUEUE = "gstin-check";
const { organisations: o, organisationGstins: g } = schema;

export function redisConnection(): ConnectionOptions {
  const url = new URL(parseServerEnv().REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password ? decodeURIComponent(url.password) : undefined,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    maxRetriesPerRequest: null,
  };
}

let queue: Queue | undefined;

/** Asks the worker to check a GSTIN later. If Redis is down the GSTIN stays Pending and the sweep picks it up. */
export async function enqueueGstinCheck(gstin: string): Promise<void> {
  queue ??= new Queue(GSTIN_QUEUE, { connection: redisConnection() });
  // Never hold up the person: if Redis does not answer in 2 seconds the GSTIN simply stays Pending.
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
        { gstin },
        {
          jobId: `gstin-${gstin}`,
          attempts: 12,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      ),
    ]);
  } catch (error) {
    // A fixed message, and only the GSTIN's own characters: typed input never shapes the log line (CodeQL).
    console.error("gstin-check: could not queue", { gstin: gstin.replace(/[^0-9A-Z]/gi, "").slice(0, 15) }, error);
  }
}

/** One attempt by the worker. Throws while the portal is down, so the queue retries. */
export async function runGstinCheck(gstin: string, attempt: number): Promise<"done" | "gone"> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(g)
    .where(and(eq(g.gstin, gstin), eq(g.portalStatus, "Pending")));
  if (!row) return "gone";
  // While the portal is down this throws GstinProviderUnavailableError and the queue tries again later.
  const record = await gstinProvider().lookup(gstin, { attempt });
  const status = record?.status ?? "Not found";
  await db.transaction(async (tx) => {
    await tx
      .update(g)
      .set({ portalStatus: status, legalName: record?.legalName ?? null, checkedAt: new Date() })
      .where(eq(g.id, row.id));
    const others = await tx
      .select({ status: g.portalStatus })
      .from(g)
      .where(and(eq(g.organisationId, row.organisationId), ne(g.id, row.id)));
    const all = [status, ...others.map((x) => x.status)];
    const verification = all.includes("Active") ? "GST verified" : all.includes("Pending") ? "Pending" : "Unverified";
    const [org] = await tx
      .select({ state: o.state, pan: o.pan, legalName: o.legalName, registeredAddress: o.registeredAddress })
      .from(o)
      .where(eq(o.id, row.organisationId));
    // A GSTIN added after Join leaves the state empty on older rows: fill it (and an empty name) from the GSTIN.
    // A retired GSTIN (replaced before its check came back) never moves the company's fields.
    const filled = org && !row.retiredAt ? organisationFieldsForGstin(org, gstin, record) : {};
    await tx
      .update(o)
      .set({
        verification,
        ...filled,
        ...(record?.status === "Active" && !row.retiredAt ? { registeredAddress: record.address } : {}),
      })
      .where(eq(o.id, row.organisationId));
    await audit(tx, {
      actorId: null,
      action: "gstin.checked",
      resourceType: "organisation_gstin",
      resourceId: row.id,
      companyId: row.organisationId,
      before: { portalStatus: "Pending" },
      after: { portalStatus: status, verification },
    });
  });
  return "done";
}

/** GSTINs still waiting for a check, for the sweep that re-queues them (step 3.8). */
export async function pendingGstins(): Promise<string[]> {
  const rows = await getDb()
    .select({ gstin: g.gstin })
    .from(g)
    .where(inArray(g.portalStatus, ["Pending"]));
  return rows.map((r) => r.gstin);
}
