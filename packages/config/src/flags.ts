// Feature flags (playbook step 1.6). Defaults are the safe values in docs/decisions.md.
// Launch 1 ships with `transactions` off: every cart, checkout, order and payment route must call
// requireFlag("transactions") on the server, not only hide a button. Flags move to admin settings in step 11.8.

export const FLAG_DEFAULTS = {
  transactions: false, // Batch 6, on hold
  payLater: false, // M19
  letterOfCredit: false, // M19, M12
  comingSoon: false, // switched on before Launch 1 if wanted (step 5.1)
  maintenance: false, // planned maintenance page (step 5.10)
  devPages: false, // /dev pages (tokens, component gallery). Always on in development; on for staging only (step 2.6)
  sampleContent: false, // F9, A37: show sample-flagged content. On for local and staging only; never in production
  searchIndexing: false, // step 5.10: lets search engines index the site (robots.txt, meta robots). On at Launch 1 only
  operatorPassword: false, // step 12.1 (review H2), A183: the back office needs the staff password sign-in. On in production
  buyerChecklist: false, // public QC, 16 Nov 2026: the buyer's five-step checklist before the dashboard, off until the steps are chosen
} as const;

/** Safer defaults for a production build (NODE_ENV=production) when the variable isn't set. */
const PRODUCTION_DEFAULTS: Partial<Record<keyof typeof FLAG_DEFAULTS, boolean>> = { operatorPassword: true };

export type FlagName = keyof typeof FLAG_DEFAULTS;

const ENV_NAMES: Record<FlagName, string> = {
  transactions: "FLAG_TRANSACTIONS",
  payLater: "FLAG_PAY_LATER",
  letterOfCredit: "FLAG_LETTER_OF_CREDIT",
  comingSoon: "FLAG_COMING_SOON",
  maintenance: "FLAG_MAINTENANCE",
  devPages: "FLAG_DEV_PAGES",
  sampleContent: "FLAG_SAMPLE_CONTENT",
  searchIndexing: "FLAG_SEARCH_INDEXING",
  operatorPassword: "FLAG_OPERATOR_PASSWORD",
  buyerChecklist: "FLAG_BUYER_CHECKLIST",
};

export function readFlags(source: Record<string, string | undefined> = process.env): Record<FlagName, boolean> {
  const flags = {
    ...FLAG_DEFAULTS,
    ...(source.NODE_ENV === "production" ? PRODUCTION_DEFAULTS : {}),
  } as Record<FlagName, boolean>;
  for (const name of Object.keys(FLAG_DEFAULTS) as FlagName[]) {
    const raw = source[ENV_NAMES[name]]?.trim().toLowerCase();
    if (raw === undefined || raw === "") continue; // keep the safe default
    if (raw !== "true" && raw !== "false") throw new Error(`${ENV_NAMES[name]} must be "true" or "false"`);
    flags[name] = raw === "true";
  }
  return flags;
}

/**
 * Switches changed in admin System settings (step 11.8), refreshed from the database every 30 seconds by the server.
 * They win over the environment. Tests that pass their own `source` never see them.
 */
let overrides: Partial<Record<FlagName, boolean>> = {};

export function setFlagOverrides(next: Partial<Record<FlagName, boolean>>): void {
  overrides = { ...next };
}

/** Flags an operator may switch in System settings; the rest stay in the environment (devPages, sampleContent). */
export const ADMIN_FLAGS = [
  "maintenance",
  "comingSoon",
  "searchIndexing",
  "transactions",
  "payLater",
  "letterOfCredit",
  "buyerChecklist",
] as const;
/** Switching these needs a second operator to approve (they open or close money flows). */
export const TWO_PERSON_FLAGS: readonly FlagName[] = ["transactions", "payLater", "letterOfCredit"];

export function isEnabled(name: FlagName, source?: Record<string, string | undefined>): boolean {
  if (source === undefined && overrides[name] !== undefined) return overrides[name];
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
