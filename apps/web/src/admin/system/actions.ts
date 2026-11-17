"use server";

import { ADMIN_FLAGS } from "@h2india/config";
import type { ClockName } from "@h2india/config/clocks";
import { getDb } from "@h2india/core";
import {
  cancelReportSchedule,
  decideProposal,
  scheduleReport,
  setClock,
  switchFlag,
  SystemError,
} from "@h2india/core/admin/system";
import { removeHoliday, setHoliday } from "@h2india/core/clocks";
import { loadActor } from "@h2india/core/authz";
import { resolveDeadLetter } from "@h2india/core/queue";
import { revalidatePath } from "next/cache";
import { operatorSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// System settings (707:793) and Reports (716:348), step 11.8. Core checks settings.edit or reports.view and audits.

type R = { ok: true; note?: string } | { ok: false; error: string };

async function operator() {
  const session = await operatorSession();
  if (!session) throw new Error("Sign in again.");
  return loadActor(getDb(), session.user.id);
}

async function run(work: () => Promise<unknown>, path: string): Promise<R> {
  let note: string | undefined;
  try {
    const out = await work();
    note = typeof out === "string" ? out : undefined;
  } catch (error) {
    if (error instanceof SystemError) return { ok: false, error: error.message };
    if (error instanceof Error && /Not allowed|isn't answering|Enter the/.test(error.message))
      return { ok: false, error: error.message };
    if (error instanceof Error && error.name === "ZodError") return { ok: false, error: "Check the value." };
    throw error;
  }
  revalidatePath(path);
  return { ok: true, note };
}

export async function flagAction(flag: string, on: boolean, reason: string): Promise<R> {
  const actor = await operator();
  if (!(ADMIN_FLAGS as readonly string[]).includes(flag)) return { ok: false, error: "No such switch" };
  return run(async () => {
    const r = await switchFlag(
      getDb(),
      actor,
      { flag: flag as (typeof ADMIN_FLAGS)[number], on, reason },
      await requestContext(),
    );
    return r === "proposed"
      ? "Sent to another operator to approve"
      : "Saved. It reaches every server within 30 seconds.";
  }, "/admin/settings");
}

export async function proposalAction(id: string, approve: boolean): Promise<R> {
  const actor = await operator();
  return run(async () => decideProposal(getDb(), actor, id, approve, await requestContext()), "/admin/settings");
}

export async function clockAction(
  name: ClockName,
  amount: number,
  unit: "hours" | "days" | "workingDays",
  reason: string,
): Promise<R> {
  const actor = await operator();
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter a number above 0" };
  const duration = unit === "hours" ? { hours: amount } : unit === "days" ? { days: amount } : { workingDays: amount };
  return run(async () => setClock(getDb(), actor, name, duration, reason, await requestContext()), "/admin/settings");
}

export async function deadLetterAction(id: string, retry: boolean): Promise<R> {
  const actor = await operator();
  return run(
    async () =>
      resolveDeadLetter(getDb(), actor, { id, resolution: retry ? "Retried" : "Dismissed" }, await requestContext()),
    "/admin/settings",
  );
}

export async function scheduleReportAction(email: string, frequency: "weekly" | "monthly"): Promise<R> {
  const actor = await operator();
  return run(async () => {
    await scheduleReport(getDb(), actor, { email, frequency }, await requestContext());
    return "Report scheduled";
  }, "/admin/reports");
}

/** Stop a scheduled report email (founder QC, 17 Nov 2026). */
export async function cancelReportAction(id: string): Promise<R> {
  const actor = await operator();
  return run(async () => {
    await cancelReportSchedule(getDb(), actor, id, await requestContext());
    return "Report stopped";
  }, "/admin/reports");
}

/** Holidays (M18): add or rename one day, or remove it. Core checks settings.edit and audits. */
export async function holidayAction(day: string, name: string): Promise<R> {
  const actor = await operator();
  return run(async () => {
    await setHoliday(getDb(), actor, { day, name }, await requestContext());
    return "Holiday saved. New deadlines skip it.";
  }, "/admin/settings");
}

export async function removeHolidayAction(day: string): Promise<R> {
  const actor = await operator();
  return run(async () => {
    await removeHoliday(getDb(), actor, day, await requestContext());
    return "Holiday removed";
  }, "/admin/settings");
}
