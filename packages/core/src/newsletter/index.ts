import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { parseServerEnv } from "@h2india/config";
import { newsletterSubscribers } from "@h2india/db";
import { renderNewsletterConfirm, renderNewsletterManage, renderNewsletterWelcome } from "@h2india/emails";
import { eq } from "drizzle-orm";
import { audit } from "../audit";
import { getDb } from "../db";
import { deliverEmail } from "../notify/channels";
import { formatIstDateTime, istDate } from "../time";

// India H₂ Weekly sign-up with double opt-in (step 5.1, A46; brought forward from 5.9). A sign-up stays "pending" until
// the emailed link is opened (48 hours, 676:8). Signing up again with a confirmed address sends a link to change topics
// instead (743:7293 "Already subscribed"). Links are signed with the app secret and carry a nonce, so only the latest
// link for an address works. Issues and the archive come with step 11.3.

/** Topic keys and labels. 448:7157 draws the first six; the Coming soon form adds News and the footer Mobility. */
export const NEWSLETTER_TOPICS = [
  { key: "policy", label: "Policy" },
  { key: "tenders-schemes", label: "Tenders & schemes" },
  { key: "products", label: "Products" },
  { key: "projects", label: "Projects" },
  { key: "technology", label: "Technology" },
  { key: "jobs", label: "Jobs" },
  { key: "news", label: "News" },
  { key: "mobility", label: "Mobility" },
] as const;

export type NewsletterTopic = (typeof NEWSLETTER_TOPICS)[number]["key"];

/** The six drawn on the confirm page (448:7157). */
export const PREFERENCE_TOPICS: NewsletterTopic[] = [
  "policy",
  "tenders-schemes",
  "products",
  "projects",
  "technology",
  "jobs",
];

/** Version of the sign-up wording ("One email a week. Unsubscribe any time. See our privacy policy."). */
export const NEWSLETTER_CONSENT_VERSION = "newsletter-2026-11-12";

export const CONFIRM_HOURS = 48;
export const MANAGE_DAYS = 7;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmailAddress(value: string): boolean {
  return EMAIL.test(value.trim()) && value.trim().length <= 254;
}

export function topicLabel(key: string): string {
  return NEWSLETTER_TOPICS.find((t) => t.key === key)?.label ?? key;
}

function cleanTopics(keys: readonly string[]): NewsletterTopic[] {
  const known = new Set<string>(NEWSLETTER_TOPICS.map((t) => t.key));
  return [...new Set(keys.filter((k) => known.has(k)))] as NewsletterTopic[];
}

const IST_OFFSET = 330 * 60_000;

/** The first Monday after the India calendar day of `now`: "Monday 16 November" (issues go out Mondays, 676:8). */
export function firstIssueDate(now = new Date()): Date {
  const [y, m, d] = istDate(now).split("-").map(Number) as [number, number, number];
  const today = new Date(Date.UTC(y, m - 1, d));
  const ahead = (8 - today.getUTCDay()) % 7 || 7;
  // 08:00 IST on that Monday.
  return new Date(Date.UTC(y, m - 1, d + ahead, 8) - IST_OFFSET);
}

export function formatIssueDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(date)
    .replace(",", "");
}

type Purpose = "confirm" | "manage";

function sign(payload: string): string {
  return createHmac("sha256", parseServerEnv().AUTH_SECRET).update(`newsletter:${payload}`).digest("base64url");
}

