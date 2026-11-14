import config from "@payload-config";
import { parseServerEnv } from "@h2india/config";
import { getDb } from "@h2india/core";
import {
  claimReminder,
  registrationById,
  registrationFor,
  registrationToken,
  seatsTaken,
  type WebinarFacts,
} from "@h2india/core/events";
import {
  sendWebinarRegistered,
  sendWebinarReminder,
  sendWebinarReplay,
  type WebinarDetails,
} from "@h2india/core/notify";
import { getPayload } from "payload";
import { publicWhere } from "@/cms/sample";
import type { Event } from "@/payload-types";
import { calendarLinks, clock, longDay, timeRange } from "./views";

// Events and webinars (step 5.7). Public reads: published, samples only where shown (A37). Webinar registrations live
// in core.webinar_registrations; the messages are rendered here because the templates live in the web app.

const payload = () => getPayload({ config });

export async function allEvents(): Promise<Event[]> {
  const res = await (
    await payload()
  ).find({ collection: "events", where: publicWhere(), sort: "startsAt", limit: 1000, depth: 0, pagination: false });
  return res.docs;
}

export async function getEvent(slug: string): Promise<Event | null> {
  const res = await (
    await payload()
  ).find({ collection: "events", where: { and: [publicWhere(), { slug: { equals: slug } }] }, limit: 1, depth: 1 });
  return res.docs[0] ?? null;
}

async function eventById(id: number): Promise<Event | null> {
  return (await payload()).findByID({ collection: "events", id, depth: 0 }).catch(() => null);
}

export const appUrl = () => parseServerEnv().APP_URL.replace(/\/$/, "");

export function webinarFacts(e: Event, now = new Date()): WebinarFacts {
  const ended = new Date(e.endsAt ?? e.startsAt) <= now;
  return {
    id: e.id,
    slug: e.slug,
    startsAt: new Date(e.startsAt),
    capacity: e.webinar?.capacity ?? null,
    open: !e.webinar?.closed && !ended,
    sponsor: e.webinar?.sponsor?.name?.trim() || null,
  };
}

/** "Full" when every seat is taken (827:14696). */
export async function seatsLeft(e: Event): Promise<number | null> {
  const capacity = e.webinar?.capacity ?? null;
  if (capacity === null) return null;
  return Math.max(0, capacity - (await seatsTaken(getDb(), e.id)));
}

function details(e: Event, name: string, registrationId: string): WebinarDetails {
  const page = `${appUrl()}/events/${e.slug}`;
  return {
    name,
    title: e.name,
    date: longDay(e.startsAt),
    time: timeRange(e.startsAt, e.endsAt).replace("–", " to "),
    short: `${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(new Date(e.startsAt))} at ${clock(e.startsAt).replace(":00", "")} IST`,
    joinUrl: `${page}/join?t=${registrationToken(registrationId, "join")}`,
    host: e.webinar?.sponsor?.name ? (e.host ?? "") : (e.host ?? "H2 India editorial team"),
    calendar: calendarLinks(e, page),
  };
}

/** The confirmation email (676:83) and, when a mobile was given, the WhatsApp message (676:405). */
export async function sendRegistration(e: Event, registrationId: string): Promise<void> {
  const r = await registrationById(getDb(), registrationId);
  if (!r) return;
  await sendWebinarRegistered(r, details(e, r.name, r.id));
}

/** The replay link (733:22) for someone who registered: a signed link, so it opens without a password. */
export async function sendReplayLink(e: Event, registrationId: string): Promise<void> {
  const r = await registrationById(getDb(), registrationId);
  if (!r) return;
  await sendWebinarReplay(r, {
    name: r.name,
    title: e.name,
    url: `${appUrl()}/events/${e.slug}?t=${registrationToken(r.id, "replay")}`,
  });
}

/** A reminder from the worker (one day or one hour before). Sent at most once per registration. */
export async function sendReminder(registrationId: string, which: "day" | "hour"): Promise<"sent" | "skipped"> {
  const db = getDb();
  const r = await registrationById(db, registrationId);
  if (!r || r.cancelledAt || r.kind !== "live") return "skipped";
  const e = await eventById(r.eventId);
  if (!e || new Date(e.startsAt) <= new Date()) return "skipped";
  if (!(await claimReminder(db, r.id, which))) return "skipped";
  await sendWebinarReminder(r, details(e, r.name, r.id), which, clock(e.startsAt));
  return "sent";
}

/** Whether this person may watch the replay: a registration found by their account email, or a signed replay link. */
export async function replayAccess(e: Event, opts: { email?: string | null; registrationId?: string | null }) {
  const db = getDb();
  if (opts.registrationId) {
    const r = await registrationById(db, opts.registrationId);
    if (r && r.eventId === e.id && !r.cancelledAt) return true;
  }
  if (opts.email) return Boolean(await registrationFor(db, e.id, opts.email));
  return false;
}
