"use server";

import { getDb } from "@h2india/core";
import {
  completeOnboarding,
  createAlert,
  follow,
  savePersona,
  saveTopicsAndStates,
  suggestAlerts,
  suggestedCompanies,
  unfollow,
  type SuggestedAlert,
} from "@h2india/core/members";
import { showSample } from "@/cms/sample";
import { getSession } from "@/server/auth";

// Member onboarding (531:8), step 7.1. Every step can be skipped; skipping or finishing marks onboarding done.

async function me() {
  const s = await getSession();
  if (!s) throw new Error("Sign in again.");
  return s.user.id;
}

export interface Suggestions {
  companies: { id: string; name: string; initials: string; detail: string }[];
  alerts: SuggestedAlert[];
}

export async function savePersonaAction(persona: string): Promise<void> {
  await savePersona(getDb(), await me(), persona);
}

export async function saveTopicsAction(
  persona: string | null,
  topics: string[],
  states: string[],
): Promise<Suggestions> {
  const userId = await me();
  const db = getDb();
  await saveTopicsAndStates(db, userId, topics, states);
  const companies = await suggestedCompanies(db, { states, topics, includeSample: showSample() });
  return {
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      initials: c.initials,
      detail: [c.types[0], [c.city, c.state].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
    })),
    alerts: suggestAlerts(persona, topics),
  };
}

export async function followCompanyAction(id: string, name: string, on: boolean): Promise<void> {
  const userId = await me();
  if (on) await follow(getDb(), userId, { targetType: "company", targetId: id, label: name });
  else await unfollow(getDb(), userId, "company", id);
}

/** Go to my feed: switch on the chosen suggested alerts, then finish. */
export async function finishAction(persona: string | null, topics: string[], alertKeys: string[]): Promise<void> {
  const userId = await me();
  const db = getDb();
  for (const s of suggestAlerts(persona, topics).filter((x) => alertKeys.includes(x.key))) {
    await createAlert(db, userId, {
      label: s.label,
      indexUid: s.indexUid,
      query: s.query,
      filters: s.filters,
      frequency: s.frequency,
      channels: ["email"],
    });
  }
  await completeOnboarding(db, userId);
}

export async function skipAction(): Promise<void> {
  await completeOnboarding(getDb(), await me());
}
