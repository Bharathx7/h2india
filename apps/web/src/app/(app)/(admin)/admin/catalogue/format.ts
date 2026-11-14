import { formatIstDayMonth, formatIstTime } from "@h2india/core/companies/client";

// Words on the Taxonomy screen (636:596) that come from data. Pure, so they are unit-tested.

export interface HistoryLine {
  when: string;
  text: string;
}

/** "11 Nov, 9:05 AM IST" and "Rohit Menon added Noise level (…)". */
export function historyLine(change: { at: Date; who: string; summary: string }): HistoryLine {
  return {
    when: `${formatIstDayMonth(change.at)}, ${formatIstTime(change.at)} IST`,
    text: `${change.who} ${change.summary}`,
  };
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;

/** "41 live products · 10 attributes · last changed 11 Nov by Rohit Menon" */
export function categoryMeta(input: {
  liveProducts: number;
  attributes: number;
  lastChange: { at: Date; who: string } | null;
}): string {
  const parts = [
    plural(input.liveProducts, "live product", "live products"),
    plural(input.attributes, "attribute", "attributes"),
  ];
  if (input.lastChange) parts.push(`last changed ${formatIstDayMonth(input.lastChange.at)} by ${input.lastChange.who}`);
  return parts.join(" · ");
}
