import { getDb, audit } from "@h2india/core";
import { APIError, type Payload } from "payload";
import { ALWAYS_LEGAL, type WorkflowStatus } from "./types";

// The editorial workflow (step 4.2, 638:8, 639:8, 626:8): Draft → In review → Legal check → Scheduled → Published,
// with corrections after publishing. Every change goes through transitionArticle(), which checks the rule and the
// person's permission and writes the audit log. Payload's own Publish button is replaced by this.

export type Action =
  | "submit"
  | "back-to-draft"
  | "send-to-legal"
  | "pass-legal"
  | "schedule"
  | "unschedule"
  | "publish"
  | "unpublish"
  | "correct"
  | "live-update";

interface Rule {
  from: WorkflowStatus[];
  to: WorkflowStatus | null;
  needs: "content.edit" | "content.publish";
}

export const RULES: Record<Action, Rule> = {
  submit: { from: ["Draft"], to: "In review", needs: "content.edit" },
  "back-to-draft": { from: ["In review", "Legal check", "Scheduled"], to: "Draft", needs: "content.edit" },
  "send-to-legal": { from: ["In review"], to: "Legal check", needs: "content.edit" },
  // The Editor-in-chief passes the legal check (A27); the piece returns to review, ready to schedule or publish.
  "pass-legal": { from: ["Legal check"], to: "In review", needs: "content.publish" },
  schedule: { from: ["In review"], to: "Scheduled", needs: "content.publish" },
  unschedule: { from: ["Scheduled"], to: "In review", needs: "content.publish" },
  publish: { from: ["In review", "Scheduled"], to: "Published", needs: "content.publish" },
  unpublish: { from: ["Published"], to: "Draft", needs: "content.publish" },
  correct: { from: ["Published"], to: null, needs: "content.publish" },
  // Step 5.3: a published live explainer takes new updates (801:7492) without going back through review. Only the
  // live block is published; any other unpublished edit stays a draft.
  "live-update": { from: ["Published"], to: null, needs: "content.edit" },
};

export interface Actor {
  /** The editors document id, or null for the scheduler. */
  editorId: number | string | null;
  h2UserId: string | null;
  permissions: string[];
}

export const SCHEDULER: Actor = { editorId: null, h2UserId: null, permissions: ["content.publish"] };

interface ArticleDoc {
  id: number | string;
  title: string;
  type: string;
  workflow?: WorkflowStatus | null;
  publishAt?: string | null;
  sources?: unknown[] | null;
  legal?: { flagged?: boolean | null; passedAt?: string | null } | null;
  corrections?: { date: string; note: string }[] | null;
}

export function needsLegal(doc: Pick<ArticleDoc, "type" | "legal">): boolean {
  return ALWAYS_LEGAL.includes(doc.type) || Boolean(doc.legal?.flagged);
}

