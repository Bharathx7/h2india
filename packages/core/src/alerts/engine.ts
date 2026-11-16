import { createHmac, timingSafeEqual } from "node:crypto";
import { parseServerEnv } from "@h2india/config";
import { schema, type Executor } from "@h2india/db";
import { renderAlertDigest, type AlertDigestItem } from "@h2india/emails";
import type { TextTemplateId } from "@h2india/emails/registry";
import { and, asc, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { audit } from "../audit";
import { getNotifySettings, quietUntil } from "../notify/preferences";
import { notify } from "../notify/notify";
import { matchingRecords } from "../search/query";
import type { SearchHit } from "../search/query";
import { defineSetting, getSetting } from "../settings";
import { daysLeft, daysUntil, formatIstDate, istDate } from "../time";
import { ALERT_TYPES, countWords, filterExpression, isAlertType, type AlertType } from "./rules";

// The alerts engine (step 7.3). After the search worker applies a change, matchAlerts() asks the engine which of the
// changed records match each active alert on that index and records each (alert, record) pair once in alert_sends:
// updating a record never sends it again (an alert on one record, "Track tender", hears once a day at most). sendAlerts() then sends what is waiting: instant alerts every minute (held
// in quiet hours until the morning, as 534:8 says), daily digests at 7:00 AM IST and weekly ones on Monday morning.
// Each message is capped (items per message, messages per person per day: A150) and every send is logged.

const o = schema.searchOutbox;
const a = schema.alerts;
const s = schema.alertSends;

/** A150 (OPEN): safe defaults until the founder sets them in System settings. */
export const ALERT_LIMITS = defineSetting<{ itemsPerMessage: number; messagesPerDay: number }>({
  key: "alerts.limits",
  description: "Alerts: most items in one message, and most alert messages one person gets in a day (A150)",
  schema: z.object({
    itemsPerMessage: z.number().int().min(1).max(50),
    messagesPerDay: z.number().int().min(1).max(50),
  }),
  fallback: { itemsPerMessage: 10, messagesPerDay: 5 },
});

const BATCH = 200;

/** What a message needs from a matched document, kept when it matched. */
export function detailOf(type: AlertType, hit: SearchHit): Record<string, string> {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const iso = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? new Date(v).toISOString() : "");
  const place = (v: unknown) => list(v).join(", ") || "Pan-India";
  switch (type) {
    case "tenders":
      return {
        over: `${str(hit.issuer)} · ${place(hit.states)}`,
        issuer: str(hit.issuer),
        reference: str(hit.tenderId),
        dueAt: iso(hit.closesAt),
        dueWord: "Bid due",
      };
    case "schemes":
      return { over: hit.meta, runBy: str(hit.runBy), dueAt: iso(hit.nextDeadline), dueWord: "Next deadline" };
    case "grants":
      return { over: `${str(hit.funder)} · ${place(hit.states)}`, dueAt: iso(hit.closesAt), dueWord: "Closes" };
    case "jobs":
      return {
        over: [str(hit.company), str(hit.location)].filter(Boolean).join(" · "),
        dueAt: iso(hit.closesAt),
        dueWord: "Closes",
      };
    default:
      return { over: hit.meta };
  }
}

/** Matches changes the search worker has applied against active alerts. Safe to run in parallel (SKIP LOCKED). */
export async function matchAlerts(db: Executor, now: Date = new Date()): Promise<{ checked: number; matched: number }> {
  const report = { checked: 0, matched: 0 };
  for (;;) {
    const done = await db.transaction(async (tx) => {
      const rows = await tx
        .select({ seq: o.seq, indexUid: o.indexUid, recordId: o.recordId, createdAt: o.createdAt })
        .from(o)
        .where(and(isNotNull(o.processedAt), isNull(o.alertsAt)))
        .orderBy(asc(o.seq))
        .limit(BATCH)
        .for("update", { skipLocked: true });
      if (!rows.length) return true;
      const uids = [...new Set(rows.map((r) => r.indexUid))].filter(isAlertType);
      const alerts = uids.length
        ? await tx
            .select()
            .from(a)
            .where(and(inArray(a.indexUid, uids), eq(a.active, true), isNull(a.pausedAt), isNull(a.deletedAt)))
        : [];
      for (const alert of alerts) {
        const type = alert.indexUid as AlertType;
        // Only changes made after the alert was set up: a new alert doesn't get the back catalogue.
        const ids = [
          ...new Set(rows.filter((r) => r.indexUid === type && r.createdAt >= alert.createdAt).map((r) => r.recordId)),
        ];
        if (!ids.length) continue;
        const hits = await matchingRecords(type, alert.query, filterExpression(type, alert.filters), ids);
        if (!hits.length) continue;
        const added = await tx
          .insert(s)
          .values(
            hits.map((h) => ({
              alertId: alert.id,
              // An alert on one record hears about each day's changes to it; any other alert hears once per record.
              recordId: alert.filters.id?.length ? `${h.id}:${istDate(now)}` : h.id,
              title: h.title,
              meta: h.meta,
              href: h.href,
              detail: detailOf(type, h),
            })),
          )
          .onConflictDoNothing()
          .returning({ id: s.id });
        if (added.length) {
          report.matched += added.length;
          await tx.update(a).set({ lastMatchedAt: now }).where(eq(a.id, alert.id));
        }
      }
      await tx
        .update(o)
        .set({ alertsAt: now })
        .where(
          inArray(
            o.seq,
            rows.map((r) => r.seq),
          ),
        );
      report.checked += rows.length;
      return rows.length < BATCH;
    });
    if (done) return report;
  }
}

