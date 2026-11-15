import { schema, type Executor } from "@h2india/db";
import { and, desc, eq } from "drizzle-orm";
import { TOPICS, type NotifyChannel, type TopicName } from "../notify/topics";
import {
  DIRECTORY_CONSENT_VERSION,
  directoryConsentWording,
  MARKETING_CONSENT_VERSION,
  marketingConsentWording,
} from "./wording";

// Consent records inside an account (step 12.2): one row per choice made, with the words and their version. Written in
// the same transaction as the choice itself, only when the choice changes.

const c = schema.consentRecords;

export async function recordDirectoryConsent(
  ex: Executor,
  input: { userId: string; granted: boolean; persona: string | null },
) {
  await ex.insert(c).values({
    userId: input.userId,
    purpose: "member-directory",
    granted: input.granted,
    wording: directoryConsentWording(input.persona),
    version: DIRECTORY_CONSENT_VERSION,
    source: "profile",
  });
}

/** Records changed marketing choices; transactional topics (orders, security) aren't consents and are skipped. */
export async function recordMarketingChoices(
  ex: Executor,
  userId: string,
  changes: { topic: TopicName; channel: NotifyChannel; enabled: boolean }[],
) {
  const rows = changes.flatMap((ch) => {
    const topic = TOPICS[ch.topic] as { label: string; marketing?: boolean } | undefined;
    if (!topic?.marketing) return [];
    return [
      {
        userId,
        purpose: `marketing:${ch.topic}:${ch.channel}`,
        granted: ch.enabled,
        wording: marketingConsentWording(topic.label, ch.channel),
        version: MARKETING_CONSENT_VERSION,
        source: "preferences",
      },
    ];
  });
  if (rows.length) await ex.insert(c).values(rows);
}

/** A person's consent history, newest first (Download my data, data-rights requests). */
export async function consentHistory(ex: Executor, userId: string, purpose?: string) {
  return ex
    .select()
    .from(c)
    .where(and(eq(c.userId, userId), purpose ? eq(c.purpose, purpose) : undefined))
    .orderBy(desc(c.at));
}
