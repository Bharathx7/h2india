"use server";

import config from "@payload-config";
import { audit, getDb } from "@h2india/core";
import { can, loadActor } from "@h2india/core/authz";
import { NewsletterSendError, saveSend, scheduleSend, sendTest, unscheduleSend } from "@h2india/core/newsletter/sends";
import { saveBoosts, saveSynonyms, type Boost } from "@h2india/core/search";
import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";
import { RECORD_COLLECTIONS } from "@/cms/records/collections";
import { TRACKER_SLUGS } from "@/cms/tracker/options";
import { issueContent } from "./issue";

// Content operations (step 11.3): Mark verified on Data quality, the newsletter composer, and search management.

type R = { ok: true } | { ok: false; error: string };

async function operator() {
  const session = await getSession();
  if (!session) throw new Error("Sign in again.");
  return { actor: await loadActor(getDb(), session.user.id), userId: session.user.id };
}

const fail = (error: unknown): R => {
  if (error instanceof NewsletterSendError) return { ok: false, error: error.message };
  if (error instanceof Error && /Not allowed/.test(error.message))
    return { ok: false, error: "Your role can't do this." };
  if (error instanceof Error && error.name === "ZodError") return { ok: false, error: "Check the values." };
  throw error;
};

const RECORDS: string[] = [...RECORD_COLLECTIONS, ...TRACKER_SLUGS];

/** Mark verified (646:9): the record was checked against its source today. */
export async function markVerifiedAction(collection: string, id: number): Promise<R> {
  const { actor, userId } = await operator();
  if (!can(actor, "content.edit")) return { ok: false, error: "Only editors can verify records." };
  if (!RECORDS.includes(collection)) return { ok: false, error: "No such record." };
  const payload = await getPayload({ config });
  const editor = (
    await payload.find({
      collection: "editors",
      where: { h2UserId: { equals: userId } },
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0];
  const at = new Date().toISOString();
  await payload.update({
    collection: collection as "schemes",
    id,
    data: { verification: { at, by: editor ? editor.id : null, note: "Checked from Data quality" } },
    overrideAccess: true,
  });
  await audit(getDb(), {
    actorId: userId,
    action: "record.verified",
    resourceType: collection,
    resourceId: String(id),
    after: { at },
    context: await requestContext(),
  });
  revalidatePath("/admin/content");
  return { ok: true };
}

export interface SendForm {
  subject: string;
  preview: string;
  editorNote: string;
  /** yyyy-mm-ddThh:mm in IST */
  sendAt: string;
}

export async function saveSendAction(issueId: string, f: SendForm): Promise<R> {
  const { actor } = await operator();
  try {
    await saveSend(getDb(), actor, { issueId, ...f });
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/admin/content/newsletter/${issueId}`);
  return { ok: true };
}

export async function scheduleAction(issueId: string, f: SendForm): Promise<R> {
  const { actor } = await operator();
  const at = new Date(`${f.sendAt}:00+05:30`);
  if (Number.isNaN(at.getTime())) return { ok: false, error: "Choose the send time" };
  try {
    await saveSend(getDb(), actor, { issueId, ...f });
    await scheduleSend(getDb(), actor, issueId, at, await requestContext());
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/admin/content/newsletter/${issueId}`);
  revalidatePath("/admin/content");
  return { ok: true };
}

export async function unscheduleAction(issueId: string): Promise<R> {
  const { actor } = await operator();
  try {
    await unscheduleSend(getDb(), actor, issueId, await requestContext());
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/admin/content/newsletter/${issueId}`);
  return { ok: true };
}

export async function testAction(issueId: string, f: SendForm, to: string): Promise<R> {
  const { actor } = await operator();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, error: "Enter an email address" };
  const payload = await getPayload({ config });
  const issue = await payload.findByID({
    collection: "newsletter-issues",
    id: Number(issueId),
    depth: 0,
    overrideAccess: true,
  });
  try {
    await saveSend(getDb(), actor, { issueId, ...f });
    await sendTest(getDb(), actor, issueId, to, await issueContent(payload, issue, new Date()));
  } catch (error) {
    return fail(error);
  }
  return { ok: true };
}

export async function synonymsAction(groups: string[][]): Promise<R> {
  const { actor } = await operator();
  try {
    await saveSynonyms(getDb(), actor, groups, await requestContext());
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/admin/settings/search");
  return { ok: true };
}

export async function boostsAction(boosts: Boost[]): Promise<R> {
  const { actor } = await operator();
  try {
    await saveBoosts(getDb(), actor, boosts, await requestContext());
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/admin/settings/search");
  return { ok: true };
}
