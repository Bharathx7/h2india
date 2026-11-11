/** Joins class names, skipping empty values. Components avoid conflicting classes instead of merging them. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
