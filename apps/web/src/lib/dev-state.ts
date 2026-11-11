import { isEnabled } from "@h2india/config";
import type { AsyncState } from "@h2india/ui";

const STATES: readonly AsyncState[] = ["loading", "error", "empty", "ready"];

/**
 * Required-states rule (playbook step 2.5): in development, `?state=loading|error|empty` forces a page's data
 * sections into that state so each one can be checked against its Figma state board. Ignored in production.
 */
export function forcedState(param: string | string[] | undefined): AsyncState | undefined {
  if (process.env.NODE_ENV !== "development" && !isEnabled("devPages")) return undefined;
  const value = Array.isArray(param) ? param[0] : param;
  return STATES.find((s) => s === value);
}