// ------------------------------------------------------------------------------------------------ turning one off

function sign(id: string): string {
  return createHmac("sha256", parseServerEnv().AUTH_SECRET).update(`alert-off:${id}`).digest("base64url");
}

/** The token in "Turn off this alert" and "Stop tender alerts": this alert only, and it never expires. */
export function alertOffToken(alertId: string): string {
  return `${alertId}.${sign(alertId)}`;
}

export function alertOffUrl(alertId: string): string {
  return `${parseServerEnv().APP_URL}/alerts/off?token=${encodeURIComponent(alertOffToken(alertId))}`;
}

function idFromToken(token: string): string | null {
  const [id, signature] = token.split(".");
  if (!id || !signature) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}

/** The alert behind a turn-off link (for the confirm page), or null. */
export async function alertForToken(db: Executor, token: string) {
  const id = idFromToken(token);
  if (!id) return null;
  const [row] = await db
    .select()
    .from(a)
    .where(and(eq(a.id, id), isNull(a.deletedAt)));
  return row ?? null;
}

/** Turns off this one alert from its link. Safe to repeat; the member's other alerts keep working. */
export async function turnOffAlert(db: Executor, token: string, now: Date = new Date()): Promise<string | null> {
  const row = await alertForToken(db, token);
  if (!row) return null;
  if (row.active) {
    await db.transaction(async (tx) => {
      await tx.update(a).set({ active: false, pausedAt: now }).where(eq(a.id, row.id));
      await audit(tx, {
        actorId: null,
        action: "alert.turned_off",
        resourceType: "alert",
        resourceId: row.id,
        before: { active: true },
        after: { active: false, via: "link" },
      });
    });
  }
  return row.label;
}

// ------------------------------------------------------------------------------------------------ sending

type Alert = typeof a.$inferSelect;
type Send = typeof s.$inferSelect;

const appUrl = () => parseServerEnv().APP_URL;
const absolute = (href: string) => (href.startsWith("http") ? href : `${appUrl()}${href}`);

function dueLine(d: Record<string, string>, now: Date): { due?: string; soon?: boolean } {
  if (!d.dueAt) return {};
  const at = new Date(d.dueAt);
  return {
    due: `${d.dueWord ?? "Due"} ${formatIstDate(at)} · ${daysLeft(d.dueAt, now)}`,
    soon: daysUntil(d.dueAt, now) <= 7,
  };
}

function frequencyWord(f: string) {
  return f === "instant" ? "instant" : f === "daily" ? "daily" : "weekly";
}

