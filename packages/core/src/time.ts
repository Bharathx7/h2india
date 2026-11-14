// Times are stored in UTC and shown in IST (playbook Section 8). Safe to import in the browser.

const IST = "Asia/Kolkata";
const clock = new Intl.DateTimeFormat("en-US", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true });

/** "9:58 PM", in India time. */
export function formatIstTime(date: Date): string {
  return clock.format(date);
}

const day = new Intl.DateTimeFormat("en-GB", { timeZone: IST, day: "numeric", month: "short", year: "numeric" });

/** "24 Nov 2026", in India time. */
export function formatIstDate(date: Date): string {
  return day.format(date).replace("Sept", "Sep");
}

/** "10 Nov 2026, 9:40 PM", in India time. */
export function formatIstDateTime(date: Date): string {
  return `${formatIstDate(date)}, ${formatIstTime(date)}`;
}

const clock24 = new Intl.DateTimeFormat("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false });
const dayMonth = new Intl.DateTimeFormat("en-GB", { timeZone: IST, day: "numeric", month: "short" });
const isoDay = new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" });

/** "10:06", in India time (notification rows, 97:2564). */
export function formatIstClock(date: Date): string {
  return clock24.format(date);
}

/** "3 Nov", in India time. */
export function formatIstDayMonth(date: Date): string {
  return dayMonth.format(date).replace("Sept", "Sep");
}

/** "2026-11-12": the India calendar day of an instant. */
export function istDate(date: Date): string {
  return isoDay.format(date);
}

const DAY = 86_400_000;

/**
 * Calendar days until a deadline in India time, as drawn: due 15 Nov, seen on 10 Nov, is "5 days left"; 0 on the day.
 * The one copy for pages (opportunities/views.ts) and messages (alerts, step 7.3).
 */
export function daysUntil(iso: string, now: Date): number {
  const day = (d: Date) => Date.parse(`${istDate(d)}T00:00:00Z`);
  return Math.max(0, Math.round((day(new Date(iso)) - day(now)) / DAY));
}

export function daysLeft(iso: string, now: Date): string {
  const days = daysUntil(iso, now);
  return days <= 0 ? "closes today" : `${String(days)} ${days === 1 ? "day" : "days"} left`;
}
