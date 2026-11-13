"use server";

import { getDb } from "@h2india/core";
import { deleteAlert, isAlertType, previewAlert, saveAlert, setAlertOn } from "@h2india/core/alerts";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";

// Alerts (step 7.3; 534:8, 534:587, 79:3425, 275:23289). Every action works on the signed-in person's own alerts.

async function me() {
  const s = await getSession();
  if (!s) throw new Error("Sign in again.");
  return s.user.id;
}

const refresh = () => {
  revalidatePath("/member/alerts");
  revalidatePath("/buyer/alerts");
  revalidatePath("/member");
};

export interface AlertForm {
  id?: string;
  label: string;
  type: string;
  query: string;
  filters: Record<string, string[]>;
  channels: string[];
  frequency: string;
}

export async function saveAlertAction(form: AlertForm): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await me();
  if (!isAlertType(form.type)) return { ok: false, error: "Choose what to be alerted about" };
  if (!form.channels.length) return { ok: false, error: "Choose at least one way to reach you" };
  try {
    await saveAlert(getDb(), userId, {
      id: form.id,
      label: form.label,
      indexUid: form.type,
      query: form.query,
      filters: form.filters,
      channels: form.channels,
      frequency: form.frequency,
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The alert wasn't saved. Try again." };
  }
  refresh();
  return { ok: true };
}

export async function setAlertOnAction(id: string, on: boolean): Promise<void> {
  await setAlertOn(getDb(), await me(), id, on);
  refresh();
}

export async function deleteAlertAction(id: string): Promise<void> {
  await deleteAlert(getDb(), await me(), id);
  refresh();
}

/** Create alert, step 3: what the alert matches today. Null when search is unavailable (the alert still saves). */
export async function previewAlertAction(
  type: string,
  query: string,
  filters: Record<string, string[]>,
): Promise<{ total: number; hits: { id: string; title: string; meta: string }[] } | null> {
  await me();
  if (!isAlertType(type)) return null;
  try {
    const r = await previewAlert(type, query, filters);
    return { total: r.total, hits: r.hits.map((h) => ({ id: h.id, title: h.title, meta: h.meta })) };
  } catch {
    return null;
  }
}
