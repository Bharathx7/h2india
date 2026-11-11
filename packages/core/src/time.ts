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
