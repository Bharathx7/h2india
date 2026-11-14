"use server";

import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { recordSaveBySlug } from "@h2india/core/supplier";
import { companyProfile } from "@h2india/core/companies";
import { follow, removeSaved, saveItem, setFollowLevel, unfollow } from "@h2india/core/members";
import { topicLabel, TOPICS, STATES } from "@h2india/core/members/rules";
import { revalidatePath } from "next/cache";
import { showSample } from "@/cms/sample";
import { getSession } from "@/server/auth";
import { resolveSave } from "./feed";

// Saved items and follows (step 7.2). Every action works on the signed-in member's own rows only.

async function me() {
  const s = await getSession();
  if (!s) throw new Error("Sign in again.");
  return s.user.id;
}

/** "Saved to your list" (275:23085): the item a Save link pointed at (?job=slug …). */
export async function saveFromLinkAction(type: string, key: string): Promise<{ ok: boolean; title?: string }> {
  const userId = await me();
  const item = await resolveSave(type, key);
  if (!item) return { ok: false };
  await saveItem(getDb(), userId, item);
  // A saved listing counts for the supplier's analytics (step 8.8); no person is recorded.
  if (item.targetType === "product") {
    const db = getDb();
    await recordSaveBySlug(db, await loadActor(db, userId), key);
  }
  revalidatePath("/member/saved");
  return { ok: true, title: item.title };
}

export async function removeSavedAction(id: string): Promise<void> {
  await removeSaved(getDb(), await me(), id);
  revalidatePath("/member/saved");
}

/** Follow from a link (?company=slug, ?topic=…, ?state=…) or Manage follows' search. */
export async function followFromLinkAction(type: string, key: string): Promise<{ ok: boolean; label?: string }> {
  const userId = await me();
  const db = getDb();
  if (type === "company") {
    const c = await companyProfile(db, key, { includeSample: showSample() });
    if (!c) return { ok: false };
    await follow(db, userId, {
      targetType: "company",
      targetId: c.organisationId,
      label: c.name,
      href: `/directory/companies/${c.slug}`,
    });
    revalidatePath("/member/follows");
    return { ok: true, label: c.name };
  }
  if (type === "topic" && TOPICS.some((t) => t.value === key)) {
    await follow(db, userId, { targetType: "topic", targetId: key, label: topicLabel(key) });
    revalidatePath("/member/follows");
    return { ok: true, label: topicLabel(key) };
  }
  if (type === "state" && (STATES as readonly string[]).includes(key)) {
    await follow(db, userId, { targetType: "state", targetId: key, label: key });
    revalidatePath("/member/follows");
    return { ok: true, label: key };
  }
  return { ok: false };
}

export async function unfollowAction(type: string, targetId: string): Promise<void> {
  await unfollow(getDb(), await me(), type, targetId);
  revalidatePath("/member/follows");
  revalidatePath("/member");
}

export async function setFollowLevelAction(followId: string, level: string): Promise<void> {
  await setFollowLevel(getDb(), await me(), followId, level);
  revalidatePath("/member/follows");
}
