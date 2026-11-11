import type { NoticeProps } from "../notice";

// Join messages (step 3.3). Page 16 draws none of them (decision M21), so the wording reuses the screens' own copy
// where it exists (Join request 365:27779, Verify email 365:27778).

type Message = Omit<NoticeProps, "appUrl"> & { subject: string };

export function verifyEmailMessage(input: { email: string; url: string }): Message {
  return {
    subject: "Confirm your email for H2 India",
    preview: "The link works for 24 hours.",
    reason: "You're getting this because someone used this email address to join H2 India.",
    eyebrow: "Confirm your email",
    headline: "Confirm your email",
    paragraphs: [`Open this link to confirm ${input.email} and finish joining H2 India. The link works for 24 hours.`],
    button: { label: "Confirm email", href: input.url },
    note: "Didn't try to join? You can ignore this email.",
  };
}

export function joinRequestToAdminMessage(input: {
  adminName: string;
  requesterName: string;
  requesterEmail: string;
  company: string;
  url: string;
  reminder: boolean;
}): Message {
  return {
    subject: `${input.reminder ? "Reminder: " : ""}${input.requesterName} asked to join ${input.company} on H2 India`,
    preview: "A company admin approves each request to join.",
    reason: `You're getting this because you're an admin of ${input.company} on H2 India.`,
    eyebrow: "Join request",
    headline: `${input.requesterName} asked to join ${input.company}`,
    paragraphs: [
      `Hi ${input.adminName || "there"}, ${input.requesterName} (${input.requesterEmail}) asked to join ${input.company} on H2 India. A company admin approves each request to join.`,
      "Requests expire after 14 days without an answer.",
    ],
    button: { label: "Review the request", href: input.url },
  };
}

export function joinRequestAnsweredMessage(input: {
  approved: boolean;
  adminName: string;
  company: string;
  reason?: string | null;
  url: string;
}): Message {
  return input.approved
    ? {
        subject: `You're now part of ${input.company} on H2 India`,
        preview: `${input.adminName} approved your request.`,
        reason: "You're getting this because you asked to join a company on H2 India.",
        eyebrow: "Join request",
        headline: "You're in",
        paragraphs: [`${input.adminName} approved your request. You're now part of ${input.company}.`],
        button: { label: "Go to your workspace", href: input.url },
      }
    : {
        subject: `Your request to join ${input.company} wasn't approved`,
        preview: `${input.adminName} didn't approve your request.`,
        reason: "You're getting this because you asked to join a company on H2 India.",
        eyebrow: "Join request",
        headline: "Your request wasn't approved",
        paragraphs: [
          `${input.adminName} didn't approve your request to join ${input.company}.`,
          ...(input.reason ? [`Reason from the admin: "${input.reason}"`] : []),
        ],
        button: { label: "See your options", href: input.url },
      };
}
