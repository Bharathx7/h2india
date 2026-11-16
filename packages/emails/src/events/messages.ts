import type { NoticeProps } from "../notice";

// Webinar registration and its reminder and replay variants (676:83), and Submission received (673:352), step 5.7.
// Words as drawn. The reminder subjects ("Starts tomorrow", "Starts in 1 hour") and the replay ("Watch the replay")
// are the variants listed on 676:83.

type Message = Omit<NoticeProps, "appUrl"> & { subject: string };

export interface WebinarDetails {
  name: string;
  title: string;
  /** "Thursday 26 Nov 2026" */
  date: string;
  /** "4:00 to 5:00 PM IST" */
  time: string;
  /** "26 Nov at 4 PM IST" for the subject. */
  short: string;
  joinUrl: string;
  host: string;
  calendar: { google: string; outlook: string; ics: string };
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

function rows(w: WebinarDetails) {
  return [
    { label: "Date", value: w.date },
    { label: "Time", value: w.time },
    { label: "Where", value: "Online, in your browser" },
    { label: "Join link", value: w.joinUrl.replace(/^https?:\/\//, "") },
    ...(w.host ? [{ label: "Host", value: w.host }] : []),
    { label: "Replay", value: "We'll email it to you afterwards" },
  ];
}

const calendarLinks = (w: WebinarDetails) => [
  { label: "Google Calendar", href: w.calendar.google },
  { label: "Outlook", href: w.calendar.outlook },
  { label: "Apple (.ics)", href: w.calendar.ics },
];

export function webinarRegisteredMessage(w: WebinarDetails): Message {
  return {
    subject: `You're registered: ${w.title}, ${w.short}`,
    preview: "Add it to your calendar. Your join link is inside.",
    reason: "You're getting this because you registered for this webinar.",
    eyebrow: "Webinar · registered",
    headline: "You're registered",
    paragraphs: [`Hi ${firstName(w.name)}, see you at ${w.title}.`],
    rows: rows(w),
    button: { label: "Add to calendar", href: w.calendar.ics },
    links: calendarLinks(w),
  };
}

export function webinarReminderMessage(w: WebinarDetails, which: "day" | "hour"): Message {
  const when = which === "day" ? "Starts tomorrow" : "Starts in 1 hour";
  return {
    subject: `${when}: ${w.title}`,
    preview: which === "day" ? `Tomorrow, ${w.time}. Your join link is inside.` : "Join from your phone or laptop.",
    reason: "You're getting this because you registered for this webinar.",
    eyebrow: `Webinar · ${when.toLowerCase()}`,
    headline: when,
    paragraphs: [
      `Hi ${firstName(w.name)}, ${w.title} starts ${which === "day" ? `tomorrow, ${w.time}` : `at ${w.time.split(" to ")[0] ?? w.time} IST`}.`,
    ],
    rows: rows(w).filter((r) => r.label !== "Replay"),
    button: { label: "Join webinar", href: w.joinUrl },
  };
}

export function webinarReplayMessage(input: { name: string; title: string; url: string }): Message {
  return {
    subject: `Watch the replay: ${input.title}`,
    preview: "The recording and slides are ready.",
    reason: "You're getting this because you registered for this webinar.",
    eyebrow: "Webinar · replay",
    headline: "Watch the replay",
    paragraphs: [`Hi ${firstName(input.name)}, the recording and slides of ${input.title} are ready.`],
    button: { label: "Watch the replay", href: input.url },
    note: "The link is yours: it opens the replay without a password.",
  };
}

export type SubmissionKind =
  "event" | "press_release" | "correction" | "pitch" | "contact" | "partnership" | "advertising";

const SUBMISSION_WORDS: Record<SubmissionKind, { noun: string; headline: string; review: string }> = {
  event: {
    noun: "event",
    headline: "Thanks, your event is under review",
    review: "we usually review events within 1 working day and email you when it's live.",
  },
  press_release: {
    noun: "press release",
    headline: "Thanks, your press release is under review",
    review:
      "we review within 1 working day. We'll either publish it with a Press release label or email you about changes.",
  },
  correction: {
    noun: "correction",
    headline: "Thanks, we've received your correction",
    review: "we'll check it against the source and tell you the outcome.",
  },
  contact: {
    noun: "message",
    headline: "Thanks, we've got your message",
    review: "the right team will reply, most within 1 working day.",
  },
  partnership: {
    noun: "proposal",
    headline: "Thanks, we've got your proposal",
    review: "we read every proposal and reply within 3 working days, yes or no.",
  },
  advertising: {
    noun: "enquiry",
    headline: "Thanks, we've got your enquiry",
    review: "we reply within 2 working days.",
  },
  pitch: {
    noun: "pitch",
    headline: "Thanks, your pitch is with our editors",
    review: "an editor will reply by email, whether or not we take it.",
  },
};

export function submissionReceivedMessage(input: {
  kind: SubmissionKind;
  name: string;
  reference: string;
  title: string;
  rows: { label: string; value: string }[];
  url: string;
}): Message {
  const w = SUBMISSION_WORDS[input.kind];
  return {
    subject: `We've received your ${w.noun}: ${input.title}`,
    preview: `Reference ${input.reference}. We usually review within 1 working day.`,
    reason: `You're getting this because you submitted ${/^[aeiou]/.test(w.noun) ? "an" : "a"} ${w.noun} to H2 Economy.`,
    eyebrow: `Submission · ${input.reference}`,
    headline: w.headline,
    paragraphs: [`Hi ${firstName(input.name)}, ${w.review}`],
    rows: [{ label: "Reference", value: input.reference }, ...input.rows, { label: "Status", value: "Under review" }],
    button: { label: "View your submission", href: input.url },
  };
}
