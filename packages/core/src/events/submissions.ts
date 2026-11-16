// The public submission forms (step 5.7): Submit an event 501:8485 (errors 502:1492), Submit a press release 504:8,
// Suggest a correction 504:455 and Write for us 504:985. Pure checks with the messages drawn; the limits are the
// counters on the frames ("0 / 2,000", "0 / 6,000", "0 / 1,000", "0 / 1,500"). No featured-event payment (F7).

export type SubmissionKind =
  "event" | "press_release" | "correction" | "pitch" | "contact" | "partnership" | "advertising";

export const SUBMISSION_PREFIX: Record<SubmissionKind, "EV" | "PR" | "COR" | "WFU" | "CON" | "PE" | "ADV"> = {
  event: "EV",
  press_release: "PR",
  correction: "COR",
  pitch: "WFU",
  contact: "CON",
  partnership: "PE",
  advertising: "ADV",
};

export const SUBMISSION_LIMITS = {
  eventDescription: 2000,
  pressHeadline: 120,
  pressBody: 6000,
  correction: 1000,
  pitchOutline: 1500,
  contactMessage: 2000,
  proposal: 1000,
  advertisingMessage: 1000,
  eventLogos: 1,
  pressImages: 5,
};

export const SUBMIT_EVENT_TYPES = [
  "Conference and expo",
  "Webinar",
  "Workshop and training",
  "Roundtable",
  "Site visit",
];
export const SUBMIT_FORMATS = ["In person", "Online", "Hybrid"];

export type Errors = Record<string, string>;
export interface Checked {
  title: string;
  details: Record<string, unknown>;
  contact: { name: string | null; email: string | null; phone: string | null };
}
export type Result = { ok: true; value: Checked } | { ok: false; errors: Errors };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_OK = /^https:\/\/[^\s/]+\.[^\s]+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const t = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const IST_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function checkEvent(input: Record<string, unknown>, now = new Date()): Result {
  const e: Errors = {};
  const title = t(input.title);
  const type = t(input.type);
  const description = t(input.description);
  const start = t(input.startDate);
  const end = t(input.endDate);
  const format = t(input.format);
  const venue = t(input.venue);
  const organiser = t(input.organiser);
  const link = t(input.link);
  if (title.length < 5) e.title = "Enter the event title";
  else if (title.length > 120) e.title = "Keep the title under 120 characters";
  if (!SUBMIT_EVENT_TYPES.includes(type)) e.type = "Choose a type";
  if (description.length < 20) e.description = "Describe the event in a few sentences";
  else if (description.length > SUBMISSION_LIMITS.eventDescription)
    e.description = "Keep the description under 2,000 characters";
  const today = IST_DAY.format(now);
  if (!DAY.test(start)) e.startDate = "Enter the start date";
  else if (start < today) e.startDate = "Enter a date from today";
  if (!DAY.test(end)) e.endDate = "Enter the end date";
  else if (DAY.test(start) && end < start) e.endDate = "The end date can't be before the start date";
  if (!SUBMIT_FORMATS.includes(format)) e.format = "Choose a format";
  if (format !== "Online" && venue.length < 3) e.venue = "Enter the venue and city";
  if (organiser.length < 2) e.organiser = "Enter the organiser";
  if (!URL_OK.test(link)) e.link = "Start the link with https://";
  if (Object.keys(e).length) return { ok: false, errors: e };
  return {
    ok: true,
    value: {
      title,
      details: {
        type,
        description,
        startDate: start,
        endDate: end,
        format,
        venue,
        organiser,
        link,
        logo: t(input.logo) || null,
      },
      contact: { name: null, email: null, phone: null },
    },
  };
}

