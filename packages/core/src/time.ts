// Times are stored in UTC and shown in IST (playbook Section 8). Safe to import in the browser.

const IST = "Asia/Kolkata";
const clock = new Intl.DateTimeFormat("en-US", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true });

/** "9:58 PM", in India time. */
export function formatIstTime(date: Date): string {
  return clock.format(date);
}
