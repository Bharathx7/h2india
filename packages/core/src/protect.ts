import { parseServerEnv } from "@h2india/config";
import { underLimit } from "./limits";

// Public form protection (step 5.9): every public form passes checkForm() before anything is saved. Four layers:
// a hidden "website" field people never fill (honeypot), a minimum time between the form appearing and being sent,
// per-IP limits (a burst of 5 a minute and 30 an hour per form), and a bot challenge once a provider is chosen.

export const FORM_LIMITS = {
  burst: { windowSeconds: 60, max: 5 },
  hourly: { windowSeconds: 3600, max: 30 },
  /** Faster than this, it's a script posting straight away (browser tests fill a form in about 0.7 s). */
  minMs: 300,
};

/** What the browser sends with every public form (useFormGuard in the web app). */
export interface FormGuard {
  /** The hidden honeypot field; must be empty. */
  website?: string;
  /** Milliseconds from the form appearing to being sent. */
  elapsedMs?: number;
  /** The bot challenge answer, once a provider is chosen. */
  challenge?: string;
}

export type FormCheck = { ok: true } | { ok: false; reason: "bot" | "limited" };

/** The guard part alone, for unit tests and the browser. */
export function looksAutomated(guard: FormGuard | undefined): boolean {
  if (!guard) return true;
  if (typeof guard.website === "string" && guard.website.trim() !== "") return true;
  return typeof guard.elapsedMs !== "number" || guard.elapsedMs < FORM_LIMITS.minMs;
}

async function challengePassed(answer: string | undefined, ip: string | null): Promise<boolean> {
  const env = parseServerEnv();
  if (!env.BOT_CHALLENGE_SECRET || !env.BOT_CHALLENGE_VERIFY_URL) return true;
  if (!answer) return false;
  try {
    const res = await fetch(env.BOT_CHALLENGE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: env.BOT_CHALLENGE_SECRET,
        response: answer,
        ...(ip ? { remoteip: ip } : {}),
      }),
      signal: AbortSignal.timeout(5000),
    });
    return ((await res.json()) as { success?: boolean }).success === true;
  } catch {
    // A provider outage must not stop people: the other layers still apply.
    return true;
  }
}

export async function checkForm(input: { form: string; ip: string | null; guard?: FormGuard }): Promise<FormCheck> {
  const who = input.ip ?? "unknown";
  if (!(await underLimit(`burst:${input.form}:${who}`, FORM_LIMITS.burst.windowSeconds, FORM_LIMITS.burst.max))) {
    return { ok: false, reason: "limited" };
  }
  if (!(await underLimit(`hour:${input.form}:${who}`, FORM_LIMITS.hourly.windowSeconds, FORM_LIMITS.hourly.max))) {
    return { ok: false, reason: "limited" };
  }
  if (looksAutomated(input.guard)) return { ok: false, reason: "bot" };
  if (!(await challengePassed(input.guard?.challenge, input.ip))) return { ok: false, reason: "bot" };
  return { ok: true };
}
