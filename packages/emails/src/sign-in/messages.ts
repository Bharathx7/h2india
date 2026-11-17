import type { NoticeProps } from "../notice";

// Staff password link (17 Nov 2026: the back office signs in with email and password; passkeys removed). Page 16 draws
// no such message (decision M21), so the wording is plain and listed in docs/decisions.md (A183) for the founder.

type Message = Omit<NoticeProps, "appUrl"> & { subject: string };

export function staffPasswordLinkMessage(input: { url: string; name?: string; minutes: number }): Message {
  return {
    subject: "Set your H2 Economy back-office password",
    preview: `The link works for ${String(input.minutes)} minutes.`,
    reason:
      "You're getting this because someone asked to set or reset the back-office password for this email address.",
    eyebrow: "Back office",
    headline: "Set your password",
    paragraphs: [
      `${input.name ? `Hi ${input.name}, open` : "Open"} this link to choose a password for the H2 Economy back office. The link works for ${String(input.minutes)} minutes and only once.`,
    ],
    button: { label: "Set password", href: input.url },
    note: "Didn't ask for this? You can ignore this email; your password hasn't changed.",
  };
}
