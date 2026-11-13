"use server";

import config from "@payload-config";
import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { sendChangesNeeded, sendEventLive, sendJobLive } from "@h2india/core/notify";
import { claimItem, decideItem, QueueError, type Decision, type QueueKey } from "@h2india/core/queues";
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
        await payload.update({
          collection: "jobs",
          id: Number(id),
          data: { _status: "published", postedAt: new Date().toISOString() } as never,
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
    const status = decision === "approve" ? "Published" : decision === "changes" ? "Needs changes" : "Declined";
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
    if (decision === "changes" && to)
      await sendChangesNeeded(to, {
        name: item.submitter?.name ?? "",
        reference: item.reference,
        title: item.title,
        changes: text,
        listed: item.listed,
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
