import { normaliseGstin, panOf } from "../../gstin";
import { GstinProviderUnavailableError, type GstinProvider, type GstinRecord } from "./types";

// A stand-in for the GSTIN provider until decision M4. Fixed test GSTINs give every designed state (Figma 526:8).
// Names are invented; none is a real company. The list is in docs/runbooks/test-gstins.md.

const record = (
  gstin: string,
  legalName: string,
  city: string,
  address: string,
  status: GstinRecord["status"] = "Active",
) => ({
  gstin,
  legalName,
  city,
  address,
  status,
});

export const FAKE_GSTINS = {
  /** State 1: one active GSTIN under its PAN. */
  valid: "27AAKCG5521M1Z9",
  /** State 3: well formed, but not on the portal. */
  notFound: "27AAKCN0000N1ZK",
  /** State 4: cancelled and inactive. */
  cancelled: "29AABCK7731F1ZH",
  inactive: "07AABCI1234Q1ZG",
  /** State 6: the portal does not answer on the first two attempts (the page, then the first background try). */
  slow: "27AAKCP9999P1ZW",
  /** State 7: three GSTINs under one PAN. */
  severalFirst: "27AAKCS4410N1Z1",
  /** The company the development seed creates, for state 5 (already registered). */
  seeded: "27AAACG1234H1Z0",
} as const;

const RECORDS: GstinRecord[] = [
  record(
    FAKE_GSTINS.valid,
    "Greenfield Mobility Solutions Private Limited",
    "Pune",
    "Office 12, Hinjewadi Phase 1, Pune 411057",
  ),
  record(
    FAKE_GSTINS.cancelled,
    "Kaveri Electrolysers Private Limited",
    "Bengaluru",
    "Plot 4, Peenya Industrial Area, Bengaluru 560058",
    "Cancelled",
  ),
  record(FAKE_GSTINS.inactive, "Indus Gas Traders", "New Delhi", "Shop 9, Okhla Phase 2, New Delhi 110020", "Inactive"),
  record(FAKE_GSTINS.slow, "Pratap Hydrogen Works Private Limited", "Nashik", "Gat 31, Sinnar MIDC, Nashik 422103"),
  record(
    FAKE_GSTINS.severalFirst,
    "Sahyadri Hydrogen Systems Private Limited",
    "Pune",
    "Unit 3, Chakan MIDC, Pune 410501",
  ),
  record(
    "24AAKCS4410N1Z7",
    "Sahyadri Hydrogen Systems Private Limited",
    "Ahmedabad",
    "Shed 7, Sanand GIDC, Ahmedabad 382110",
  ),
  record(
    "29AAKCS4410N1ZX",
    "Sahyadri Hydrogen Systems Private Limited",
    "Bengaluru",
    "Bommasandra Phase 1, Bengaluru 560099",
  ),
  record(FAKE_GSTINS.seeded, "Greenfield Hydrogen Private Limited", "Pune", "Survey 44, Talawade, Pune 411062"),
  record("24AAKFG5521M1Z9", "Greenfield Energy Systems LLP", "Vadodara", "Plot 18, Makarpura GIDC, Vadodara 390010"),
];

// Test families, so browser tests can make a fresh company every run without clashing:
// any valid GSTIN whose PAN is AAKCT + 4 digits + a letter is active; AAKCP… is active but slow (state 6).
const TEST_PAN = /^AAKCT\d{4}[A-Z]$/;
const SLOW_PAN = /^AAKCP\d{4}[A-Z]$/;

function generated(gstin: string): GstinRecord | null {
  const pan = panOf(gstin);
  if (TEST_PAN.test(pan))
    return record(gstin, `Test Hydrogen ${pan} Private Limited`, "Pune", "Plot 1, Test Estate, Pune 411001");
  if (SLOW_PAN.test(pan))
    return record(gstin, `Slow Portal ${pan} Private Limited`, "Nashik", "Plot 2, Test Estate, Nashik 422001");
  return null;
}

function failsNow(gstinOrPan: string, attempt: number): boolean {
  const pan = gstinOrPan.length === 15 ? panOf(gstinOrPan) : gstinOrPan;
  return SLOW_PAN.test(pan) && attempt < 2;
}

export const fakeGstinProvider: GstinProvider = {
  lookup(gstin, options) {
    const g = normaliseGstin(gstin);
    if (failsNow(g, options?.attempt ?? 0))
      return Promise.reject(new GstinProviderUnavailableError("fake: portal down"));
    return Promise.resolve(RECORDS.find((r) => r.gstin === g) ?? generated(g));
  },
  listByPan(pan, options) {
    if (failsNow(pan, options?.attempt ?? 0))
      return Promise.reject(new GstinProviderUnavailableError("fake: portal down"));
    const fixed = RECORDS.filter((r) => panOf(r.gstin) === pan);
    return Promise.resolve(
      fixed.length > 0
        ? fixed
        : TEST_PAN.test(pan) || SLOW_PAN.test(pan)
          ? [generated(`27${pan}1Z0`)].filter((x) => x !== null)
          : [],
    );
  },
};
