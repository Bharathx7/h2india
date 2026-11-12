"use server";

import { getDb } from "@h2india/core";
import {
  listNotifications,
  markRead,
  setChoices,
  unreadCount,
  type InboxFilter,
  type NotifyChannel,
  type TopicName,
} from "@h2india/core/notify";
import { getSession } from "@/server/auth";
import { toRows, type Row } from "./rows";

// Server side of the bell (97:3168) and the notification centre (97:2564). Everything is the signed-in person's own.

async function me(): Promise<string | null> {
  return (await getSession())?.user.id ?? null;
}

export async function bellData(): Promise<{ unread: number; items: Row[] }> {
  const userId = await me();
  if (!userId) return { unread: 0, items: [] };
  const db = getDb();
  const [unread, items] = await Promise.all([unreadCount(db, userId), listNotifications(db, userId, { limit: 5 })]);
  return { unread, items: toRows(items) };
}

export async function inbox(filter: InboxFilter): Promise<{ unread: number; items: Row[] } | null> {
  const userId = await me();
  if (!userId) return null;
  const db = getDb();
  const [unread, items] = await Promise.all([
    unreadCount(db, userId),
    listNotifications(db, userId, { filter, limit: 100 }),
  ]);
  return { unread, items: toRows(items) };
}

export async function markAllRead(): Promise<number> {
  const userId = await me();
  return userId ? markRead(getDb(), userId, "all") : 0;
}

export async function markOneRead(id: string): Promise<void> {
  const userId = await me();
  if (userId && /^[0-9a-f-]{36}$/i.test(id)) await markRead(getDb(), userId, [id]);
}

export async function saveChoices(
  changes: { topic: TopicName; channel: NotifyChannel; enabled: boolean }[],
): Promise<{ ok: boolean }> {
  const userId = await me();
  if (!userId) return { ok: false };
  await setChoices(getDb(), userId, changes);
  return { ok: true };
}