export async function transitionArticle(
  payload: Payload,
  input: { id: string | number; action: Action; actor: Actor; publishAt?: string; note?: string; now?: Date },
): Promise<ArticleDoc> {
  const rule = RULES[input.action] as Rule | undefined;
  if (!rule) throw new APIError("Unknown action", 400, null, true);
  if (!input.actor.permissions.includes(rule.needs)) {
    throw new APIError(
      rule.needs === "content.publish" ? "Only an Editor-in-chief can do this." : "You can't change this article.",
      403,
      null,
      true,
    );
  }
  const doc = (await payload.findByID({
    collection: "articles",
    id: input.id,
    draft: true,
    depth: 0,
    overrideAccess: true,
  })) as unknown as ArticleDoc;
  const from = doc.workflow ?? "Draft";
  if (!rule.from.includes(from)) {
    throw new APIError(`An article that is ${from.toLowerCase()} can't do that.`, 400, null, true);
  }
  const now = input.now ?? new Date();
  const legalPending = needsLegal(doc) && !doc.legal?.passedAt;
  const data: Record<string, unknown> = {};
  let publish = false;

  switch (input.action) {
    case "pass-legal":
      data.legal = { ...(doc.legal ?? {}), passedAt: now.toISOString(), passedBy: input.actor.editorId };
      break;
    case "schedule": {
      if (legalPending) throw new APIError("This piece needs a legal check before it's scheduled.", 400, null, true);
      const at = new Date(input.publishAt ?? doc.publishAt ?? "");
      if (Number.isNaN(at.getTime()) || at <= now) {
        throw new APIError("Pick a publishing time in the future.", 400, null, true);
      }
      data.publishAt = at.toISOString();
      break;
    }
    case "publish":
      if (legalPending) throw new APIError("This piece needs a legal check before it's published.", 400, null, true);
      if (!(doc.sources ?? []).length)
        throw new APIError("Add at least one source before publishing.", 400, null, true);
      publish = true;
      data.publishedAt = now.toISOString();
      break;
    case "back-to-draft":
    case "unpublish":
      // Any change after a legal check needs a new one.
      if (needsLegal(doc)) data.legal = { ...(doc.legal ?? {}), passedAt: null, passedBy: null };
      break;
    case "correct": {
      const note = input.note?.trim();
      if (!note) throw new APIError("Write what was corrected.", 400, null, true);
      data.corrections = [...(doc.corrections ?? []), { date: now.toISOString(), note, by: input.actor.editorId }];
      publish = true;
      await payload.create({
        collection: "corrections",
        data: {
          article: Number(doc.id),
          status: "Resolved",
          source: "editor",
          description: note,
          resolvedAt: now.toISOString(),
        },
        overrideAccess: true,
      });
      break;
    }
    case "live-update": {
      const live = (doc as { live?: { status?: string | null } }).live;
      if (live?.status !== "live" && live?.status !== "ended") {
        throw new APIError(
          "Only a live explainer takes live updates. Set Live explainer › Status first.",
          400,
          null,
          true,
        );
      }
      data.live = live;
      publish = true;
      break;
    }
    default:
      break;
  }
  if (rule.to) data.workflow = rule.to;

  const updated = (await payload.update({
    collection: "articles",
    id: doc.id,
    data: {
      ...data,
      ...(publish ? { _status: "published" } : input.action === "unpublish" ? { _status: "draft" } : {}),
    },
    draft: !publish && input.action !== "unpublish",
    overrideAccess: true,
    context: { workflow: true },
  })) as unknown as ArticleDoc;

  await audit(getDb(), {
    actorId: input.actor.h2UserId,
    action: `article.${input.action}`,
    resourceType: "article",
    resourceId: String(doc.id),
    before: { status: from },
    after: { status: updated.workflow ?? from, ...(input.action === "schedule" ? { publishAt: data.publishAt } : {}) },
    reason: input.note ?? null,
  });
  return updated;
}

/** Publishes every scheduled article whose time has come (the worker calls this every minute). */
export async function publishDue(payload: Payload, now: Date = new Date()): Promise<string[]> {
  const due = await payload.find({
    collection: "articles",
    where: { and: [{ workflow: { equals: "Scheduled" } }, { publishAt: { less_than_equal: now.toISOString() } }] },
    draft: true,
    depth: 0,
    limit: 100,
    overrideAccess: true,
  });
  const done: string[] = [];
  for (const doc of due.docs) {
    try {
      await transitionArticle(payload, { id: doc.id, action: "publish", actor: SCHEDULER, now });
      done.push(String(doc.id));
    } catch (error) {
      console.error(`publish-due ${String(doc.id)}:`, error);
    }
  }
  return done;
}

/** The publishing calendar on Overview (626:8): what is scheduled, published, in review or in legal check. */
export async function publishingCalendar(payload: Payload, from: Date, to: Date) {
  const res = await payload.find({
    collection: "articles",
    where: {
      or: [
        {
          and: [
            { publishAt: { greater_than_equal: from.toISOString() } },
            { publishAt: { less_than: to.toISOString() } },
          ],
        },
        {
          and: [
            { publishedAt: { greater_than_equal: from.toISOString() } },
            { publishedAt: { less_than: to.toISOString() } },
          ],
        },
        { workflow: { in: ["In review", "Legal check"] } },
      ],
    },
    draft: true,
    depth: 0,
    limit: 500,
    overrideAccess: true,
    select: { title: true, type: true, workflow: true, publishAt: true, publishedAt: true },
  });
  return res.docs.map((d) => ({
    id: d.id,
    title: d.title,
    type: d.type,
    status: d.workflow ?? "Draft",
    at: d.workflow === "Published" ? d.publishedAt : d.publishAt,
  }));
}
