import { z } from "zod";
import { Money } from "../money";

// Fees, TCS and TDS (step 10.11). Every rate, cap, base and date is a setting with an effective date (rate card
// versions), never a constant in a page. The figures in the fallback are those the playbook and frames state
// (3% of order value before GST, capped at ₹50,000 per order, 18% GST on the fee; GST TCS 0.5%, income-tax TDS 0.1%):
// they are sample values until the Chartered Accountant signs them (OPEN: M11) and the launch-offer dates are set
// (OPEN: C1, C2, C3). Pure: safe in the browser.

export const rateCardSchema = z.object({
  version: z.string().min(1),
  /** ISO date (IST) from which orders accepted use this version. */
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  feeBps: z.number().int().min(0).max(10_000),
  feeCapPaise: z.string().regex(/^\d+$/).nullable(),
  gstOnFeeBps: z.number().int().min(0).max(10_000),
  tcsBps: z.number().int().min(0).max(10_000),
  tdsBps: z.number().int().min(0).max(10_000),
  /** What TCS and TDS are worked out on (M11): the value before GST, or the total. */
  tcsBase: z.enum(["exGst", "total"]),
  tdsBase: z.enum(["exGst", "total"]),
  /** Category or supplier overrides of the fee rate. */
  overrides: z
    .array(
      z.object({
        kind: z.enum(["category", "supplier"]),
        id: z.string(),
        feeBps: z.number().int().min(0).max(10_000),
      }),
    )
    .default([]),
  /** Launch offer: no fee between these dates (C1, C2). Blank until decided. */
  launchOfferFrom: z.string().nullable(),
  launchOfferTo: z.string().nullable(),
  /** True while the figures are samples waiting for the CA (M11). Shown as such on admin screens. */
  sample: z.boolean().default(true),
});
export type RateCard = z.infer<typeof rateCardSchema>;

export const SAMPLE_RATE_CARD: RateCard = {
  version: "1.0",
  effectiveFrom: "2026-01-01",
  feeBps: 300,
  feeCapPaise: "5000000",
  gstOnFeeBps: 1800,
  tcsBps: 50,
  tdsBps: 10,
  tcsBase: "exGst",
  tdsBase: "exGst",
  overrides: [],
  launchOfferFrom: null,
  launchOfferTo: null,
  sample: true,
};

const istDay = (d: Date) => new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

/** The version in force on a day: the latest whose effective date has come. */
export function rateCardOn(cards: readonly RateCard[], at: Date): RateCard | null {
  const day = istDay(at);
  return (
    [...cards]
      .filter((c) => c.effectiveFrom <= day)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null
  );
}

export function inLaunchOffer(card: RateCard, at: Date): boolean {
  if (!card.launchOfferFrom || !card.launchOfferTo) return false;
  const day = istDay(at);
  return day >= card.launchOfferFrom && day <= card.launchOfferTo;
}

export interface Settlement {
  feePaise: bigint;
  gstOnFeePaise: bigint;
  tcsPaise: bigint;
  tdsPaise: bigint;
  netPaise: bigint;
  launchOffer: boolean;
}

/**
 * What the supplier gets for a released amount. The fee is on the order value before GST (pro rata for a partial
 * release), capped per order; TCS and TDS on their configured bases. `acceptedAt` decides the launch offer.
 */
export function settle(input: {
  card: RateCard;
  releasedPaise: bigint;
  orderTotalPaise: bigint;
  orderExGstPaise: bigint;
  acceptedAt: Date;
  categoryId?: string | null;
  supplierId?: string | null;
  /** Fee already charged on earlier releases of the same order (for the cap). */
  feeSoFarPaise?: bigint;
}): Settlement {
  const { card } = input;
  const share = (whole: bigint) =>
    input.orderTotalPaise === 0n ? 0n : (whole * input.releasedPaise) / input.orderTotalPaise;
  const exGst = share(input.orderExGstPaise);
  const launchOffer = inLaunchOffer(card, input.acceptedAt);
  const override =
    card.overrides.find((o) => o.kind === "supplier" && o.id === input.supplierId) ??
    card.overrides.find((o) => o.kind === "category" && o.id === input.categoryId);
  let fee = launchOffer ? 0n : Money.percent(exGst, override?.feeBps ?? card.feeBps);
  if (card.feeCapPaise !== null) {
    const room = BigInt(card.feeCapPaise) - (input.feeSoFarPaise ?? 0n);
    if (fee > room) fee = room > 0n ? room : 0n;
  }
  const gstOnFee = Money.percent(fee, card.gstOnFeeBps);
  const tcs = Money.percent(card.tcsBase === "exGst" ? exGst : input.releasedPaise, card.tcsBps);
  const tds = Money.percent(card.tdsBase === "exGst" ? exGst : input.releasedPaise, card.tdsBps);
  return {
    feePaise: fee,
    gstOnFeePaise: gstOnFee,
    tcsPaise: tcs,
    tdsPaise: tds,
    netPaise: input.releasedPaise - fee - gstOnFee - tcs - tds,
    launchOffer,
  };
}

/** Payout runs at 11:00 and 16:00 IST (step 10.11). The next run at or after `due`, on a working day. */
export function nextPayoutRun(due: Date, isWorkingDay: (istDate: string) => boolean): Date {
  const IST = 5.5 * 3_600_000;
  const RUNS = [11, 16];
  let t = due.getTime();
  for (let i = 0; i < 60; i++) {
    const ist = new Date(t + IST);
    const day = ist.toISOString().slice(0, 10);
    if (isWorkingDay(day)) {
      for (const h of RUNS) {
        const run = Date.parse(`${day}T${String(h).padStart(2, "0")}:00:00.000Z`) - IST;
        if (run >= due.getTime()) return new Date(run);
      }
    }
    t = Date.parse(`${day}T00:00:00.000Z`) - IST + 86_400_000;
  }
  throw new Error("No payout run found in 60 days");
}
