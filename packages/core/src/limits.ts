import { getDb } from "./db";
import { hitThrottle } from "./sign-in/throttle";

// A simple per-key rate limit for public forms (step 4.4), on the same counter table as the sign-in limits.

/** Counts one request; false once more than `max` arrived in the window. */
export async function underLimit(key: string, windowSeconds: number, max: number): Promise<boolean> {
  const { count } = await hitThrottle(getDb(), `limit:${key}`, windowSeconds);
  return count <= max;
}
