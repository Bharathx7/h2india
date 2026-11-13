import { schema, type Database, type Executor } from "@h2india/db";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { audit } from "../audit";
import { APPLICATION_STATUSES } from "./rules";

// Hydrogen 101 progress, job applications and event registrations in the member workspace (step 7.5; 725:8,
// 725:1038, 725:667). Every function takes the member and reads or changes only their rows.

const lp = schema.learningProgress;
const ja = schema.jobApplications;
const wr = schema.webinarRegistrations;

/** Seconds counted per report from the page, so a stuck tab can't add hours at once. */
export const MAX_REPORT_SECONDS = 300;

/** Opening a chapter while signed in starts it ("In progress") and notes when it was last studied. */
export async function startChapter(db: Executor, userId: string, chapterId: string, now: Date = new Date()) {
  await db
    .insert(lp)
    .values({ userId, chapterId, startedAt: now, lastSeenAt: now })
    .onConflictDoUpdate({ target: [lp.userId, lp.chapterId], set: { lastSeenAt: now } });
}

export async function addReadingTime(db: Executor, userId: string, chapterId: string, seconds: number) {
  const add = Math.max(0, Math.min(MAX_REPORT_SECONDS, Math.round(seconds)));
  if (!add) return;
  await db
    .insert(lp)
    .values({ userId, chapterId, secondsSpent: add })
    .onConflictDoUpdate({
      target: [lp.userId, lp.chapterId],
      set: { secondsSpent: sql`${lp.secondsSpent} + ${add}`, lastSeenAt: new Date() },
    });
}

/** Reaching the end of a chapter, or Mark chapter as done. Safe to repeat; the first time is kept. */
export async function finishChapter(db: Executor, userId: string, chapterId: string, now: Date = new Date()) {
  await db
    .insert(lp)
    .values({ userId, chapterId, status: "done", doneAt: now, lastSeenAt: now })
    .onConflictDoUpdate({
      target: [lp.userId, lp.chapterId],
      set: { status: "done", doneAt: sql`coalesce(${lp.doneAt}, ${now})`, lastSeenAt: now },
    });
}

/** The first answer to each quiz question counts towards the quiz score. */
export async function recordQuizAnswer(
  db: Executor,
  userId: string,
  chapterId: string,
  question: number,
  right: boolean,
) {
  const key = String(Math.max(0, Math.min(50, Math.floor(question))));
  await db
    .insert(lp)
    .values({ userId, chapterId, quiz: { [key]: right } })
    .onConflictDoUpdate({
      target: [lp.userId, lp.chapterId],
      set: { quiz: sql`jsonb_build_object(${key}::text, ${right}::boolean) || ${lp.quiz}` },
    });
}

export type ChapterProgress = typeof lp.$inferSelect;

export async function learningProgress(db: Executor, userId: string): Promise<ChapterProgress[]> {
  return db.select().from(lp).where(eq(lp.userId, userId)).orderBy(desc(lp.lastSeenAt));
}

/** "4 of 10 chapters done", time spent and the quiz average (725:8), for these chapters (published ones). */
export function courseSummary(rows: ChapterProgress[], chapterIds: string[]) {
  const mine = rows.filter((r) => chapterIds.includes(r.chapterId));
  const answers = mine.flatMap((r) => Object.values(r.quiz));
  return {
    done: mine.filter((r) => r.status === "done").length,
    total: chapterIds.length,
    minutes: Math.round(mine.reduce((n, r) => n + r.secondsSpent, 0) / 60),
    quizAverage: answers.length ? Math.round((answers.filter(Boolean).length / answers.length) * 100) : null,
    lastStudied: mine[0]?.lastSeenAt ?? null,
  };
}

// ------------------------------------------------------------------------------------------------ job applications

/** Apply was clicked: the job goes on the member's list (once), then they go on to the employer's site. */
export async function recordApplication(
  db: Executor,
  userId: string,
  job: { slug: string; role: string; company: string; location: string; closesAt: Date | null },
) {
  await db
    .insert(ja)
    .values({
      userId,
      jobSlug: job.slug,
      role: job.role,
      company: job.company,
      location: job.location,
      closesAt: job.closesAt,
    })
    .onConflictDoNothing();
}

export async function listApplications(db: Executor, userId: string) {
  return db.select().from(ja).where(eq(ja.userId, userId)).orderBy(desc(ja.appliedAt));
}

/** "Your status": the member's own note; employers never see it. */
export async function setApplicationStatus(db: Executor, userId: string, id: string, status: string) {
  if (!(APPLICATION_STATUSES as readonly string[]).includes(status)) throw new Error("Choose a status");
  await db
    .update(ja)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(ja.id, id), eq(ja.userId, userId)));
}

// ------------------------------------------------------------------------------------------------ registrations

/** The member's webinar registrations: made while signed in, or with their account email. */
export async function myRegistrations(db: Executor, userId: string) {
  const [u] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, userId));
  if (!u) return [];
  return db
    .select()
    .from(wr)
    .where(
      and(isNull(wr.cancelledAt), sql`(${wr.userId} = ${userId} or lower(${wr.email}) = ${u.email.toLowerCase()})`),
    )
    .orderBy(desc(wr.createdAt));
}

/** Cancel registration (725:667): frees the seat and stops the reminders. Audited. */
export async function cancelRegistration(db: Database, userId: string, id: string): Promise<boolean> {
  const mine = (await myRegistrations(db, userId)).find((r) => r.id === id);
  if (!mine) return false;
  await db.transaction(async (tx) => {
    await tx.update(wr).set({ cancelledAt: new Date() }).where(eq(wr.id, id));
    await audit(tx, {
      actorId: userId,
      action: "webinar.registration.cancelled",
      resourceType: "webinar_registration",
      resourceId: id,
      before: { cancelled: false },
      after: { cancelled: true },
    });
  });
  return true;
}
