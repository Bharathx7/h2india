import type { NoticeProps } from "../notice";

// Moderation outcomes (step 11.2): Your event is live (831:1080, the published variant of Submission received), the
// "needs details" note shown in the email preview on 633:567, and Your job post is live (preview on 633:1059).

type Message = Omit<NoticeProps, "appUrl"> & { subject: string };
const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

export function eventLiveMessage(d: {
  name: string;
  reference: string;
  event: string;
  typeAndDate: string;
  place: string;
  eventUrl: string;
  featuredUrl: string;
}): Message {
  return {
    subject: `Your event is live: ${d.event}`,
    preview: "It's on the H2 India events listing now. Share the link or make it Featured.",
    reason: "You're getting this because you submitted an event to H2 India.",
    eyebrow: `Published · ${d.reference}`,
    headline: "Your event is live",
    paragraphs: [
      `Hi ${first(d.name)}, we've checked and published your event. People can now find it on the events listing and add it to their calendar.`,
    ],
    rows: [
      { label: "Reference", value: d.reference },
      { label: "Event", value: d.event },
      { label: "Type and date", value: d.typeAndDate },
      { label: "Place", value: d.place },
      { label: "Status", value: "Published" },
    ].filter((r) => r.value),
    button: { label: "View your event", href: d.eventUrl },
    links: [{ label: "Make it Featured (paid)", href: d.featuredUrl }],
  };
}

export function changesNeededMessage(d: {
  name: string;
  reference: string;
  title: string;
  changes: string;
  listed: string;
}): Message {
  return {
    subject: `${d.reference} needs a few details`,
    preview: d.changes.slice(0, 120),
    reason: `You're getting this because you submitted ${d.reference} to H2 India.`,
    eyebrow: `${d.reference} · Changes needed`,
    headline: `${d.reference} needs a few details`,
    paragraphs: [`Hi ${first(d.name)}, before we ${d.listed} ${d.title}, please make these changes.`, d.changes],
    rows: [
      { label: "Reference", value: d.reference },
      { label: "Status", value: "Changes needed" },
    ],
  };
}

export function jobLiveMessage(d: {
  name: string;
  reference: string;
  role: string;
  closes: string;
  jobUrl: string;
}): Message {
  return {
    subject: "Your job post is live",
    preview: `"${d.role}" is now on H2 India Jobs.`,
    reason: `You're getting this because you posted ${d.reference} on H2 India.`,
    eyebrow: `Published · ${d.reference}`,
    headline: "Your job post is live",
    paragraphs: [`Hi ${first(d.name)}, "${d.role}" is now on H2 India Jobs${d.closes ? ` until ${d.closes}` : ""}.`],
    rows: [
      { label: "Reference", value: d.reference },
      { label: "Job", value: d.role },
      { label: "Status", value: "Published" },
    ],
    button: { label: "View your job", href: d.jobUrl },
  };
}