/** A signed link token: id.purpose.expires.nonce.signature */
export function linkToken(id: string, purpose: Purpose, nonce: string, expires: number): string {
  const payload = `${id}.${purpose}.${String(expires)}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export type LinkCheck =
  { ok: true; id: string; purpose: Purpose } | { ok: false; reason: "invalid" | "expired" | "replaced" };

/** Checks a token's signature, age and nonce against the stored record (without changing anything). */
async function checkToken(token: string, now = Date.now()): Promise<LinkCheck & { row?: Subscriber }> {
  const parts = token.split(".");
  if (parts.length !== 5) return { ok: false, reason: "invalid" };
  const [id, purpose, expires, nonce, signature] = parts as [string, string, string, string, string];
  const expected = Buffer.from(sign(`${id}.${purpose}.${expires}.${nonce}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "invalid" };
  if (purpose !== "confirm" && purpose !== "manage") return { ok: false, reason: "invalid" };
  const [row] = await getDb().select().from(newsletterSubscribers).where(eq(newsletterSubscribers.id, id));
  if (!row) return { ok: false, reason: "invalid" };
  if (Number(expires) < now) return { ok: false, reason: "expired" };
  if (row.linkNonce !== nonce) return { ok: false, reason: "replaced" };
  return { ok: true, id, purpose, row };
}

export type Subscriber = typeof newsletterSubscribers.$inferSelect;

const newNonce = () => randomBytes(9).toString("base64url");

function appUrl() {
  return parseServerEnv().APP_URL;
}

function pageLink(token: string) {
  return `${appUrl()}/newsletter/confirm?token=${encodeURIComponent(token)}`;
}

async function sendConfirm(row: Subscriber, now: Date) {
  const expires = now.getTime() + CONFIRM_HOURS * 3_600_000;
  await deliverEmail({
    template: "email.newsletter_confirmation",
    event: "newsletter.confirm",
    userId: null,
    to: row.email,
    mail: await renderNewsletterConfirm({
      appUrl: appUrl(),
      confirmUrl: pageLink(linkToken(row.id, "confirm", row.linkNonce, expires)),
      firstIssue: formatIssueDay(firstIssueDate(now)),
      linkUntil: `${formatIstDateTime(new Date(expires))} IST`,
      window: `${String(CONFIRM_HOURS)} hours`,
    }),
  });
}

/** A link to change topics, valid for MANAGE_DAYS. */
export function manageLink(row: Pick<Subscriber, "id" | "linkNonce">, now = Date.now()): string {
  return pageLink(linkToken(row.id, "manage", row.linkNonce, now + MANAGE_DAYS * 86_400_000));
}

async function sendManage(row: Subscriber, now: Date) {
  await deliverEmail({
    template: "email.newsletter_manage",
    event: "newsletter.manage",
    userId: null,
    to: row.email,
    mail: await renderNewsletterManage({
      appUrl: appUrl(),
      manageUrl: manageLink(row, now.getTime()),
      window: `${String(MANAGE_DAYS)} days`,
    }),
  });
}

export class NewsletterError extends Error {
  constructor(
    readonly code: "invalid_email",
    message: string,
  ) {
    super(message);
  }
}

/**
 * Signs an address up. New, pending and unsubscribed addresses get a confirmation link ("sent"); a confirmed address
 * gets a link to change its topics ("already"), as drawn in 743:7293.
 */
export async function subscribe(input: {
  email: string;
  topics: readonly string[];
  source: string;
  now?: Date;
}): Promise<"sent" | "already"> {
  const email = input.email.trim().toLowerCase();
  if (!isEmailAddress(email)) {
    throw new NewsletterError("invalid_email", "Enter a full email address, like name@company.in");
  }
  const now = input.now ?? new Date();
  const topics = cleanTopics(input.topics);
  const db = getDb();
  const [existing] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));
  if (existing?.status === "confirmed") {
    const [row] = await db
      .update(newsletterSubscribers)
      .set({ linkNonce: newNonce() })
      .where(eq(newsletterSubscribers.id, existing.id))
      .returning();
    if (row) await sendManage(row, now);
    return "already";
  }
  const values = {
    email,
    status: "pending",
    topics,
    source: input.source,
    consentVersion: NEWSLETTER_CONSENT_VERSION,
    linkNonce: newNonce(),
    unsubscribedAt: null,
  };
  const [row] = existing
    ? await db.update(newsletterSubscribers).set(values).where(eq(newsletterSubscribers.id, existing.id)).returning()
    : await db.insert(newsletterSubscribers).values(values).returning();
  if (!row) throw new Error("Sign-up not saved");
  await audit(db, {
    actorId: null,
    action: "newsletter.signup",
    resourceType: "newsletter_subscriber",
    resourceId: row.id,
    after: { source: input.source, topics, consentVersion: NEWSLETTER_CONSENT_VERSION },
  });
  await sendConfirm(row, now);
  return "sent";
}

