import { eventStatus } from "../cms/records/status";
import type { Event } from "../payload-types";

// Events as the step 5.7 pages show them (list 729:10714, calendar 827:13689, detail 729:11207, webinar 732:521).
// Pure: no CMS access, so filters, the calendar grid and calendar links are unit-tested. Times are India time.

const IST = "Asia/Kolkata";
const fmt = (iso: string | Date, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: IST, ...opts }).format(new Date(iso));

/** The IST calendar day, "2026-11-26". */
export const istDay = (iso: string | Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
/** "4:00 PM" */
export const clock = (iso: string) => fmt(iso, { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
/** "26 Nov 2026" */
export const dayMonthYear = (iso: string) => fmt(iso, { day: "numeric", month: "short", year: "numeric" });
/** "Thursday 26 Nov 2026" */
export const longDay = (iso: string) =>
  fmt(iso, { weekday: "long", day: "numeric", month: "short", year: "numeric" }).replace(",", "");
/** "NOVEMBER 2026" */
export const monthTitle = (iso: string) => fmt(iso, { month: "long", year: "numeric" }).toUpperCase();
/** "November 2026" from "2026-11". */
export const monthLabel = (key: string) => fmt(`${key}-15T00:00:00Z`, { month: "long", year: "numeric" });
/** "2026-11" */
export const monthKey = (iso: string) => istDay(iso).slice(0, 7);

/** "4:00–5:00 PM IST", or "3:00 PM–5:30 PM IST" when the halves differ. */
export function timeRange(startsAt: string, endsAt?: string | null): string {
  const a = clock(startsAt);
  if (!endsAt) return `${a} IST`;
  const b = clock(endsAt);
  const [aTime, aHalf] = a.split(" ");
  const [, bHalf] = b.split(" ");
  return aHalf === bHalf ? `${aTime ?? a}–${b} IST` : `${a}–${b} IST`;
}

export const isWebinar = (e: Pick<Event, "eventType">) => e.eventType === "Webinar";
export const multiDay = (e: Pick<Event, "startsAt" | "endsAt">) =>
  Boolean(e.endsAt) && istDay(e.startsAt) !== istDay(e.endsAt ?? e.startsAt);

export interface EventCard {
  id: number;
  slug: string;
  href: string;
  /** "17" or "26–28" */
  days: string;
  month: string;
  eyebrow: string;
  title: string;
  meta: string;
  featured: boolean;
  type: string;
  online: boolean;
  city: string;
  organiser: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

export function eventCard(e: Event, now = new Date()): EventCard {
  const online = e.attendance === "Online";
  const where = online ? "Online" : (e.city ?? e.venue?.split(",").pop()?.trim() ?? "");
  const sponsor = e.webinar?.sponsor?.name?.trim();
  const end = e.endsAt ?? e.startsAt;
  const eyebrow = [
    e.featured ? null : e.eventType === "Conference and expo" ? "Conference and expo" : e.eventType,
    where,
    isWebinar(e) ? (sponsor ? "Sponsored" : e.organiser === "H2 India" ? "H2 India" : null) : null,
  ]
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();
  const dateBit = multiDay(e)
    ? `${fmt(e.startsAt, { day: "numeric" })}–${fmt(end, { day: "numeric", month: "short" })}`
    : null;
  const meta = [
    dateBit ?? (isWebinar(e) ? timeRange(e.startsAt, e.endsAt) : null),
    e.summaryLine ?? (e.tickets === "Free" && isWebinar(e) ? "Free" : null),
    isWebinar(e) && sponsor ? `by ${sponsor}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    id: e.id,
    slug: e.slug,
    href: `/events/${e.slug}`,
    days: multiDay(e)
      ? `${fmt(e.startsAt, { day: "2-digit" })}–${fmt(end, { day: "2-digit" })}`
      : fmt(e.startsAt, { day: "2-digit" }),
    month: fmt(e.startsAt, { month: "short" }).toUpperCase(),
    eyebrow: e.featured ? `${e.eventType} · ${where}`.toUpperCase() : eyebrow,
    title: e.name,
    meta: meta || (e.venue ?? ""),
    featured: Boolean(e.featured),
    type: e.eventType,
    online,
    city: e.city ?? "",
    organiser: e.organiser,
    startsAt: e.startsAt,
    endsAt: end,
    status: eventStatus({ startsAt: e.startsAt, endsAt: e.endsAt }, now),
  };
}

export interface EventFilter {
  types: string[];
  online: boolean;
  city: string;
  /** "2026-11" */
  month: string;
  organiser: string;
}

export function filterEvents(list: EventCard[], f: EventFilter): EventCard[] {
  return list.filter(
    (e) =>
      (!f.types.length || f.types.includes(e.type)) &&
      (!f.online || e.online) &&
      (!f.city || e.city === f.city) &&
      (!f.month || monthKey(e.startsAt) === f.month || monthKey(e.endsAt) === f.month) &&
      (!f.organiser || e.organiser === f.organiser),
  );
}

/** Upcoming or happening now, soonest first, featured events lifted out for the top card. */
export function upcoming(list: EventCard[]): EventCard[] {
  return list.filter((e) => e.status !== "Past").sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function byMonth(list: EventCard[]): { month: string; items: EventCard[] }[] {
  const groups = new Map<string, EventCard[]>();
  for (const e of list) {
    const key = monthTitle(e.startsAt);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups].map(([month, items]) => ({ month, items }));
}

export interface CalendarDay {
  /** "2026-11-26" */
  date: string;
  day: number;
  inMonth: boolean;
  today: boolean;
  items: { slug: string; label: string; webinar: boolean }[];
}

/** The month grid (827:13689): Monday first, six weeks, each day with the events on it (multi-day events on each day). */
export function calendarMonth(month: string, list: EventCard[], now = new Date()): CalendarDay[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const today = istDay(now);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(first.getTime() + (i - lead) * 86_400_000);
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === (m ?? 1) - 1,
      today: date === today,
      items: list
        .filter((e) => istDay(e.startsAt) <= date && date <= istDay(e.endsAt))
        .map((e) => ({
          slug: e.slug,
          label: e.type === "Webinar" ? `${clock(e.startsAt).replace(":00", "")} · ${e.title}` : e.title,
          webinar: e.type === "Webinar",
        })),
    };
  });
}

/** "2026-12" from "2026-11" and +1. */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

// ---- calendar links (732:939 "Add it to your calendar"; email 676:83 "Google Calendar · Outlook · Apple (.ics)")

const utcStamp = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

export function calendarLinks(
  e: { name: string; startsAt: string; endsAt?: string | null; description?: string | null; venue?: string | null },
  pageUrl: string,
) {
  const end = e.endsAt ?? new Date(new Date(e.startsAt).getTime() + 3_600_000).toISOString();
  const details = [e.description ?? "", pageUrl].filter(Boolean).join("\n\n");
  const google = `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: "TEMPLATE",
    text: e.name,
    dates: `${utcStamp(e.startsAt)}/${utcStamp(end)}`,
    details,
    location: e.venue ?? "Online",
  }).toString()}`;
  const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?${new URLSearchParams({
    subject: e.name,
    startdt: new Date(e.startsAt).toISOString(),
    enddt: new Date(end).toISOString(),
    body: details,
    location: e.venue ?? "Online",
  }).toString()}`;
  return { google, outlook, ics: `${pageUrl}/ics` };
}

/** An .ics file for one event (RFC 5545), folded at 75 octets is not needed for these short lines. */
export function icsFile(
  e: {
    slug: string;
    name: string;
    startsAt: string;
    endsAt?: string | null;
    description?: string | null;
    venue?: string | null;
  },
  pageUrl: string,
  now = new Date(),
): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const end = e.endsAt ?? new Date(new Date(e.startsAt).getTime() + 3_600_000).toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//H2 India//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.slug}@h2india`,
    `DTSTAMP:${utcStamp(now.toISOString())}`,
    `DTSTART:${utcStamp(e.startsAt)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${esc(e.name)}`,
    `DESCRIPTION:${esc([e.description ?? "", pageUrl].filter(Boolean).join("\n\n"))}`,
    `LOCATION:${esc(e.venue ?? "Online")}`,
    `URL:${pageUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
