"use server";

import { getDb } from "@h2india/core";
import { can, loadActor } from "@h2india/core/authz";
import {
  correctForRequest,
  DataRightsError,
  eraseForRequest,
  erasurePlan,
  exportForRequest,
  receiveRequest,
  rejectRequest,
  type Kind,
} from "@h2india/core/compliance";
import { moveGrievance } from "@h2india/core/grievances";
import type { GrievanceStatus } from "@h2india/core/grievances/rules";
import { revalidatePath } from "next/cache";
import { operatorSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Compliance (step 11.7): grievance status moves and data-rights actions. Core checks compliance.edit and audits.

type R = { ok: true } | { ok: false; error: string };

async function operator() {
  const session = await operatorSession();
  if (!session) throw new Error("Sign in again.");
  return { actor: await loadActor(getDb(), session.user.id), userId: session.user.id };
}

async function run(work: () => Promise<unknown>, path: string): Promise<R> {
  try {
    await work();
  } catch (error) {
    if (error instanceof DataRightsError) return { ok: false, error: error.message };
    if (error instanceof Error && /Not allowed|not allowed|may have changed/.test(error.message))
      return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath(path);
  return { ok: true };
}

export async function moveGrievanceAction(id: string, to: GrievanceStatus, note: string): Promise<R> {
  const { actor, userId } = await operator();
  if (!can(actor, "compliance.edit")) return { ok: false, error: "Your role can't change grievances." };
  const context = await requestContext();
  return run(
    () =>
      moveGrievance(getDb(), {
        id,
        to,
        actorId: userId,
        publicNote: note || undefined,
        outcome: to === "Resolved" ? note || undefined : undefined,
        context,
      }),
    `/admin/compliance/grievances/${id}`,
  );
}

export async function newRequestAction(kind: Kind, email: string, details: string): Promise<R> {
  const { actor } = await operator();
  return run(
    async () => receiveRequest(getDb(), actor, { kind, email, details }, await requestContext()),
    "/admin/compliance",
  );
}

export async function dryRunAction(id: string): Promise<R> {
  const { actor } = await operator();
  return run(
    async () => erasurePlan(getDb(), actor, id, await requestContext()),
    `/admin/compliance/data-rights/${id}`,
  );
}

export async function eraseAction(id: string): Promise<R> {
  const { actor } = await operator();
  return run(
    async () => eraseForRequest(getDb(), actor, id, await requestContext()),
    `/admin/compliance/data-rights/${id}`,
  );
}

export async function correctAction(id: string, name: string, mobile: string): Promise<R> {
  const { actor } = await operator();
  return run(
    async () =>
      correctForRequest(
        getDb(),
        actor,
        id,
        { ...(name.trim() ? { name } : {}), ...(mobile.trim() ? { mobile: mobile.trim() } : {}) },
        await requestContext(),
      ),
    `/admin/compliance/data-rights/${id}`,
  );
}

export async function rejectAction(id: string, reason: string): Promise<R> {
  const { actor } = await operator();
  return run(
    async () => rejectRequest(getDb(), actor, id, reason, await requestContext()),
    `/admin/compliance/data-rights/${id}`,
  );
}

/** The person's data as JSON, for the operator to send to the verified requester. */
export async function exportAction(id: string): Promise<{ ok: true; json: string } | { ok: false; error: string }> {
  const { actor } = await operator();
  try {
    return {
      ok: true,
      json: JSON.stringify(await exportForRequest(getDb(), actor, id, await requestContext()), null, 2),
    };
  } catch (error) {
    if (error instanceof DataRightsError) return { ok: false, error: error.message };
    throw error;
  }
}
