// The RFQ wizard's form (step 9.3), shared by the browser (local draft while signed out) and the server actions.
// Dates are yyyy-mm-dd in India time; the offer deadline is that day at 6:00 PM IST, as drawn (557:8).

export interface WizardFile {
  fileId: string;
  name: string;
  meta: string;
}

export interface WizardState {
  draftId?: string;
  categoryId: string;
  categoryLabel: string;
  title: string;
  quantity: string;
  unit: string;
  specs: Record<string, string>;
  requirements: string;
  productId?: string;
  attachments: WizardFile[];
  supplierIds: string[];
  supplierNames: Record<string, string>;
  /** Let H2 Economy suggest suppliers (398:9635, A164). */
  suggest: boolean;
  deliveryState: string;
  siteId: string;
  requiredBy: string;
  offerDeadline: string;
  deliveryTerms: string;
  paymentTerms: string;
  gstinId: string;
  consent: boolean;
  source: string;
}

export const EMPTY_WIZARD: WizardState = {
  categoryId: "",
  categoryLabel: "",
  title: "",
  quantity: "",
  unit: "units",
  specs: {},
  requirements: "",
  attachments: [],
  supplierIds: [],
  supplierNames: {},
  suggest: false,
  deliveryState: "",
  siteId: "",
  requiredBy: "",
  offerDeadline: "",
  deliveryTerms: "",
  paymentTerms: "",
  gstinId: "",
  consent: false,
  source: "header",
};

export const LOCAL_DRAFT_KEY = "h2_rfq_draft";

export const UNITS = ["units", "sets", "kg", "litres", "metres", "lots"] as const;

/** The delivery and payment preferences offered in step 3 (398:10059). */
export const DELIVERY_TERMS = ["Delivered to site (DAP)", "Ex-works (EXW)", "Free on road at supplier (FOR)"] as const;
export const PAYMENT_TERMS = [
  "30% advance, 70% before dispatch",
  "100% before dispatch",
  "10% advance, 80% on receipt, 10% retention",
  "Open to the supplier's terms",
] as const;

export const istDeadline = (day: string) => new Date(`${day}T18:00:00+05:30`);
export const istDay = (day: string) => new Date(`${day}T00:00:00+05:30`);

/** Step 1's checks (399:10344): each message as drawn. */
export function stepOneErrors(
  s: WizardState,
  defs: { key: string; label: string; min: number | null; max: number | null; unit: string | null; type: string }[],
) {
  const e: Record<string, string> = {};
  if (!s.categoryId) e.categoryId = "Choose a category";
  if (!s.title.trim()) e.title = "Enter a title";
  const qty = Number(s.quantity);
  if (!s.quantity.trim()) e.quantity = "Enter a quantity";
  else if (!Number.isInteger(qty) || qty <= 0) e.quantity = "Enter a whole number above 0";
  for (const d of defs) {
    const v = s.specs[d.key];
    if (!v || d.type !== "number") continue;
    const n = Number(v.replace(/,/g, ""));
    const range = `${d.min !== null ? d.min.toLocaleString("en-IN") : ""}–${d.max !== null ? d.max.toLocaleString("en-IN") : ""}${d.unit ? ` ${d.unit.replace(/\(.*\)/, "")}` : ""}`;
    if (Number.isNaN(n) || (d.min !== null && n < d.min) || (d.max !== null && n > d.max))
      e[`spec.${d.key}`] = `${d.label} must be ${range.trim()}`;
  }
  if (s.requirements.length > 1000) e.requirements = "Keep requirements to 1,000 characters";
  return e;
}

export function stepThreeErrors(s: WizardState, signedIn: boolean, today: string) {
  const e: Record<string, string> = {};
  if (!s.deliveryState) e.deliveryState = "Choose the delivery state";
  if (signedIn && !s.siteId) e.siteId = "Choose a delivery site";
  if (!s.requiredBy) e.requiredBy = "Choose when you need it on site";
  if (!s.offerDeadline) e.offerDeadline = "Choose an offer deadline";
  else if (s.offerDeadline <= today) e.offerDeadline = "The offer deadline must be after today";
  if (s.requiredBy && s.offerDeadline && s.requiredBy < s.offerDeadline)
    e.requiredBy = "The required date must be after the offer deadline";
  if (signedIn && !s.gstinId) e.gstinId = "Choose the billing GSTIN";
  return e;
}
