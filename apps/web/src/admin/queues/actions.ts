"use server";

import config from "@payload-config";
import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { notify, sendChangesNeeded, sendEventLive, sendJobLive } from "@h2india/core/notify";
import {
  addFieldComment,
  claimItem,
  decideItem,
  deleteQueueView,
  QueueError,
  saveQueueView,
  type Decision,
  type QueueKey,
} from "@h2india/core/queues";
import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { absolute } from "@/seo/site";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";
import { itemDetail } from "./data";

// Moderation decisions for the CMS-backed queues (step 11.2). Core records the claim and decision (one operator, once)
// and audits it; here the item changes in the CMS and its message goes out. Moderators never edit the item itself.

type R = { ok: true } | { ok: false; error: string };

async function operator() {
  const session = await getSession();
  if (!session) throw new Error("Sign in again.");
  return { actor: await loadActor(getDb(), session.user.id), userId: session.user.id };
}

const failure = (error: unknown): R => {
  if (error instanceof QueueError) return { ok: false, error: error.message };
  if (error instanceof Error && /Not allowed/.test(error.message))
    return { ok: false, error: "You can't decide items in this queue." };
  throw error;
};

const fmtDay = (d: string) =>
  d
    ? new Date(`${d}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

export async function claimAction(queue: QueueKey, id: string, toMe: boolean): Promise<R> {
  const { actor, userId } = await operator();
  try {
    await claimItem(getDb(), actor, { queue, subjectId: id, to: toMe ? userId : null }, await requestContext());
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/admin/queues/${queue}`);
  revalidatePath(`/admin/queues/${queue}/${id}`);
  return { ok: true };
}