export function checkPressRelease(input: Record<string, unknown>, now = new Date()): Result {
  const e: Errors = {};
  const company = t(input.company);
  const headline = t(input.headline);
  const body = t(input.body);
  const embargo = input.embargo === true;
  const day = t(input.embargoDate);
  const time = t(input.embargoTime);
  const images = Array.isArray(input.images) ? input.images.map(t).filter(Boolean) : [];
  const credit = t(input.credit);
  const name = t(input.contactName);
  const email = t(input.contactEmail).toLowerCase();
  const phone = t(input.contactPhone);
  if (company.length < 2) e.company = "Choose your company";
  if (headline.length < 10) e.headline = "Say what happened in a headline";
  else if (headline.length > SUBMISSION_LIMITS.pressHeadline) e.headline = "Keep the headline under 120 characters";
  if (body.length < 100) e.body = "Paste your release: start with the news, then the details";
  else if (body.length > SUBMISSION_LIMITS.pressBody) e.body = "Keep the release under 6,000 characters";
  let embargoAt: string | null = null;
  if (embargo) {
    if (!DAY.test(day) || !/^\d{2}:\d{2}$/.test(time)) e.embargoDate = "Enter the embargo date and time (IST)";
    else {
      const at = new Date(`${day}T${time}:00+05:30`);
      if (Number.isNaN(at.getTime()) || at <= now) e.embargoDate = "The embargo must be in the future";
      else embargoAt = at.toISOString();
    }
  }
  if (images.length > SUBMISSION_LIMITS.pressImages) e.images = "Add up to 5 images";
  if (images.length && credit.length < 3) e.credit = "Credit every image";
  if (name.length < 2) e.contactName = "Enter the media contact's name";
  if (!EMAIL.test(email)) e.contactEmail = "Enter an email, like press@company.in";
  if (Object.keys(e).length) return { ok: false, errors: e };
  return {
    ok: true,
    value: {
      title: headline,
      details: { company, headline, body, embargoAt, images, credit: credit || null },
      contact: { name, email, phone: phone || null },
    },
  };
}

export function checkCorrection(input: Record<string, unknown>): Result {
  const e: Errors = {};
  const page = t(input.page);
  const wrong = t(input.wrong);
  const correct = t(input.correct);
  const source = t(input.source);
  const email = t(input.email).toLowerCase();
  if (!page.startsWith("/") || page.length > 300) e.page = "Enter the page address, starting with /";
  if (wrong.length < 5) e.wrong = "Quote the sentence or figure that's wrong";
  else if (wrong.length > SUBMISSION_LIMITS.correction) e.wrong = "Keep it under 1,000 characters";
  if (correct.length < 2) e.correct = "Say what it should say";
  else if (correct.length > SUBMISSION_LIMITS.correction) e.correct = "Keep it under 1,000 characters";
  if (!URL_OK.test(source))
    e.source = "Link to an official notice, filing or the original report, starting with https://";
  if (email && !EMAIL.test(email)) e.email = "Enter an email, like you@example.com";
  if (Object.keys(e).length) return { ok: false, errors: e };
  return {
    ok: true,
    value: {
      title: `Correction to ${page}`,
      details: { page, wrong, correct, source },
      contact: { name: null, email: email || null, phone: null },
    },
  };
}

export function checkPitch(input: Record<string, unknown>): Result {
  const e: Errors = {};
  const name = t(input.name);
  const email = t(input.email).toLowerCase();
  const affiliation = t(input.affiliation);
  const topic = t(input.topic);
  const outline = t(input.outline);
  const sample = t(input.sample);
  const conflicts = t(input.conflicts);
  const none = input.nothingToDeclare === true;
  if (name.length < 2) e.name = "Enter your name";
  if (!EMAIL.test(email)) e.email = "Enter an email, like you@example.com";
  if (affiliation.length < 2) e.affiliation = "Enter your company or institute, or Independent";
  if (topic.length < 5) e.topic = "One line: what's the story?";
  if (outline.length < 30) e.outline = "Give three to five points, and why readers should care";
  else if (outline.length > SUBMISSION_LIMITS.pitchOutline) e.outline = "Keep the outline under 1,500 characters";
  if (sample && !URL_OK.test(sample)) e.sample = "Start the link with https://";
  if (!none && conflicts.length < 3) e.conflicts = "Declare any conflict, or tick I have nothing to declare";
  if (Object.keys(e).length) return { ok: false, errors: e };
  return {
    ok: true,
    value: {
      title: topic,
      details: {
        affiliation,
        topic,
        outline,
        sample: sample || null,
        conflicts: none ? "Nothing to declare" : conflicts,
      },
      contact: { name, email, phone: null },
    },
  };
}

// ------------------------------------------------------------------- company pages (step 5.8)

/** Contact us (66:4591): the topic chips and "When we reply". Grievance goes to its own form (519:8). */
export const CONTACT_TOPICS = [
  { value: "Buyer help", reply: "1 working day" },
  { value: "Supplier onboarding", reply: "1 working day" },
  { value: "Newsroom tip", reply: "If we follow up" },
  { value: "Advertising", reply: "2 working days" },
  { value: "Partnerships", reply: "3 working days" },
] as const;

/** Partner with H2 Economy (742:8): the five partner types and what each usually covers. */
export const PARTNER_TYPES = [
  { value: "Industry body", hint: "Member news, directory listings, co-hosted webinars" },
  { value: "Event organiser", hint: "Calendar listing, media partnership, exhibitor lists" },
  { value: "Research or university", hint: "Data, reports, student and researcher profiles" },
  { value: "State agency", hint: "Scheme and policy pages, state hub data" },
  { value: "Media", hint: "Content sharing and co-reporting" },
] as const;

