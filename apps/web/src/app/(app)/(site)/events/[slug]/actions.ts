"use server";

import { checkForm, getDb, underLimit, type FormGuard } from "@h2india/core";
import { checkRegistration, registerForWebinar, type RegistrationField } from "@h2india/core/events";
import { getEvent, sendRegistration, sendReplayLink, webinarFacts } from "@/events/data";
import { isWebinar } from "@/events/views";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Webinar registration (732:521 → 732:939) and "Email me the replay" (827:14696, 733:22), step 5.7. Every check runs
// here. Signed-in members register in one click with their account's name and email.

export type RegisterResult =
  | { ok: true; already: boolean; mobile: string | null; email: string }
  | {
      ok: false;
      reason: "full" | "closed" | "invalid" | "limited" | "not-found";
      errors?: Partial<Record<RegistrationField, string>>;
    };

export async function registerWebinar(
  slug: string,
  input: { name: string; email: string; organisation: string; role: string; mobile: string; sponsorConsent: boolean },
  wantReplay = false,
  guard?: FormGuard,
): Promise<RegisterResult> {
  const e = await getEvent(slug);
  if (!e || !isWebinar(e)) return { ok: false, reason: "not-found" };
  const ctx = await requestContext();
  if (!(await underLimit(`webinar-register:${ctx.ip ?? "unknown"}`, 3600, 30))) return { ok: false, reason: "limited" };
  const session = await getSession().catch(() => null);
  const member = Boolean(session);
  const values = session
    ? {
        ...input,
        name: session.user.name || input.name || session.user.email,
        email: session.user.email,
        userId: session.user.id,
      }
    : input;
  // Form protection (step 5.9) only once the form is complete, so people see their mistakes first.
  const form = checkRegistration(values, { member, replayOnly: wantReplay });
  if (form.ok && !(await checkForm({ form: "webinar", ip: ctx.ip ?? null, guard })).ok) {
    return { ok: false, reason: "limited" };
  }
  const result = await registerForWebinar(getDb(), webinarFacts(e), values, { member, wantReplay });
  if (!result.ok) return result;
  if (!result.already) {
    if (result.kind === "live") await sendRegistration(e, result.id);
    else await sendReplayLink(e, result.id);
  } else if (wantReplay) {
    await sendReplayLink(e, result.id);
  }
  return { ok: true, already: result.already, mobile: result.mobile, email: values.email.trim().toLowerCase() };
}
