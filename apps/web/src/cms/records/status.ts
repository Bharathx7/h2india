// Record statuses derived from dates (step 4.3): nobody has to close a tender at its deadline. Pure functions, used by
// the CMS (shown on every record) and the public pages (Stage 5).

const DAY = 86_400_000;
/** "Closing soon" starts this many days before a deadline. */
export const CLOSING_SOON_DAYS = 7;

export type RecordStatus =
  | "Open"
  | "Closing soon"
  | "Closed"
  | "Awarded"
  | "Next round expected"
  | "Upcoming"
  | "Happening now"
  | "Past"
  | "Live"
  | "Expired";

function byDeadline(deadline: Date | null, now: Date): "Open" | "Closing soon" | "Closed" {
  if (!deadline) return "Open";
  if (now >= deadline) return "Closed";
  return deadline.getTime() - now.getTime() <= CLOSING_SOON_DAYS * DAY ? "Closing soon" : "Open";
}

const date = (v: string | Date | null | undefined) => (v ? new Date(v) : null);

export function schemeStatus(
  s: { nextDeadline?: string | null; override?: string | null },
  now = new Date(),
): RecordStatus {
  if (s.override === "Closed" || s.override === "Next round expected") return s.override;
  return byDeadline(date(s.nextDeadline), now);
}

export function tenderStatus(
  t: { bidDueAt?: string | null; result?: { declaredAt?: string | null } | null },
  now = new Date(),
): RecordStatus {
  if (t.result?.declaredAt && new Date(t.result.declaredAt) <= now) return "Awarded";
  return byDeadline(date(t.bidDueAt), now);
}

export function grantStatus(
  g: { deadline?: string | null; nextCallExpected?: string | null; override?: string | null },
  now = new Date(),
): RecordStatus {
  if (g.override === "Closed") return "Closed";
  const s = byDeadline(date(g.deadline), now);
  return s === "Closed" && g.nextCallExpected ? "Next round expected" : s;
}

export function jobStatus(j: { closesAt?: string | null }, now = new Date()): RecordStatus {
  const closes = date(j.closesAt);
  return closes && now >= closes ? "Expired" : "Live";
}

export function eventStatus(e: { startsAt?: string | null; endsAt?: string | null }, now = new Date()): RecordStatus {
  const starts = date(e.startsAt);
  const ends = date(e.endsAt) ?? starts;
  if (!starts) return "Upcoming";
  if (now < starts) return "Upcoming";
  if (ends && now <= ends) return "Happening now";
  return "Past";
}

/** "Bid due in 9 days", "Closes in 19 days", "Closes today" (the drawn chips). */
export function dueLabel(prefix: string, deadline: string | null | undefined, now = new Date()): string | null {
  const d = date(deadline);
  if (!d || d <= now) return null;
  const days = Math.ceil((d.getTime() - now.getTime()) / DAY);
  return days <= 1 ? `${prefix} today` : `${prefix} in ${String(days)} days`;
}
