import { z } from "zod";
import { Money } from "../money";

// The dispatch checklist (step 10.9, 693:814). Pure: the supplier page, the pipeline's "blocked" note and the server's
// check before shipping all use it. Whether an IRN is needed and the e-way bill threshold are tax rules: settings with
// the values drawn on 693:814 until the Chartered Accountant confirms them (OPEN: M11).

export const dispatchRulesSchema = z.object({
  /** "E-invoice IRN" is on the drawn checklist. */
  einvoiceRequired: z.boolean(),
  /** "Needed because the order is above ₹50,000" (693:814). Paise, as a string. */
  ewayBillAbovePaise: z.string().regex(/^\d+$/),
});
export type DispatchRules = z.infer<typeof dispatchRulesSchema>;

export const DRAWN_DISPATCH_RULES: DispatchRules = { einvoiceRequired: true, ewayBillAbovePaise: "5000000" };

export type ChecklistKey = "invoice" | "irn" | "eway" | "certificates" | "carrier";

export interface ChecklistItem {
  key: ChecklistKey;
  label: string;
  done: boolean;
  /** What was entered, or why it's needed. */
  detail: string;
  /** The button on 693:814 while it isn't done. */
  action: string;
  /** "e-way bill", for "2 items left: e-way bill and carrier details". */
  short: string;
}

export interface ShipmentFacts {
  invoiceNumber: string | null;
  invoiceFileId: string | null;
  irn: string | null;
  irnAt: Date | null;
  ewayBillNumber: string | null;
  certificatesNote: string | null;
  transporter: string | null;
  lrNumber: string | null;
  expectedAt: Date | null;
}

export function dispatchChecklist(
  s: ShipmentFacts | null,
  order: { totalPaise: bigint; buyerName: string },
  rules: DispatchRules,
  formatDate: (d: Date) => string,
): ChecklistItem[] {
  const items: ChecklistItem[] = [
    {
      key: "invoice",
      label: "Tax invoice uploaded",
      done: Boolean(s?.invoiceNumber && s.invoiceFileId),
      detail: s?.invoiceNumber
        ? `${s.invoiceNumber} · GSTIN of ${order.buyerName}`
        : "The GST invoice you raised for this order",
      action: "Upload tax invoice",
      short: "tax invoice",
    },
  ];
  if (rules.einvoiceRequired)
    items.push({
      key: "irn",
      label: "E-invoice IRN",
      done: Boolean(s?.irn),
      detail: s?.irnAt ? `Generated ${formatDate(s.irnAt)}` : "The IRN from the e-invoice portal",
      action: "Add IRN",
      short: "IRN",
    });
  const threshold = BigInt(rules.ewayBillAbovePaise);
  if (order.totalPaise > threshold)
    items.push({
      key: "eway",
      label: "E-way bill",
      done: Boolean(s?.ewayBillNumber),
      detail: s?.ewayBillNumber ?? `Needed because the order is above ${Money.format(threshold)}`,
      action: "Add e-way bill number",
      short: "e-way bill",
    });
  items.push(
    {
      key: "certificates",
      label: "Certificates for this product",
      done: Boolean(s?.certificatesNote),
      detail: s?.certificatesNote ?? "Test reports or licences the product needs",
      action: "Add certificates",
      short: "certificates",
    },
    {
      key: "carrier",
      label: "Carrier and tracking",
      done: Boolean(s?.transporter && s.lrNumber && s.expectedAt),
      detail:
        s?.transporter && s.lrNumber
          ? `${s.transporter} · LR ${s.lrNumber}${s.expectedAt ? ` · expected ${formatDate(s.expectedAt)}` : ""}`
          : "Who's carrying it and the LR or tracking number",
      action: "Add carrier details",
      short: "carrier details",
    },
  );
  return items;
}

/** "2 items left: e-way bill and carrier details" (693:814). Empty when everything is done. */
export function itemsLeft(items: ChecklistItem[]): string {
  const left = items.filter((i) => !i.done).map((i) => i.short);
  if (!left.length) return "";
  const list = left.length === 1 ? left[0] : `${left.slice(0, -1).join(", ")} and ${left[left.length - 1] ?? ""}`;
  return `${String(left.length)} item${left.length === 1 ? "" : "s"} left: ${list ?? ""}`;
}
