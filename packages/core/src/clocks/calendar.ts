import { WORKING_WEEKDAYS, type Duration } from "@h2india/config/clocks";

// Working-day arithmetic in IST (step 3.8, M18): Monday to Saturday are working days, minus the holiday list.
// Pure: the holidays are passed in, so the rules are tested without a database.

const IST_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The IST calendar date of an instant, "YYYY-MM-DD". */
export function istDay(at: Date): string {
  return new Date(at.getTime() + IST_MS).toISOString().slice(0, 10);
}

export class WorkingCalendar {
  constructor(
    private readonly holidays: ReadonlySet<string> = new Set(),
    private readonly weekdays: readonly number[] = WORKING_WEEKDAYS,
  ) {}

  /** A "YYYY-MM-DD" IST date. */
  isWorkingDay(day: string): boolean {
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    return this.weekdays.includes(weekday) && !this.holidays.has(day);
  }

  isWorkingAt(at: Date): boolean {
    return this.isWorkingDay(istDay(at));
  }

  /**
   * n working days after an instant, at the same IST time of day. Starting on a day off counts from the start of the
   * next working day, so "1 working day" from Sunday afternoon ends when Monday ends.
   */
  addWorkingDays(from: Date, n: number): Date {
    if (!Number.isInteger(n) || n < 0) throw new Error("n must be a whole number of days");
    let wall = from.getTime() + IST_MS; // UTC fields now read as IST wall time
    const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    if (!this.isWorkingDay(day(wall))) {
      wall = Math.floor(wall / DAY_MS) * DAY_MS;
      do wall += DAY_MS;
      while (!this.isWorkingDay(day(wall)));
    }
    for (let i = 0; i < n; i++) {
      do wall += DAY_MS;
      while (!this.isWorkingDay(day(wall)));
    }
    return new Date(wall - IST_MS);
  }

  /** Working days in (from, to]: how many working days have started since from, by IST date. */
  workingDaysBetween(from: Date, to: Date): number {
    let count = 0;
    let wall = Math.floor((from.getTime() + IST_MS) / DAY_MS) * DAY_MS + DAY_MS;
    const end = to.getTime() + IST_MS;
    while (wall <= end) {
      if (this.isWorkingDay(new Date(wall).toISOString().slice(0, 10))) count++;
      wall += DAY_MS;
    }
    return count;
  }

  /** When a clock of this length that starts at from runs out. */
  add(from: Date, duration: Duration): Date {
    if ("hours" in duration) return new Date(from.getTime() + duration.hours * 3_600_000);
    if ("days" in duration) return new Date(from.getTime() + duration.days * DAY_MS);
    return this.addWorkingDays(from, duration.workingDays);
  }
}