/** One message for one alert: email (665:307), WhatsApp per item for tenders and schemes (668:152, 676:351), in-app. */
async function deliver(alert: Alert, items: Send[], total: number, now: Date) {
  const type = alert.indexUid as AlertType;
  const t = ALERT_TYPES[type];
  const shown = items.map<AlertDigestItem>((i) => ({
    over: i.detail.over ?? i.meta,
    title: i.title,
    reference: i.detail.reference || undefined,
    href: absolute(i.href),
    ...dueLine(i.detail, now),
  }));
  const headline = `${countWords(type, total)} ${total === 1 ? "matches" : "match"} your alert`;
  const offHref = alertOffUrl(alert.id);
  const kind = alert.frequency === "instant" ? "new match" : `${frequencyWord(alert.frequency)} digest`;
  const preview =
    items.length > 2
      ? `${items
          .slice(0, 2)
          .map((i) => i.title)
          .join(", ")} and ${String(total - 2)} more.`
      : items.map((i) => i.title).join(", ");
  const email = alert.channels.includes("email")
    ? {
        template: "email.tender_alert_digest" as const,
        mail: {
          ...(await renderAlertDigest(`${headline} · ${alert.label}`, {
            appUrl: appUrl(),
            eyebrow: `${t.one} alert · ${kind}`,
            headline,
            intro: `Your alert ${alert.label}.`,
            items: shown,
            viewLabel: t.view,
            more: total > items.length ? `and ${String(total - items.length)} more on H2 Economy` : undefined,
            all: { label: `See all ${t.many}`, href: absolute(t.all) },
            manageHref: `${appUrl()}/member/alerts`,
            offHref,
            reason: `You're getting this because you set up ${alert.frequency === "instant" ? "an instant" : `a ${frequencyWord(alert.frequency)}`} ${t.one} alert.`,
            preview,
          })),
          headers: {
            "List-Unsubscribe": `<${appUrl()}/api/alerts/off?token=${encodeURIComponent(alertOffToken(alert.id))}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        },
      }
    : undefined;
  const inApp = alert.channels.includes("inapp")
    ? {
        category: "alerts" as const,
        icon: "bell",
        title: headline,
        body: alert.label,
        href: items.length === 1 && items[0] ? items[0].href : "/member/alerts",
        actionLabel: items.length === 1 ? t.view : "See alerts",
      }
    : undefined;
  const base = { event: "alert.matches", topic: "alert.matches" as const, userId: alert.userId };
  await notify({ ...base, email, inApp }, now);
  // WhatsApp templates are one item each, for tenders and schemes with a due date only.
  if (alert.channels.includes("whatsapp") && (type === "tenders" || type === "schemes")) {
    for (const i of items) {
      const d = i.detail;
      if (!d.dueAt) continue;
      const due = formatIstDate(new Date(d.dueAt));
      const whatsapp: { template: TextTemplateId; data: Record<string, string> } =
        type === "tenders"
          ? {
              template: "whatsapp.tender_alert_instant" as const,
              data: {
                issuer: d.issuer || "An issuer",
                change: "published a tender",
                title: i.title,
                reference: d.reference || "no reference",
                due,
                alert: alert.label,
              },
            }
          : {
              template: "whatsapp.scheme_alert" as const,
              data: {
                scheme: i.title,
                what: "applications",
                due,
                where: d.runBy || "the scheme portal",
                left: `${String(daysUntil(d.dueAt, now))} days`,
                alert: alert.label,
              },
            };
      await notify({ ...base, whatsapp }, now);
    }
  }
}

/** Messages already sent to this person today (India day): one per (alert, sent time). */
async function sentToday(db: Executor, userId: string, now: Date): Promise<number> {
  const start = new Date(`${istDate(now)}T00:00:00+05:30`);
  const [row] = await db
    .select({ n: sql<number>`count(distinct (${s.alertId}, ${s.sentAt}))::int` })
    .from(s)
    .innerJoin(a, eq(a.id, s.alertId))
    .where(and(eq(a.userId, userId), gte(s.sentAt, start)));
  return row?.n ?? 0;
}

/**
 * Sends what is waiting for alerts of these frequencies. Items are claimed (sent_at set) in the same transaction as the
 * send, so two runs never send the same item. Over the daily cap, items wait for tomorrow.
 */
export async function sendAlerts(
  db: Executor,
  frequencies: ("instant" | "daily" | "weekly")[],
  now: Date = new Date(),
): Promise<{ messages: number; items: number }> {
  const report = { messages: 0, items: 0 };
  const limits = await getSetting(db, ALERT_LIMITS);
  const waiting = await db
    .selectDistinct({ alertId: s.alertId })
    .from(s)
    .innerJoin(a, eq(a.id, s.alertId))
    .where(
      and(
        isNull(s.sentAt),
        inArray(a.frequency, frequencies),
        eq(a.active, true),
        isNull(a.pausedAt),
        isNull(a.deletedAt),
      ),
    );
  for (const { alertId } of waiting) {
    await db.transaction(async (tx) => {
      const [alert] = await tx.select().from(a).where(eq(a.id, alertId)).for("update", { skipLocked: true });
      if (!alert) return;
      if (alert.frequency === "instant" && quietUntil(await getNotifySettings(tx, alert.userId), now)) return;
      if ((await sentToday(tx, alert.userId, now)) >= limits.messagesPerDay) return;
      const pending = await tx
        .select()
        .from(s)
        .where(and(eq(s.alertId, alertId), isNull(s.sentAt)))
        .orderBy(asc(s.matchedAt));
      if (!pending.length) return;
      await tx
        .update(s)
        .set({ sentAt: now })
        .where(
          and(
            inArray(
              s.id,
              pending.map((p) => p.id),
            ),
            isNull(s.sentAt),
          ),
        );
      await tx.update(a).set({ lastSentAt: now }).where(eq(a.id, alertId));
      await deliver(alert, pending.slice(0, limits.itemsPerMessage), pending.length, now);
      report.messages += 1;
      report.items += pending.length;
    });
  }
  return report;
}

/** The every-minute run: match new changes, then send instant alerts. */
export async function runAlerts(db: Executor, now: Date = new Date()) {
  const matched = await matchAlerts(db, now);
  const sent = await sendAlerts(db, ["instant"], now);
  return { ...matched, ...sent };
}

/** 7:00 AM IST: daily digests, and on Mondays the weekly ones too (Weekly digest · Monday morning, 275:23289). */
export async function sendDigests(db: Executor, now: Date = new Date()) {
  const monday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).format(now) === "Mon";
  return sendAlerts(db, monday ? ["daily", "weekly"] : ["daily"], now);
}
