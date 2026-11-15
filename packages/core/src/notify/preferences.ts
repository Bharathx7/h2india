import { schema, type Executor } from "@h2india/db";
import { and, eq, inArray } from "drizzle-orm";
import { recordMarketingChoices } from "../consent/records";
import { TOPICS, type NotifyChannel, type TopicName } from "./topics";

// A person's notification choices (577:288, 548:8): only changes from the drawn defaults are stored.

const { notificationPreferences: np, notificationSettings: ns } = schema;

export type Choices = Record<TopicName, Record<NotifyChannel, boolean>>;

export async function getChoices(ex: Executor, userId: string, scope = ""): Promise<Choices> {
  // Personal choices apply everywhere; a company's own choices (577:288) override them for that company.
  const rows = (
    await ex
      .select()
      .from(np)
      .where(and(eq(np.userId, userId), inArray(np.scope, [...new Set(["", scope])])))
  ).sort((a, b) => (a.scope === b.scope ? 0 : a.scope === "" ? -1 : 1));
  const choices = Object.fromEntries(
    (Object.keys(TOPICS) as TopicName[]).map((t) => [t, { ...TOPICS[t].defaults }]),
  ) as Choices;
  for (const r of rows) {
    const topic = choices[r.topic as TopicName] as Record<NotifyChannel, boolean> | undefined;
    if (topic && r.channel in topic) topic[r.channel as NotifyChannel] = r.enabled;
  }
  for (const [name, topic] of Object.entries(TOPICS) as [TopicName, (typeof TOPICS)[TopicName]][]) {
    for (const channel of ("locked" in topic ? topic.locked : []) as NotifyChannel[]) choices[name][channel] = true;
  }
  return choices;
}

export async function setChoices(
  ex: Executor,
  userId: string,
  changes: { topic: TopicName; channel: NotifyChannel; enabled: boolean }[],
  scope = "",
): Promise<void> {
  await ex.transaction(async (tx) => {
    // Consent records (step 12.2) only for marketing choices that actually change.
    const current = await tx
      .select()
      .from(np)
      .where(and(eq(np.userId, userId), eq(np.scope, scope)));
    const changed: typeof changes = [];
    for (const c of changes) {
      const topic = TOPICS[c.topic] as (typeof TOPICS)[TopicName] | undefined;
      if (!topic) continue;
      if ("locked" in topic && (topic.locked as readonly string[]).includes(c.channel)) continue;
      const was =
        current.find((r) => r.topic === c.topic && r.channel === c.channel)?.enabled ?? topic.defaults[c.channel];
      if (was !== c.enabled) changed.push(c);
      await tx
        .insert(np)
        .values({ userId, scope, topic: c.topic, channel: c.channel, enabled: c.enabled })
        .onConflictDoUpdate({
          target: [np.userId, np.scope, np.topic, np.channel],
          set: { enabled: c.enabled, updatedAt: new Date() },
        });
    }
    await recordMarketingChoices(tx, userId, changed);
  });
}

export interface QuietSettings {
  quietHours: boolean;
  quietFrom: string;
  quietTo: string;
  unsubscribedAll: boolean;
}

export const DEFAULT_SETTINGS: QuietSettings = {
  quietHours: false,
  quietFrom: "22:00",
  quietTo: "07:00",
  unsubscribedAll: false,
};

export async function getNotifySettings(ex: Executor, userId: string): Promise<QuietSettings> {
  const [row] = await ex.select().from(ns).where(eq(ns.userId, userId));
  return row ?? DEFAULT_SETTINGS;
}

export async function setNotifySettings(ex: Executor, userId: string, settings: Partial<QuietSettings>) {
  const valid = (t: string | undefined) => t === undefined || /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  if (!valid(settings.quietFrom) || !valid(settings.quietTo)) throw new Error("Times are HH:MM");
  await ex
    .insert(ns)
    .values({ userId, ...DEFAULT_SETTINGS, ...settings })
    .onConflictDoUpdate({ target: ns.userId, set: { ...settings, updatedAt: new Date() } });
}

const IST_MS = 330 * 60_000;

/** When quiet hours end, if now is inside them (IST); otherwise null. */
export function quietUntil(settings: QuietSettings, now: Date = new Date()): Date | null {
  if (!settings.quietHours) return null;
  const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const wall = new Date(now.getTime() + IST_MS);
  const nowMin = wall.getUTCHours() * 60 + wall.getUTCMinutes();
  const from = minutes(settings.quietFrom);
  const to = minutes(settings.quietTo);
  const inside = from <= to ? nowMin >= from && nowMin < to : nowMin >= from || nowMin < to;
  if (!inside) return null;
  const end = new Date(wall);
  end.setUTCHours(Math.floor(to / 60), to % 60, 0, 0);
  if (end.getTime() <= wall.getTime()) end.setUTCDate(end.getUTCDate() + 1);
  return new Date(end.getTime() - IST_MS);
}
