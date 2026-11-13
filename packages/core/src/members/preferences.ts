import { randomBytes } from "node:crypto";
import { schema, type Database, type Executor } from "@h2india/db";
import { eq } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import { NEWSLETTER_CONSENT_VERSION, PREFERENCE_TOPICS } from "../newsletter";
import {
  getChoices,
  getNotifySettings,
  setChoices,
  setNotifySettings,
  type QuietSettings,
} from "../notify/preferences";
import type { NotifyChannel, TopicName } from "../notify/topics";

// Newsletters and notifications (548:8; phones 549:15), step 7.4. The notification choices are the ones notify() reads
// before every send (step 3.9), so turning a channel off takes effect on the next message. The newsletter rows use the
// member's own, already proved, account email: no second confirmation is needed (A152).

const n = schema.newsletterSubscribers;

/** The rows of the Notifications table on 548:8, in order. Account and security email can't be turned off. */
export const MEMBER_TOPICS: readonly TopicName[] = [
  "alert.matches",
  "follow.updates",
  "event.reminders",
  "account.security",
];

export interface MemberPreferences {
  newsletter: { weekly: boolean; tenderDigest: boolean };
  choices: Record<string, Record<NotifyChannel, boolean>>;
  quiet: QuietSettings;
}

export async function memberPreferences(db: Executor, userId: string): Promise<MemberPreferences> {
  const [person] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, userId));
  const [sub] = person ? await db.select().from(n).where(eq(n.email, person.email.toLowerCase())) : [];
  const [choices, quiet] = await Promise.all([getChoices(db, userId), getNotifySettings(db, userId)]);
  return {
    newsletter: { weekly: sub?.status === "confirmed", tenderDigest: sub?.status === "confirmed" && sub.tenderDigest },
    choices: Object.fromEntries(MEMBER_TOPICS.map((t) => [t, choices[t]])),
    quiet,
  };
}

export interface PreferencesInput {
  newsletter: { weekly: boolean; tenderDigest: boolean };
  choices: { topic: TopicName; channel: NotifyChannel; enabled: boolean }[];
  quiet: { quietHours: boolean; quietFrom: string; quietTo: string };
}

async function setNewsletter(
  db: Database,
  userId: string,
  want: { weekly: boolean; tenderDigest: boolean },
  context?: RequestContext,
) {
  const [person] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, userId));
  if (!person) return;
  const email = person.email.toLowerCase();
  const [sub] = await db.select().from(n).where(eq(n.email, email));
  const on = sub?.status === "confirmed";
  if (want.weekly && !on) {
    const values = {
      status: "confirmed",
      tenderDigest: want.tenderDigest,
      source: "preferences",
      consentVersion: NEWSLETTER_CONSENT_VERSION,
      confirmedAt: new Date(),
      unsubscribedAt: null,
      linkNonce: randomBytes(12).toString("base64url"),
    };
    const [row] = sub
      ? await db.update(n).set(values).where(eq(n.id, sub.id)).returning()
      : await db
          .insert(n)
          .values({ email, topics: [...PREFERENCE_TOPICS], ...values })
          .returning();
    if (row) {
      await audit(db, {
        actorId: userId,
        action: "newsletter.signup",
        resourceType: "newsletter_subscriber",
        resourceId: row.id,
        after: { source: "preferences", consentVersion: NEWSLETTER_CONSENT_VERSION, status: "confirmed" },
        context,
      });
    }
  } else if (!want.weekly && on) {
    await db.update(n).set({ status: "unsubscribed", unsubscribedAt: new Date() }).where(eq(n.id, sub.id));
    await audit(db, {
      actorId: userId,
      action: "newsletter.unsubscribed",
      resourceType: "newsletter_subscriber",
      resourceId: sub.id,
      before: { status: "confirmed" },
      after: { status: "unsubscribed", via: "preferences" },
      context,
    });
  } else if (want.weekly && sub && sub.tenderDigest !== want.tenderDigest) {
    await db.update(n).set({ tenderDigest: want.tenderDigest }).where(eq(n.id, sub.id));
  }
}

/** Save changes on 548:8. */
export async function saveMemberPreferences(
  db: Database,
  userId: string,
  input: PreferencesInput,
  context?: RequestContext,
) {
  await setChoices(
    db,
    userId,
    input.choices.filter((c) => MEMBER_TOPICS.includes(c.topic)),
  );
  await setNotifySettings(db, userId, input.quiet);
  await setNewsletter(db, userId, input.newsletter, context);
}

/** "Unsubscribe from all" (548:8): newsletters, alert emails and WhatsApp stop; sign-in and security email stays. */
export async function unsubscribeEverything(db: Database, userId: string, on: boolean, context?: RequestContext) {
  const before = await getNotifySettings(db, userId);
  await setNotifySettings(db, userId, { unsubscribedAll: on });
  if (on) await setNewsletter(db, userId, { weekly: false, tenderDigest: false }, context);
  if (before.unsubscribedAll !== on) {
    await audit(db, {
      actorId: userId,
      action: on ? "notify.unsubscribed_all" : "notify.resubscribed",
      resourceType: "user",
      resourceId: userId,
      before: { unsubscribedAll: before.unsubscribedAll },
      after: { unsubscribedAll: on },
      context,
    });
  }
}
