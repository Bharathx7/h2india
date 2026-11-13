import { schema, type Executor } from "@h2india/db";
import { and, desc, eq } from "drizzle-orm";

// Saved items (step 7.2; 541:8): one model for anything saved from any page, private to the member. Unfollowing never
// removes saved items (DONE WHEN).

const s = schema.savedItems;
const f = schema.follows;

export const SAVED_TYPES = ["article", "product", "tender", "scheme", "grant", "event", "job", "company"] as const;
export type SavedType = (typeof SAVED_TYPES)[number];

export interface SaveInput {
  targetType: SavedType;
  targetId: string;
  title: string;
  href: string;
  meta?: string | null;
}

export async function saveItem(db: Executor, userId: string, item: SaveInput): Promise<void> {
  if (!(SAVED_TYPES as readonly string[]).includes(item.targetType)) throw new Error("This can't be saved");
  await db
    .insert(s)
    .values({
      userId,
      targetType: item.targetType,
      targetId: item.targetId,
      title: item.title.slice(0, 300),
      href: item.href,
      meta: item.meta ?? null,
    })
    .onConflictDoNothing();
}

/** Removes one of the member's own saved items; someone else's id changes nothing. */
export async function removeSaved(db: Executor, userId: string, savedId: string): Promise<void> {
  await db.delete(s).where(and(eq(s.id, savedId), eq(s.userId, userId)));
}

export async function listSaved(db: Executor, userId: string) {
  return db.select().from(s).where(eq(s.userId, userId)).orderBy(desc(s.createdAt));
}

export const FOLLOW_LEVELS = [
  {
    value: "all",
    label: "All updates",
    text: "Every new post shows in your feed, and you get an in-app notification.",
  },
  {
    value: "digest",
    label: "Digest only",
    text: "Shows in your feed and in your weekly digest email. No separate notifications.",
  },
  { value: "none", label: "None", text: "Shows in your feed only. No email or in-app notifications." },
] as const;

/** Manage follows (543:8): how a follow notifies, for the member's own follow only. */
export async function setFollowLevel(db: Executor, userId: string, followId: string, level: string): Promise<void> {
  if (!FOLLOW_LEVELS.some((l) => l.value === level)) throw new Error("Choose a level");
  await db
    .update(f)
    .set({ level })
    .where(and(eq(f.id, followId), eq(f.userId, userId)));
}