export async function decideAction(queue: QueueKey, id: string, decision: Decision, text: string): Promise<R> {
  const { actor } = await operator();
  const item = await itemDetail(actor, queue, id);
  if (!item) return { ok: false, error: "This item isn't in the queue any more." };
  const payload = await getPayload({ config });
  const to = item.submitter ? { email: item.submitter.email, userId: item.submitter.id } : null;
  const apply = async () => {
    if (queue === "jobs") {
      const job = await payload.findByID({
        collection: "jobs",
        id: Number(id),
        draft: true,
        depth: 0,
        overrideAccess: true,
      });
      if (decision === "approve") {
        // Publishing approves it; its post state goes back to Draft ("not waiting for review"), or the published job
        // stayed in the jobs queue and its count (founder QC, 17 Nov 2026).
        await payload.update({
          collection: "jobs",
          id: Number(id),
          data: {
            _status: "published",
            postedAt: new Date().toISOString(),
            post: { ...job.post, state: "Draft" },
          } as never,
          overrideAccess: true,
        });
        if (to)
          await sendJobLive(to, {
            name: item.submitter?.name ?? "",
            reference: item.reference,
            role: job.role,
            closes: job.closesAt
              ? new Date(job.closesAt).toLocaleDateString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "",
            jobUrl: absolute(`/opportunities/jobs/${job.slug}`),
          });
      } else {
        await payload.update({
          collection: "jobs",
          id: Number(id),
          data: { post: { ...job.post, state: "Draft" } } as never,
          draft: true,
          overrideAccess: true,
        });
        if (decision === "changes" && to)
          await sendChangesNeeded(to, {
            name: item.submitter?.name ?? "",
            reference: item.reference,
            title: job.role,
            changes: text,
            listed: "publish",
          });
      }
      return;
    }
    const sub = await payload.findByID({ collection: "submissions", id: Number(id), depth: 0, overrideAccess: true });
    if (queue === "inbox") {
      // The operator has replied by email (or there's nothing to say): the message is closed, nothing is sent.
      await payload.update({
        collection: "submissions",
        id: Number(id),
        data: { status: decision === "approve" ? "Answered" : "Declined", reviewNote: text || null },
        overrideAccess: true,
      });
      return;
    }
    const status = decision === "approve" ? "Published" : decision === "changes" ? "Needs changes" : "Declined";
    // Write for us doesn't need an account: someone who sent it signed out is answered at the email they gave
    // (founder QC, 17 Nov 2026: they were never told).
    const reply = to ?? (sub.contactEmail ? { email: sub.contactEmail, userId: null as string | null } : null);
    const replyName = item.submitter?.name ?? sub.contactName ?? "";
    if (queue === "events" && decision === "approve") {
      const v = (sub.details ?? {}) as Record<string, string | undefined>;
      const venue = v.venue ?? "";
      const city =
        venue
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
          .pop() ?? "";
      const event = await payload.create({
        collection: "events",
        data: {
          name: sub.title,
          organiser: v.organiser ?? "",
          eventType: v.type ?? "Conference and expo",
          attendance: v.format ?? "In person",
          startsAt: v.startDate ? new Date(`${v.startDate}T09:00:00+05:30`).toISOString() : new Date().toISOString(),
          endsAt: v.endDate ? new Date(`${v.endDate}T18:00:00+05:30`).toISOString() : null,
          venue: v.format === "Online" ? null : venue,
          city: v.format === "Online" ? null : city,
          registrationUrl: v.link ?? null,
          // The organiser's page is the link they submitted (checkEvent requires it).
          sourceUrl: v.link ?? "",
          description: v.description ?? null,
          _status: "published",
        } as never,
        overrideAccess: true,
      });
      if (to)
        await sendEventLive(to, {
          name: item.submitter?.name ?? "",
          reference: item.reference,
          event: sub.title,
          typeAndDate: [v.type, fmtDay(v.startDate ?? "")].filter(Boolean).join(" · "),
          place: v.format === "Online" ? "Online" : venue,
          eventUrl: absolute(`/events/${event.slug}`),
          featuredUrl: absolute("/advertise"),
        });
    }
    await payload.update({
      collection: "submissions",
      id: Number(id),
      data: { status, reviewNote: text || null },
      overrideAccess: true,
    });
    if (decision === "changes" && reply)
      await sendChangesNeeded(reply, {
        name: replyName,
        reference: item.reference,
        title: item.title,
        changes: text,
        listed: item.listed,
      });
    // A decline or an approval used to be silent. In the app only, for people with an account, until the email wording
    // is approved (M21); a failed notice never undoes the decision.
    if (decision !== "changes" && to?.userId)
      await notify({
        event: decision === "approve" ? "submission.approved" : "submission.declined",
        topic: "company.verification",
        userId: to.userId,
        inApp: {
          category: "account",
          icon: decision === "approve" ? "check-circle" : "alert-circle",
          title:
            decision === "approve"
              ? queue === "events"
                ? `${sub.title} is live`
                : `${sub.title} is approved. Our editors will publish it.`
              : `${sub.title} wasn't accepted`,
          body: decision === "approve" ? undefined : text,
          // A company's submissions are listed on its Content page; others have no page to open.
          href: sub.organisationId ? "/supplier/content" : undefined,
        },
      }).catch((e: unknown) => {
        console.error("submission notice failed", e);
      });
  };
  try {
    await decideItem(
      getDb(),
      actor,
      { queue, subjectId: id, decision, reasons: text ? [text] : [] },
      apply,
      await requestContext(),
    );
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/admin/queues/${queue}`);
  return { ok: true };
}

/** A moderator's comment on one field (633:8): internal, never sent to the submitter. */
export async function commentAction(queue: QueueKey, id: string, field: string, note: string): Promise<R> {
  const { actor } = await operator();
  try {
    await addFieldComment(getDb(), actor, { queue, subjectId: id, field, note }, await requestContext());
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/admin/queues/${queue}/${id}`);
  return { ok: true };
}

/** Save view: the current view and search under a name, for this operator only. */
export async function saveViewAction(queue: QueueKey, name: string, view: string, search: string): Promise<R> {
  const { actor } = await operator();
  try {
    await saveQueueView(getDb(), actor, { queue, name, view, search });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/admin/queues/${queue}`);
  return { ok: true };
}

export async function deleteViewAction(queue: QueueKey, id: string): Promise<R> {
  const { actor } = await operator();
  await deleteQueueView(getDb(), actor, id);
  revalidatePath(`/admin/queues/${queue}`);
  return { ok: true };
}