/** Advertise and sponsor (741:5605): "Interested in". */
export const AD_INTERESTS = [
  "Newsletter",
  "Webinar",
  "Category partner",
  "Featured event",
  "Sponsored article",
] as const;

const MOBILE = /^[6-9]\d{9}$/;
const mobileOk = (text: string) => MOBILE.test(text.replace(/[\s-]/g, "").replace(/^\+?91/, ""));

export function checkContact(input: Record<string, unknown>): Result {
  const e: Errors = {};
  const topic = t(input.topic);
  const name = t(input.name);
  const email = t(input.email).toLowerCase();
  const company = t(input.company);
  const mobile = t(input.mobile);
  const message = t(input.message);
  if (!CONTACT_TOPICS.some((c) => c.value === topic)) e.topic = "Choose what this is about";
  if (name.length < 2) e.name = "Enter your full name";
  if (!EMAIL.test(email)) e.email = "Enter your work email, like you@company.com";
  if (company.length < 2) e.company = "Enter your company name";
  if (mobile && !mobileOk(mobile)) e.mobile = "Enter a 10-digit Indian mobile number";
  if (message.length < 10) e.message = "Tell us what you need";
  else if (message.length > SUBMISSION_LIMITS.contactMessage) e.message = "Keep it under 2,000 characters";
  if (Object.keys(e).length) return { ok: false, errors: e };
  return {
    ok: true,
    value: {
      title: `${topic}: ${company}`,
      details: { topic, company, message },
      contact: { name, email, phone: mobile || null },
    },
  };
}

export function checkPartnership(input: Record<string, unknown>): Result {
  const e: Errors = {};
  const organisation = t(input.organisation);
  const partnerType = t(input.partnerType);
  const proposal = t(input.proposal);
  const name = t(input.name);
  const email = t(input.email).toLowerCase();
  const phone = t(input.phone);
  if (organisation.length < 2) e.organisation = "Enter your organisation";
  if (!PARTNER_TYPES.some((p) => p.value === partnerType)) e.partnerType = "Choose a partner type";
  if (proposal.length < 20) e.proposal = "Tell us about your proposal in a few sentences";
  else if (proposal.length > SUBMISSION_LIMITS.proposal) e.proposal = "Keep it under 1,000 characters";
  if (name.length < 2) e.name = "Enter your name";
  if (!EMAIL.test(email)) e.email = "Enter your work email, like name@organisation.in";
  if (phone && !mobileOk(phone)) e.phone = "Enter a 10-digit Indian mobile number";
  if (Object.keys(e).length) return { ok: false, errors: e };
  return {
    ok: true,
    value: {
      title: `${partnerType}: ${organisation}`,
      details: { organisation, partnerType, proposal },
      contact: { name, email, phone: phone || null },
    },
  };
}

export function checkAdvertising(input: Record<string, unknown>): Result {
  const e: Errors = {};
  const name = t(input.name);
  const email = t(input.email).toLowerCase();
  const company = t(input.company);
  const interests = Array.isArray(input.interests)
    ? input.interests.map(t).filter((i) => (AD_INTERESTS as readonly string[]).includes(i))
    : [];
  const message = t(input.message);
  if (name.length < 2) e.name = "Enter your full name";
  if (!EMAIL.test(email)) e.email = "Enter your work email, like name@company.in";
  if (company.length < 2) e.company = "Enter your company";
  if (!interests.length) e.interests = "Choose at least one placement";
  if (message.length > SUBMISSION_LIMITS.advertisingMessage) e.message = "Keep it under 1,000 characters";
  if (Object.keys(e).length) return { ok: false, errors: e };
  return {
    ok: true,
    value: {
      title: `${interests.join(", ")}: ${company}`,
      details: { company, interests, message: message || null },
      contact: { name, email, phone: null },
    },
  };
}

export const CHECKS: Record<SubmissionKind, (input: Record<string, unknown>, now?: Date) => Result> = {
  event: checkEvent,
  press_release: checkPressRelease,
  correction: checkCorrection,
  pitch: checkPitch,
  contact: checkContact,
  partnership: checkPartnership,
  advertising: checkAdvertising,
};

/** Events and press releases need an account (505:421); the other forms don't. */
export const NEEDS_ACCOUNT: Record<SubmissionKind, boolean> = {
  event: true,
  press_release: true,
  correction: false,
  pitch: false,
  contact: false,
  partnership: false,
  advertising: false,
};
