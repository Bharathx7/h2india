import { daysUntil, formatIstDayMonth } from "@h2india/core/time";

// How the compliance lists show their clocks (660:281, 660:1786): pure, unit-tested. Durations come from the clock
// settings (A24), never from the page.

export type Tone = "neutral" | "success" | "warning" | "error";

type Duration = { hours: number } | { workingDays: number } | { days: number };

/** "24 hours", "15 days", "2 working days". */
export function durationWords(d: Duration): string {
  if ("hours" in d) return `${String(d.hours)} ${d.hours === 1 ? "hour" : "hours"}`;
  if ("workingDays" in d) return `${String(d.workingDays)} working ${d.workingDays === 1 ? "day" : "days"}`;
  return `${String(d.days)} ${d.days === 1 ? "day" : "days"}`;
}

const hm = (ms: number) => {
  const m = Math.max(1, Math.floor(ms / 60_000));
  const h = Math.floor(m / 60);
  return h ? `${String(h)} h ${String(m % 60)} m` : `${String(m)} m`;
};

/**
 * A clock as drawn: "Done 4 Nov" when met, "Overdue by 1 day" or "Overdue by 3 h 10 m" when missed, "Due in 11 h 55 m"
 * in its last day, otherwise "14 days left".
 */
export function clockBadge(due: Date | null, doneAt: Date | null, now: Date): { text: string; tone: Tone } {
  if (doneAt) return { text: `Done ${formatIstDayMonth(doneAt)}`, tone: "success" };
  if (!due) return { text: "—", tone: "neutral" };
  const ms = due.getTime() - now.getTime();
  if (ms < 0) {
    const late = -ms;
    if (late < 86_400_000) return { text: `Overdue by ${hm(late)}`, tone: "error" };
    const d = Math.floor(late / 86_400_000);
    return { text: `Overdue by ${String(d)} ${d === 1 ? "day" : "days"}`, tone: "error" };
  }
  if (ms < 86_400_000) return { text: `Due in ${hm(ms)}`, tone: "warning" };
  const left = daysUntil(due.toISOString(), now);
  return { text: `${String(left)} ${left === 1 ? "day" : "days"} left`, tone: "neutral" };
}

/** A due date as drawn on Data rights: "Due 9 Dec", or overdue. */
export function dueBadge(due: Date, done: boolean, now: Date): { text: string; tone: Tone } {
  if (done) return { text: "Closed", tone: "success" };
  if (due.getTime() < now.getTime()) return clockBadge(due, null, now);
  return {
    text: `Due ${formatIstDayMonth(due)}`,
    tone: due.getTime() - now.getTime() < 86_400_000 ? "warning" : "neutral",
  };
}
