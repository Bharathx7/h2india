// The words shown when a person makes a consent choice inside their account (step 12.2), and their version. Pure, so
// pages show exactly what is recorded. Bump a version whenever its words change; old records keep the old words.

/** Members directory listing (548:8 "Who can see this", M24). */
export const DIRECTORY_CONSENT_VERSION = "2026-11-15";

export function directoryConsentWording(persona: string | null): string {
  return `Public: signed-in members can see your name, headline, interests and ${
    persona === "researcher" ? "research" : "profile"
  } details. Your email and phone number are never shown.`;
}

/** Marketing messages: newsletters, alerts and the like, per topic and channel (548:8). */
export const MARKETING_CONSENT_VERSION = "2026-11-16";

export function marketingConsentWording(topicLabel: string, channel: string): string {
  const how = channel === "whatsapp" ? "on WhatsApp" : channel === "in_app" ? "in H2 Economy" : "by email";
  return `${topicLabel}: send me these ${how}. Turn it off here at any time.`;
}
