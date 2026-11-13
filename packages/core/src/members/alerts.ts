import { schema, type Executor } from "@h2india/db";
import { and, desc, eq, isNull } from "drizzle-orm";

// Alerts (step 7.3): a saved search on one index with channels and a frequency. Created from onboarding (531:178),
// the Create alert modal (534:587) and Watch a category (275:23289). Matching and sending are in alerts/engine.ts.

const a = schema.alerts;

export const ALERT_INDEXES = ["tenders", "schemes", "grants", "jobs", "articles", "products", "events"] as const;
export const ALERT_FREQUENCIES = ["instant", "daily", "weekly"] as const;
export const ALERT_CHANNELS = ["email", "whatsapp", "inapp"] as const;

export interface AlertInput {
  label: string;
  indexUid: string;
  query?: string;
  filters?: Record<string, string[]>;
  channels?: string[];
  frequency?: string;
}

export async function createAlert(db: Executor, userId: string, input: AlertInput): Promise<{ id: string }> {
  if (!(ALERT_INDEXES as readonly string[]).includes(input.indexUid)) throw new Error("Unknown alert type");
  const frequency = (ALERT_FREQUENCIES as readonly string[]).includes(input.frequency ?? "")
    ? input.frequency
    : "weekly";
  const channels = (input.channels ?? ["email"]).filter((c) => (ALERT_CHANNELS as readonly string[]).includes(c));
  const label = input.label.trim().slice(0, 120);
  if (!label) throw new Error("Name the alert");
  const [row] = await db
    .insert(a)
    .values({
      userId,
      label,
      indexUid: input.indexUid,
      query: (input.query ?? "").slice(0, 200),
      filters: input.filters ?? {},
      channels: channels.length ? channels : ["email"],
      frequency: frequency ?? "weekly",
    })
    .returning({ id: a.id });
  if (!row) throw new Error("alert not saved");
  return row;
}

export async function listAlerts(db: Executor, userId: string) {
  return db
    .select()
    .from(a)
    .where(and(eq(a.userId, userId), isNull(a.deletedAt)))
    .orderBy(desc(a.createdAt));
}
