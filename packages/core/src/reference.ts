import { sql } from "drizzle-orm";
import type { Executor } from "@h2india/db";

// Reference numbers (playbook Section 8): one counter per type and year, e.g. ORD-2026-0001.
// The year is the calendar year in India time. Numbering grows past 9999 without a format change.

export const REFERENCE_TYPES = {
  ORD: "Order",
  RFQ: "Quote request",
  Q: "Quote",
  R: "Return",
  PO: "Purchase order",
  GRV: "Grievance",
  DRR: "Delivery receipt",
  EV: "Event",
  SUP: "Support request",
} as const;

/** Digits after the year. Support requests use five, as drawn (528:664, "SUP-2026-01942"). */
const WIDTH: Partial<Record<keyof typeof REFERENCE_TYPES, number>> = { SUP: 5 };

export type ReferenceType = keyof typeof REFERENCE_TYPES;

export function istYear(at: Date): number {
  return Number(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", year: "numeric" }).format(at));
}

export function formatReference(type: ReferenceType, year: number, n: number): string {
  return `${type}-${String(year)}-${String(n).padStart(WIDTH[type] ?? 4, "0")}`;
}

/** Takes the next number atomically. Safe when many requests ask at once; gaps can occur if a transaction rolls back. */
export async function nextReference(ex: Executor, type: ReferenceType, at: Date = new Date()): Promise<string> {
  const year = istYear(at);
  const result = await ex.execute<{ last_value: number }>(sql`
    INSERT INTO core.reference_sequences (type, year, last_value) VALUES (${type}, ${year}, 1)
    ON CONFLICT (type, year) DO UPDATE SET last_value = core.reference_sequences.last_value + 1
    RETURNING last_value`);
  const n = result.rows[0]?.last_value;
  if (n === undefined) throw new Error("reference sequence returned no value");
  return formatReference(type, year, n);
}
