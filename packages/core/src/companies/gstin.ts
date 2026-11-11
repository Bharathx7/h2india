// GSTIN rules (step 3.3). Safe to import in the browser: no database, no secrets.
// A GSTIN is 15 characters: state code (2), PAN (10), entity number (1), "Z", check character (1).

const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** GST state codes and their names. */
export const GST_STATES: Readonly<Record<string, string>> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Centre Jurisdiction",
};

/** Upper case, no spaces: what people paste from certificates often has both. */
export function normaliseGstin(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

/** The check character of the first 14 characters of a GSTIN. */
export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = CHARS.indexOf(first14.charAt(i));
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARS.charAt((36 - (sum % 36)) % 36);
}

/** True when the GSTIN has the right shape, a real state code and a correct check character. */
export function isValidGstin(value: string): boolean {
  const g = normaliseGstin(value);
  return PATTERN.test(g) && g.slice(0, 2) in GST_STATES && gstinCheckChar(g.slice(0, 14)) === g.charAt(14);
}

export function panOf(gstin: string): string {
  return normaliseGstin(gstin).slice(2, 12);
}

export function stateOf(gstin: string): string {
  return GST_STATES[normaliseGstin(gstin).slice(0, 2)] ?? "";
}

/** The format message shown under the field (Figma 526:8, state 2). */
export const GSTIN_FORMAT_MESSAGE = "A GSTIN has 15 characters, like 27AAKCG5521M1Z3";
