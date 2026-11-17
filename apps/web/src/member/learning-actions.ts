"use server";

import { getDb } from "@h2india/core";
import {
  addReadingTime,
  cancelRegistration,
  finishChapter,
  recordQuizAnswer,
  removeSaved,
  setApplicationStatus,
  startChapter,
} from "@h2india/core/members";
import { revalidatePath } from "next/cache";
import { getChapter } from "@/knowledge/data";
import { getSession } from "@/server/auth";
import { mayUseMember } from "@h2india/core/members";

// Hydrogen 101 progress, event registrations and job applications (step 7.5). Signed-in members only; signed-out
// readers' calls do nothing. Chapters are checked against the CMS, so no made-up chapter can be stored.

async function me() {
  return (await getSession().catch(() => null))?.user.id ?? null;
}

/** Hydrogen 101 progress is a member feature (founder QC, 17 Nov 2026): anyone else's calls do nothing. */
async function member() {
  const userId = await me();
  return userId && (await mayUseMember(getDb(), userId)) ? userId : null;
}

async function chapterId(slug: string) {
  const c = await getChapter(slug);
  return c ? String(c.id) : null;
}

export async function chapterOpenedAction(slug: string) {
  const [userId, id] = await Promise.all([member(), chapterId(slug)]);
  if (userId && id) await startChapter(getDb(), userId, id);
}

export async function readingTimeAction(slug: string, seconds: number) {
  const [userId, id] = await Promise.all([member(), chapterId(slug)]);
  if (userId && id) await addReadingTime(getDb(), userId, id, seconds);
}

export async function chapterDoneAction(slug: string) {
  const [userId, id] = await Promise.all([member(), chapterId(slug)]);
  if (!userId || !id) return;
  await finishChapter(getDb(), userId, id);
  revalidatePath("/member/hydrogen-101");
  revalidatePath(`/knowledge/hydrogen-101/${slug}`);
}

export async function quizAnswerAction(slug: string, question: number, right: boolean) {
  const [userId, id] = await Promise.all([member(), chapterId(slug)]);
  if (userId && id) await recordQuizAnswer(getDb(), userId, id, question, right);
}

export async function applicationStatusAction(id: string, status: string) {
  const userId = await me();
  if (!userId) return;
  await setApplicationStatus(getDb(), userId, id, status);
  revalidatePath("/member/applications");
}

export async function removeSavedJobAction(id: string) {
  const userId = await me();
  if (!userId) return;
  await removeSaved(getDb(), userId, id);
  revalidatePath("/member/applications");
}

export async function cancelRegistrationAction(id: string) {
  const userId = await me();
  if (!userId) return;
  await cancelRegistration(getDb(), userId, id);
  revalidatePath("/member/events");
}
