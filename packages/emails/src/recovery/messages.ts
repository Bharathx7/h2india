import type { NoticeProps } from "../notice";

// Recovery messages (step 3.5). "Passkey reset, admin notified" is drawn (831:1148); the rest are not (decision M21,
// default wording A9), so they reuse the recovery screens' own copy.

type Message = Omit<NoticeProps, "appUrl"> & { subject: string };

export function passkeyResetMessage(input: {
  adminName: string;
  person: string;
  company: string;
  supportEmail: string;
}): Message {
  return {
    subject: `${input.person} reset their passkey`,
    preview: "No action is needed if you expected this.",
    reason: `You're getting this because you're an admin of ${input.company} on H2 Economy.`,
    eyebrow: `Security · ${input.company}`,
    headline: "A team member reset their passkey",
    paragraphs: [
      `Hi ${input.adminName || "there"}, ${input.person} couldn't use their passkey and recovered their account. No action is needed if you expected this.`,
    ],
    button: { label: "Not expected? Contact H2 Economy support", href: `mailto:${input.supportEmail}` },
  };
}

export function recoveryApprovalMessage(input: {
  adminName: string;
  person: string;
  company: string;
  what: "mobile" | "email";
  url: string;
}): Message {
  const mobile = input.what === "mobile";
  return {
    subject: mobile ? `Approve ${input.person}'s new mobile number` : `Confirm it's ${input.person}`,
    preview: mobile ? "Their new number waits for your approval." : "They lost access to their work email.",
    reason: `You're getting this because you're an admin of ${input.company} on H2 Economy.`,
    eyebrow: `Security · ${input.company}`,
    headline: mobile ? "Approve a new mobile number" : "Confirm a team member",
    paragraphs: [
      mobile
        ? `Hi ${input.adminName || "there"}, ${input.person} changed their mobile number. It takes effect when you approve it.`
        : `Hi ${input.adminName || "there"}, ${input.person} lost access to their work email and verified their mobile. Confirm it's them so they can add a new work email.`,
      "If you didn't expect this, decline it and contact H2 Economy support.",
    ],
    button: { label: "Review the request", href: input.url },
  };
}

export function supportRequestMessage(input: {
  reference: string;
  name: string;
  company: string;
  contactEmail: string;
  kind: string;
  url: string;
}): Message {
  return {
    subject: `${input.reference}: ${input.kind}`,
    preview: `${input.name} at ${input.company}`,
    reason: "You're getting this because you handle H2 Economy support requests (decision A16).",
    eyebrow: `Support request · ${input.reference}`,
    headline: input.kind,
    paragraphs: [
      `Name: ${input.name}`,
      `Company: ${input.company}`,
      `Reply to: ${input.contactEmail}`,
      "Check their ID with the company before you act. Answer within 2 working days.",
    ],
    button: { label: "Open the request", href: input.url },
  };
}

export function supportReceivedMessage(input: { reference: string; company: string }): Message {
  return {
    subject: `We've got your request (${input.reference})`,
    preview: "We'll reply within 2 working days.",
    reason: "You're getting this because you sent H2 Economy a support request.",
    eyebrow: `Reference · ${input.reference}`,
    headline: "We've got your request",
    paragraphs: [`Our support team will check your ID with ${input.company} and email you within 2 working days.`],
  };
}

export function newEmailMessage(input: { email: string; url: string }): Message {
  return {
    subject: "Confirm your new work email for H2 Economy",
    preview: "The link works for 24 hours.",
    reason: "You're getting this because this address was added to an H2 Economy account.",
    eyebrow: "Confirm your email",
    headline: "Confirm your new work email",
    paragraphs: [`Open this link to make ${input.email} your sign-in email. The link works for 24 hours.`],
    button: { label: "Confirm email", href: input.url },
  };
}

export function mobileChangedMessage(input: { mobile: string }): Message {
  return {
    subject: "Your mobile number was changed",
    preview: `Your new number is ${input.mobile}.`,
    reason: "You're getting this because the mobile number on your H2 Economy account changed.",
    eyebrow: "Security",
    headline: "Your mobile number was changed",
    paragraphs: [`Your new mobile number is ${input.mobile}. If you didn't do this, contact H2 Economy support now.`],
  };
}
