"use server";

import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { markThreadRead, MessageError, postMessage, threadMessages } from "@h2india/core/messages";
import { getSession } from "@/server/auth";

// Messages (step 9.7): send and poll. Core decides who may see a thread; a thread someone may not see doesn't exist.

async function actor() {
  const session = await getSession();
  if (!session) throw new Error("Sign in again.");
  return loadActor(getDb(), session.user.id);
}

export interface WireMessage {
  id: string;
  body: string;
  mine: boolean;
  author: string;
  at: string;
  files: { id: string; name: string; bytes: number | null; status: string }[];
}

const wire = (x: NonNullable<Awaited<ReturnType<typeof threadMessages>>>["messages"][number]): WireMessage => ({
  ...x,
  at: x.at.toISOString(),
});

export async function sendMessageAction(
  threadId: string,
  body: string,
  attachments: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await postMessage(getDb(), await actor(), { threadId, body, attachments });
    return { ok: true };
  } catch (error) {
    if (error instanceof MessageError) return { ok: false, error: error.message };
    return { ok: false, error: "Your message wasn't sent" };
  }
}

/** New messages since `after` (short polling every few seconds, step 9.7). */
export async function pollAction(threadId: string, after: string | null): Promise<WireMessage[]> {
  const a = await actor();
  const db = getDb();
  const r = await threadMessages(db, a, threadId, after ? new Date(after) : undefined);
  if (!r) return [];
  if (r.messages.length) await markThreadRead(db, a, threadId);
  return r.messages.map(wire);
}
