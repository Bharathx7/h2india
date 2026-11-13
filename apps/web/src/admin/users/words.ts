// Plain words for the Users screens (651:1042, 656:872), step 11.4. Pure.

/** "rfq.deadline.extended" → "Rfq deadline extended", with known record words fixed. */
export function actionWords(action: string): string {
  const words = action
    .replace(/[._]+/g, " ")
    .replace(/\brfq\b/gi, "RFQ")
    .replace(/\bgstin\b/gi, "GSTIN")
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "Chrome on macOS" from a user-agent string; "Unknown device" when it can't tell. */
export function deviceOf(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /iPhone|iPad/.test(ua)
    ? "iPhone"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X|Macintosh/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

/** "Active now", "2 h ago", "3 days ago". */
export function ago(d: Date, now = new Date()): string {
  const m = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60_000));
  if (m < 5) return "Active now";
  if (m < 60) return `${String(m)} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${String(h)} h ago`;
  const days = Math.round(h / 24);
  return `${String(days)} ${days === 1 ? "day" : "days"} ago`;
}

/** +91 98•• ••• 210: the frames never show a full mobile number. */
export function maskMobile(m: string): string {
  const digits = m.replace(/\s+/g, "");
  if (digits.length < 8) return "•••";
  return `${digits.slice(0, 5)}•• ••• ${digits.slice(-3)}`;
}

export const kindWord = (kind: string | null | undefined, operator = false) =>
  operator
    ? "Operator"
    : kind === "supplier"
      ? "Supplier"
      : kind === "buyer"
        ? "Buyer"
        : kind === "both"
          ? "Buyer and supplier"
          : "Member";

export const roleWord = (r: string) => r.charAt(0).toUpperCase() + r.slice(1);