export interface OpenedLink {
  subscriber: Pick<Subscriber, "email" | "topics" | "tenderDigest" | "monthlyNote" | "status">;
  /** The date of the first issue for someone who just confirmed. */
  firstIssue: string;
  /** Pass back with preference changes. */
  token: string;
  justConfirmed: boolean;
}

/** Opens a confirmation or change-topics link. Confirming sends the welcome email once. */
export async function openLink(
  token: string,
  now = new Date(),
): Promise<{ ok: true; link: OpenedLink } | { ok: false; reason: "invalid" | "expired" | "replaced" }> {
  const check = await checkToken(token, now.getTime());
  if (!check.ok || !check.row) return { ok: false, reason: check.ok ? "invalid" : check.reason };
  let row = check.row;
  let justConfirmed = false;
  if (row.status !== "confirmed") {
    if (check.purpose !== "confirm") return { ok: false, reason: "invalid" };
    const db = getDb();
    const [updated] = await db
      .update(newsletterSubscribers)
      .set({ status: "confirmed", confirmedAt: now, unsubscribedAt: null })
      .where(eq(newsletterSubscribers.id, row.id))
      .returning();
    if (!updated) return { ok: false, reason: "invalid" };
    row = updated;
    justConfirmed = true;
    await audit(db, {
      actorId: null,
      action: "newsletter.confirmed",
      resourceType: "newsletter_subscriber",
      resourceId: row.id,
      after: { consentVersion: row.consentVersion },
    });
    await deliverEmail({
      template: "email.newsletter_welcome",
      event: "newsletter.welcome",
      userId: null,
      to: row.email,
      mail: await renderNewsletterWelcome({
        appUrl: appUrl(),
        manageUrl: manageLink(row, now.getTime()),
        firstIssue: formatIssueDay(firstIssueDate(now)),
        topics: row.topics.map(topicLabel),
      }),
    });
  }
  return {
    ok: true,
    link: {
      subscriber: {
        email: row.email,
        topics: row.topics,
        tenderDigest: row.tenderDigest,
        monthlyNote: row.monthlyNote,
        status: row.status,
      },
      firstIssue: formatIssueDay(firstIssueDate(row.confirmedAt ?? now)),
      token,
      justConfirmed,
    },
  };
}

/** "Save preferences" on the confirm page (448:7157). */
export async function savePreferences(
  token: string,
  prefs: { topics: readonly string[]; tenderDigest: boolean; monthlyNote: boolean },
  now = new Date(),
): Promise<boolean> {
  const check = await checkToken(token, now.getTime());
  if (!check.ok || check.row?.status !== "confirmed") return false;
  const topics = cleanTopics(prefs.topics);
  await getDb()
    .update(newsletterSubscribers)
    .set({ topics, tenderDigest: prefs.tenderDigest, monthlyNote: prefs.monthlyNote })
    .where(eq(newsletterSubscribers.id, check.id));
  return true;
}

/** "This link has expired" (448:7392): sends a fresh link. Never says whether the address is known. */
export async function resendLink(email: string, now = new Date()): Promise<void> {
  const address = email.trim().toLowerCase();
  if (!isEmailAddress(address)) {
    throw new NewsletterError("invalid_email", "Enter a full email address, like name@company.in");
  }
  const db = getDb();
  const [row] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, address));
  if (!row || row.status === "unsubscribed") return;
  const [fresh] = await db
    .update(newsletterSubscribers)
    .set({ linkNonce: newNonce() })
    .where(eq(newsletterSubscribers.id, row.id))
    .returning();
  if (!fresh) return;
  if (fresh.status === "confirmed") await sendManage(fresh, now);
  else await sendConfirm(fresh, now);
}
