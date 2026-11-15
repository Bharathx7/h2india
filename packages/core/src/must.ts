/** A value the code relies on being there (a row just inserted, a required id). Throws with what was missing. */
export function must<T>(value: T | null | undefined, what = "value"): T {
  if (value === null || value === undefined) throw new Error(`Expected ${what}`);
  return value;
}
