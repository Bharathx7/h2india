import { schema } from "@h2india/db";
import type { TemplateId, TextTemplateId } from "@h2india/emails/registry";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { deliverEmail, deliverWhatsApp, recordSkipped, TemplateNotApprovedError, type RenderedEmail } from "./channels";
import { createInApp, type InAppInput } from "./inapp";
import { getChoices, getNotifySettings, quietUntil } from "./preferences";
import { TOPICS, type TopicName } from "./topics";

// notify(): one event to one person, on every channel they chose (step 3.9). Each message is checked against their
// choices for the topic (577:288, 548:8), "Unsubscribe from everything" and quiet hours, and every outcome is logged.

const { users: u } = schema;

export interface NotifyInput {
  /** For example join.request or quote.received. */
  event: string;
  topic: TopicName;
  userId: string;
  /** The company whose settings apply (577:288), when the person has company-specific choices. */
  scope?: string;
  email?: { template: TemplateId; mail: RenderedEmail };
  whatsapp?: { template: TextTemplateId; data: Record<string, string> };
  inApp?: Omit<InAppInput, "userId" | "event" | "visibleAt">;
}

export type Outcome = "Sent" | "Skipped" | "Waiting" | "Shown";

export async function notify(input: NotifyInput, now: Date = new Date()) {
  const db = getDb();
  const [person] = await db
    .select({ email: u.email, mobile: u.mobile, mobileVerifiedAt: u.mobileVerifiedAt })
    .from(u)
    .where(eq(u.id, input.userId));
  if (!person) return {};
  const topic = TOPICS[input.topic];
  const choices = (await getChoices(db, input.userId, input.scope))[input.topic];
  const settings = await getNotifySettings(db, input.userId);
  const quiet = quietUntil(settings, now);
  const unsubscribed = settings.unsubscribedAll && "marketing" in topic && topic.marketing;
  const out: Partial<Record<"email" | "whatsapp" | "in_app", Outcome>> = {};

  if (input.email) {
    const reason = !choices.email ? "preference_off" : unsubscribed ? "unsubscribed" : null;
    if (reason) {
      await recordSkipped({
        ...input.email,
        event: input.event,
        userId: input.userId,
        channel: "email",
        recipient: person.email,
        reason,
      });
      out.email = "Skipped";
    } else {
      await deliverEmail({ ...input.email, to: person.email, event: input.event, userId: input.userId });
      out.email = "Sent";
    }
  }

  if (input.whatsapp) {
    const reason = !choices.whatsapp
      ? "preference_off"
      : settings.unsubscribedAll
        ? "unsubscribed"
        : !person.mobile || !person.mobileVerifiedAt
          ? "no_address"
          : null;
    if (reason) {
      await recordSkipped({
        ...input.whatsapp,
        event: input.event,
        userId: input.userId,
        channel: "whatsapp",
        recipient: person.mobile,
        reason,
      });
      out.whatsapp = "Skipped";
    } else {
      try {
        out.whatsapp = await deliverWhatsApp(
          { ...input.whatsapp, to: person.mobile ?? "", event: input.event, userId: input.userId },
          { sendAfter: quiet ?? undefined },
        );
      } catch (error) {
        // Not approved by the provider yet (A25): the refusal is logged; the other channels still go.
        if (!(error instanceof TemplateNotApprovedError)) throw error;
        out.whatsapp = "Skipped";
      }
    }
  }

  if (input.inApp) {
    if (!choices.in_app) {
      out.in_app = "Skipped";
    } else {
      await createInApp(db, { ...input.inApp, userId: input.userId, event: input.event, visibleAt: quiet ?? now });
      out.in_app = quiet ? "Waiting" : "Shown";
    }
  }
  return out;
}
