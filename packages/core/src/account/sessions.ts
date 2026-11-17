import { schema, type Database, type Executor } from "@h2india/db";
import { and, desc, eq, gt, ne } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";

// Signed-in devices (founder QC, 17 Nov 2026, member Sign-in and security): a person sees their own sessions and can
// sign out one, or every other device. Only their own rows; the current session is never signed out from here.

const s = schema.sessions;

export interface MySession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastActive: Date;
  current: boolean;
}

export async function mySessions(
  ex: Executor,
  userId: string,
  currentSessionId: string,
  now: Date = new Date(),
): Promise<MySession[]> {
  const rows = await ex
    .select({ id: s.id, userAgent: s.userAgent, ipAddress: s.ipAddress, lastActive: s.updatedAt })
    .from(s)
    .where(and(eq(s.userId, userId), gt(s.expiresAt, now)))
    .orderBy(desc(s.updatedAt));
  return rows
    .map((r) => ({ ...r, current: r.id === currentSessionId }))
    .sort((a, b) => Number(b.current) - Number(a.current));
}

/** Signs out one of the person's other sessions, or all of them (`sessionId` left out). Returns how many ended. */
export async function signOutMySessions(
  db: Database,
  input: { userId: string; currentSessionId: string; sessionId?: string; context?: RequestContext },
): Promise<number> {
  const where = and(
    eq(s.userId, input.userId),
    ne(s.id, input.currentSessionId),
    ...(input.sessionId ? [eq(s.id, input.sessionId)] : []),
  );
  return db.transaction(async (tx) => {
    const ended = await tx.delete(s).where(where).returning({ id: s.id });
    if (ended.length) {
      await audit(tx, {
        actorId: input.userId,
        action: "account.signed_out_devices",
        resourceType: "user",
        resourceId: input.userId,
        after: { sessions: ended.length },
        context: input.context,
      });
    }
    return ended.length;
  });
}

/** "Chrome on Windows", from the browser's own description; plain words, no version numbers. */
export function deviceLabel(userAgent: string | null): string {
  const ua = userAgent ?? "";
  const os = /iPhone|iPad/.test(ua)
    ? "iPhone or iPad"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "a device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "A browser";
  return `${browser} on ${os}`;
}
