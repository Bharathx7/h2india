// Feature flags (playbook step 1.6). Defaults are the safe values in docs/decisions.md.
// Launch 1 ships with `transactions` off: every cart, checkout, order and payment route must call
// requireFlag("transactions") on the server, not only hide a button. Flags move to admin settings in step 11.8.

export const FLAG_DEFAULTS = {
  transactions: false, // Batch 6, on hold
  payLater: false, // M19
  letterOfCredit: false, // M19, M12
  comingSoon: false, // switched on before Launch 1 if wanted (step 5.1)
  maintenance: false, // planned maintenance page (step 5.10)
} as const;

export type FlagName = keyof typeof FLAG_DEFAULTS;

const ENV_NAMES: Record<FlagName, string> = {
  transactions: "FLAG_TRANSACTIONS",
  payLater: "FLAG_PAY_LATER",
  letterOfCredit: "FLAG_LETTER_OF_CREDIT",
  comingSoon: "FLAG_COMING_SOON",
  maintenance: "FLAG_MAINTENANCE",
};

export function readFlags(source: Record<string, string | undefined> = process.env): Record<FlagName, boolean> {
  const flags = { ...FLAG_DEFAULTS } as Record<FlagName, boolean>;
  for (const name of Object.keys(FLAG_DEFAULTS) as FlagName[]) {
    const raw = source[ENV_NAMES[name]]?.trim().toLowerCase();
    if (raw === undefined || raw === "") continue; // keep the safe default
    if (raw !== "true" && raw !== "false") throw new Error(`${ENV_NAMES[name]} must be "true" or "false"`);
    flags[name] = raw === "true";
  }
  return flags;
}

export function isEnabled(name: FlagName, source?: Record<string, string | undefined>): boolean {
  return readFlags(source)[name];
}

export class FlagOffError extends Error {
  readonly status = 404;
  constructor(readonly flag: FlagName) {
    super(`Feature "${flag}" is switched off`);
    this.name = "FlagOffError";
  }
}

/** Server-side guard. Throws (and the route answers 404) when the feature is off. */
export function requireFlag(name: FlagName, source?: Record<string, string | undefined>): void {
  if (!isEnabled(name, source)) throw new FlagOffError(name);
}
