// Money (playbook Section 8): amounts are integer paise held as bigint, never floats.
// Rounding is decided here, once: percentages round half away from zero to the nearest paisa
// (₹0.005 becomes ₹0.01). Tests in money.test.ts state the rule with examples.

export type Paise = bigint;

const toPaise = (value: bigint | number): Paise => {
  if (typeof value === "bigint") return value;
  if (!Number.isSafeInteger(value)) throw new RangeError(`Money needs whole paise, got ${String(value)}`);
  return BigInt(value);
};

/** Indian digit grouping: 4879400 -> "48,79,400". */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

/** Divides with rounding half away from zero. */
function divRound(numerator: bigint, denominator: bigint): bigint {
  const q = numerator / denominator;
  const r = numerator % denominator;
  if (r === 0n) return q;
  const twice = (r < 0n ? -r : r) * 2n;
  const away = twice >= (denominator < 0n ? -denominator : denominator);
  if (!away) return q;
  return numerator < 0n !== denominator < 0n ? q - 1n : q + 1n;
}

export const Money = {
  /** Paise from a rupee string as typed or shown: "48,79,400", "₹1,234.5", "1234.56". */
  parse(text: string): Paise {
    const clean = text.replace(/[₹,\s]/g, "");
    const m = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(clean);
    if (!m) throw new RangeError(`Not an amount in rupees: "${text}"`);
    const paise = BigInt(m[2] ?? "0") * 100n + BigInt((m[3] ?? "").padEnd(2, "0") || "0");
    return m[1] ? -paise : paise;
  },

  /**
   * "₹48,79,400" for whole rupees, "₹1,234.50" when there are paise.
   * `paise: "always"` keeps ".00" (invoices); negative amounts get a minus sign before the rupee sign.
   */
  format(value: bigint | number, options: { paise?: "auto" | "always"; symbol?: boolean } = {}): string {
    const p = toPaise(value);
    const negative = p < 0n;
    const abs = negative ? -p : p;
    const rupees = abs / 100n;
    const rem = abs % 100n;
    const showPaise = options.paise === "always" || rem !== 0n;
    const body = groupIndian(rupees.toString()) + (showPaise ? `.${rem.toString().padStart(2, "0")}` : "");
    return `${negative ? "−" : ""}${options.symbol === false ? "" : "₹"}${body}`;
  },

  /** A percentage given in basis points (18% = 1800), rounded half away from zero to the paisa. */
  percent(value: bigint | number, basisPoints: bigint | number): Paise {
    return divRound(toPaise(value) * BigInt(basisPoints), 10_000n);
  },

  add(...values: (bigint | number)[]): Paise {
    return values.reduce<bigint>((sum, v) => sum + toPaise(v), 0n);
  },

  /** Splits an amount into parts by weight; the paise left over go to the first parts, so the total is kept. */
  allocate(value: bigint | number, weights: number[]): Paise[] {
    const total = toPaise(value);
    const sum = BigInt(weights.reduce((a, b) => a + b, 0));
    if (sum === 0n) throw new RangeError("allocate needs weights that add up to more than zero");
    const parts = weights.map((w) => (total * BigInt(w)) / sum);
    let left = total - parts.reduce((a, b) => a + b, 0n);
    for (let i = 0; left > 0n; i = (i + 1) % parts.length, left -= 1n) parts[i] = (parts[i] ?? 0n) + 1n;
    return parts;
  },
};
