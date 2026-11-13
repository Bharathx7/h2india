import { schema, type Database, type Executor } from "@h2india/db";
import { and, eq, inArray } from "drizzle-orm";
import { directoryEntries } from "../directory";
import { PERSONAS, STATES, TOPICS, topicLabel, type FollowTarget } from "./rules";

// The member profile and the one follows model (steps 7.1 and 7.2). Onboarding writes persona, topics and states to
// the profile and follows each chosen topic and state, so the feed reads follows only.

const mp = schema.memberProfiles;
const f = schema.follows;

export async function memberProfile(db: Executor, userId: string) {
  const [row] = await db.select().from(mp).where(eq(mp.userId, userId)).limit(1);
  return row ?? null;
}

export async function needsOnboarding(db: Executor, userId: string): Promise<boolean> {
  const p = await memberProfile(db, userId);
  return !p?.onboardedAt;
}

async function upsert(db: Executor, userId: string, set: Partial<typeof mp.$inferInsert>) {
  await db
    .insert(mp)
    .values({ userId, ...set })
    .onConflictDoUpdate({ target: mp.userId, set: { ...set, updatedAt: new Date() } });
}

export async function savePersona(db: Executor, userId: string, persona: string): Promise<void> {
  if (!PERSONAS.some((p) => p.value === persona)) throw new Error("Choose a persona");
  await upsert(db, userId, { persona });
}

/** Step 2: the chosen topics and states, mirrored as follows (unchosen ones are unfollowed). */
export async function saveTopicsAndStates(
  db: Database,
  userId: string,
  topics: string[],
  states: string[],
): Promise<void> {
  const t = [...new Set(topics)].filter((x) => TOPICS.some((y) => y.value === x));
  const s = [...new Set(states)].filter((x) => (STATES as readonly string[]).includes(x));
  await db.transaction(async (tx) => {
    await upsert(tx, userId, { topics: t, states: s });
    await tx.delete(f).where(and(eq(f.userId, userId), inArray(f.targetType, ["topic", "state"])));
    const rows = [
      ...t.map((x) => ({ userId, targetType: "topic", targetId: x, label: topicLabel(x), href: null })),
      ...s.map((x) => ({
        userId,
        targetType: "state",
        targetId: x,
        label: x,
        href: x === "All of India" ? null : `/states/${x.toLowerCase().replace(/\s+/g, "-")}`,
      })),
    ];
    if (rows.length) await tx.insert(f).values(rows).onConflictDoNothing();
  });
}

/** Finishing or skipping onboarding: either way it isn't offered again. */
export async function completeOnboarding(db: Executor, userId: string): Promise<void> {
  await upsert(db, userId, { onboardedAt: new Date() });
}

export async function follow(db: Executor, userId: string, target: FollowTarget): Promise<void> {
  await db
    .insert(f)
    .values({
      userId,
      targetType: target.targetType,
      targetId: target.targetId,
      label: target.label,
      href: target.href ?? null,
    })
    .onConflictDoNothing();
}

export async function unfollow(db: Executor, userId: string, targetType: string, targetId: string): Promise<void> {
  await db.delete(f).where(and(eq(f.userId, userId), eq(f.targetType, targetType), eq(f.targetId, targetId)));
}

export async function listFollows(db: Executor, userId: string) {
  return db.select().from(f).where(eq(f.userId, userId)).orderBy(f.targetType, f.label);
}

/** Which of these targets the person follows (for Follow / Following buttons). */
export async function followingIds(
  db: Executor,
  userId: string,
  targetType: string,
  ids: string[],
): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const rows = await db
    .select({ id: f.targetId })
    .from(f)
    .where(and(eq(f.userId, userId), eq(f.targetType, targetType), inArray(f.targetId, ids)));
  return new Set(rows.map((r) => r.id));
}

/** 3 · Companies and institutions (531:178): directory profiles in the chosen states or naming the topics. */
export async function suggestedCompanies(
  db: Executor,
  input: { states: string[]; topics: string[]; includeSample: boolean; limit?: number },
) {
  const words = input.topics.flatMap((t) => TOPICS.find((x) => x.value === t)?.words ?? []);
  const states = input.states.filter((s) => s !== "All of India");
  const scored = (await directoryEntries(db, { includeSample: input.includeSample })).map((e) => {
    const text = [...e.categories, ...e.types, e.summary].join(" ").toLowerCase();
    const topic = words.some((w) => text.includes(w));
    const state = states.includes(e.state);
    return { e, score: Number(topic) * 2 + Number(state) + Number(e.verified) * 0.5 };
  });
  return scored
    .filter((x) => x.score >= 1)
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name))
    .slice(0, input.limit ?? 3)
    .map((x) => x.e);
}
