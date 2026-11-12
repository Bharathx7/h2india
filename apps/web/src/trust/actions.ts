"use server";

import { checkForm, getDb, underLimit, type FormGuard } from "@h2india/core";
import {
  checkGrievance,
  findGrievance,
  grievanceSteps,
  raiseGrievance,
  type GrievanceInput,
} from "@h2india/core/grievances";
import { sendGrievance } from "@h2india/core/notify";
import { parseServerEnv } from "@h2india/config";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";
import { trustDetails } from "./data";
import { istDay, istDayTime } from "./views";

// Grievance officer (519:8): raise a complaint, then check it (519:588). Anyone may raise one, signed in or not;
// both are limited per IP address. The status lookup needs the ticket and the email together and returns only the
// steps, never the complaint itself.

export type RaiseResult =
  { ok: true; reference: string } | { ok: false; errors?: Record<string, string>; reason?: "limited" | "failed" };

export async function raiseComplaint(input: GrievanceInput, guard?: FormGuard): Promise<RaiseResult> {
  const ctx = await requestContext();
  const checked = checkGrievance(input);
  if (!checked.ok) return { ok: false, errors: checked.errors };
  // Form protection (step 5.9) only for a complaint that would be saved.
  if (!(await checkForm({ form: "grievance", ip: ctx.ip ?? null, guard })).ok) return { ok: false, reason: "limited" };
  if (!(await underLimit(`grievance:${ctx.ip ?? "unknown"}`, 3600, 5))) return { ok: false, reason: "limited" };
  const session = await getSession().catch(() => null);
  try {
    const r = await raiseGrievance(getDb(), input, { userId: session?.user.id ?? null, context: ctx });
    if (!r.ok) return { ok: false, errors: r.errors };
    const g = r.grievance;
    const t = await trustDetails();
    const officer = `${t.officer.name}, ${t.officer.designation}`;
    await sendGrievance(
      { email: g.email, userId: session?.user.id ?? null },
      {
        name: g.name,
        reference: g.reference,
        about: g.type,
        raised: `${istDayTime(g.createdAt)} IST`,
        acknowledged: null,
        resolveBy: istDay(g.resolveBy),
        teamLine: null,
        officer: `${officer} · ${t.officer.email} · ${t.registeredOffice}`,
        signature: officer,
        statusUrl: `${parseServerEnv().APP_URL}/legal/grievance-officer?ticket=${g.reference}#check`,
      },
    );
    return { ok: true, reference: g.reference };
  } catch (error) {
    console.error("[grievance] raise failed", error);
    return { ok: false, reason: "failed" };
  }
}

export interface StatusStep {
  label: string;
  state: "done" | "current" | "next";
  line: string | null;
}

export type CheckResult =
  | { ok: true; reference: string; type: string; raised: string; status: string; steps: StatusStep[] }
  | { ok: false; reason: "not-found" | "limited" | "invalid" };

export async function checkComplaint(ticket: string, email: string): Promise<CheckResult> {
  if (!ticket.trim() || !email.trim()) return { ok: false, reason: "invalid" };
  const ctx = await requestContext();
  if (!(await underLimit(`grievance-check:${ctx.ip ?? "unknown"}`, 3600, 20))) return { ok: false, reason: "limited" };
  const g = await findGrievance(getDb(), ticket, email);
  if (!g) return { ok: false, reason: "not-found" };
  return {
    ok: true,
    reference: g.reference,
    type: g.type,
    raised: istDay(g.createdAt),
    status: g.status,
    steps: grievanceSteps(g).map((s) => {
      const when = s.at ? istDayTime(s.at) : null;
      let line: string | null;
      if (s.label === "Resolved" && s.state !== "done") line = `By ${istDay(g.resolveBy)}`;
      else line = [when, s.note].filter(Boolean).join(" · ") || null;
      return { label: s.label, state: s.state, line };
    }),
  };
}
