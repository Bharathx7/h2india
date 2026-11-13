import { Money } from "../money";

// Quote figures (step 9.2; shown on 560:8 and 619:8): price before GST, GST, and total including GST and freight.
// GST is worked out per line at its own rate, and on freight at the freight rate. Whole paise, rounded per line.

export interface PricedLine {
  quantity: number;
  unitPricePaise: bigint;
  gstRateBps: number;
}

export interface QuoteFigures {
  /** Price excluding GST: the lines plus freight. */
  subtotalPaise: bigint;
  gstPaise: bigint;
  totalPaise: bigint;
  /** One rate when every line and freight share it, for the comparison's GST rate row; null when mixed. */
  gstRateBps: number | null;
}

export function quoteFigures(lines: PricedLine[], freight: { paise: bigint; gstRateBps: number }): QuoteFigures {
  let subtotal = 0n;
  let gst = 0n;
  const rates = new Set<number>();
  for (const l of lines) {
    const amount = l.unitPricePaise * BigInt(l.quantity);
    subtotal += amount;
    gst += Money.percent(amount, l.gstRateBps);
    rates.add(l.gstRateBps);
  }
  if (freight.paise > 0n) {
    subtotal += freight.paise;
    gst += Money.percent(freight.paise, freight.gstRateBps);
    rates.add(freight.gstRateBps);
  }
  return {
    subtotalPaise: subtotal,
    gstPaise: gst,
    totalPaise: subtotal + gst,
    gstRateBps: rates.size === 1 ? ([...rates][0] ?? null) : null,
  };
}

export interface PaymentLine {
  percentBps: number;
  trigger: string;
}

/** Triggers a payment line can use (the schedules drawn on 560:8 and 617:8). */
export const PAYMENT_TRIGGERS = ["Advance", "On confirmation", "Before dispatch", "On receipt", "Retention"] as const;

/** Problems with a payment schedule, or null: whole lines that add up to 100%. */
export function scheduleProblem(lines: PaymentLine[]): string | null {
  if (!lines.length) return "Add a payment schedule";
  if (lines.some((l) => !Number.isInteger(l.percentBps) || l.percentBps <= 0)) return "Each part must be more than 0%";
  if (lines.some((l) => !l.trigger.trim())) return "Say when each part is paid";
  const sum = lines.reduce((a, l) => a + l.percentBps, 0);
  if (sum !== 10_000) return `The schedule adds up to ${String(sum / 100)}%. It must add up to 100%`;
  return null;
}

/** "30% on confirmation, 70% before dispatch" */
export function describeSchedule(lines: PaymentLine[]): string {
  const text = lines.map((l) => `${String(l.percentBps / 100)}% ${l.trigger.toLowerCase()}`).join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The share paid before the goods leave (for "Least paid upfront" on 560:8). */
export function upfrontBps(lines: PaymentLine[]): number {
  const before = new Set(["advance", "on confirmation", "before dispatch"]);
  return lines.filter((l) => before.has(l.trigger.toLowerCase())).reduce((a, l) => a + l.percentBps, 0);
}
