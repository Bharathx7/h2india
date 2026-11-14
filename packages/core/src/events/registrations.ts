import { parseServerEnv } from "@h2india/config";
import { schema, type Executor } from "@h2india/db";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";
import { JOB_ROLES } from "../companies/client";
import { startDeadline } from "../clocks/clocks";

// Webinar registration (step 5.7; 732:521, 732:939, closed or full 827:14696). The form asks only for what the design
// shows. Seats are counted in the same transaction as the insert, under a lock on the webinar, so the last seat can't
// be given twice. Reminders are deadlines (step 3.8): one day and one hour before the start, so a worker restart can't
// lose or double-send them (see reminders.ts).

const { webinarRegistrations: r } = schema;

/** The words of the sponsor tick box (732:521) and their version; bump the version whenever the words change. */
export const WEBINAR_CONSENT = (sponsor: string) =>
  `Share my name, work email and organisation with ${sponsor}, the sponsor`;
export const WEBINAR_CONSENT_VERSION = "webinar-sponsor-v1";

/** "Join link opens 15 minutes before" (732:521). */
export const JOIN_OPENS_MINUTES = 15;
export const REMINDER_TYPE = "webinarReminder";

export interface WebinarFacts {
  id: number;
  slug: string;
  startsAt: Date;
  /** Seats; null means no limit. */
  capacity: number | null;
  /** The editor closed registration, or it's over. */
  open: boolean;
  sponsor: string | null;
}

export interface RegistrationInput {
  name: string;
  email: string;
  organisation: string;
  role: string;
  mobile: string;
  sponsorConsent: boolean;
  userId?: string | null;
}

export type RegistrationField = "name" | "email" | "organisation" | "role" | "mobile";

export type RegistrationResult =
  | { ok: true; id: string; kind: "live" | "replay"; already: boolean; mobile: string | null }
  | { ok: false; reason: "full" | "closed" }
  | { ok: false; reason: "invalid"; errors: Partial<Record<RegistrationField, string>> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "+91 98765 43210" or "9876543210" → "+919876543210"; null when it isn't an Indian mobile number. */
export function indianMobile(text: string): string | null {
  const digits = text.replace(/[\s-]/g, "").replace(/^\+?91/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

export function checkRegistration(
  input: RegistrationInput,
  { member, replayOnly = false }: { member: boolean; replayOnly?: boolean },
):
  | { ok: true; values: RegistrationInput & { mobile: string } }
  | { ok: false; errors: Partial<Record<RegistrationField, string>> } {
  const errors: Partial<Record<RegistrationField, string>> = {};
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const organisation = input.organisation.trim();
  const role = input.role.trim();
  // "Email me the replay" (827:14696) and the replay gate (733:22) ask only for a work email.
  if (!member && !replayOnly && name.length < 2) errors.name = "Enter your full name";
  if (!member && (!EMAIL.test(email) || email.length > 254))
    errors.email = "Enter your work email, like name@company.in";
  if (!member && !replayOnly && organisation.length < 2) errors.organisation = "Enter your company, lab or agency";
  if (role && !(JOB_ROLES as readonly string[]).includes(role)) errors.role = "Choose your role from the list";
  let mobile = "";
  if (input.mobile.trim()) {
    const m = indianMobile(input.mobile);
    if (!m) errors.mobile = "Enter a 10-digit Indian mobile number";
    else mobile = m;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    values: {
      name: (name || email.split("@")[0] || email).slice(0, 120),
      email,
      organisation: organisation.slice(0, 160),
      role,
      mobile,
      sponsorConsent: input.sponsorConsent,
      userId: input.userId ?? null,
    },
  };
}

/** Seats taken (live registrations not cancelled). */
export async function seatsTaken(ex: Executor, eventId: number): Promise<number> {
  const [row] = await ex
    .select({ n: count() })
    .from(r)
    .where(and(eq(r.eventId, eventId), eq(r.kind, "live"), isNull(r.cancelledAt)));
  return row?.n ?? 0;
}

/**
 * Registers someone for a webinar. A full or closed webinar refuses a seat (`wantReplay` registers for the replay
 * instead, 827:14696). Registering again with the same email returns the existing registration.
 */
export async function registerForWebinar(
  db: Executor,
  webinar: WebinarFacts,
  input: RegistrationInput,
  opts: { member: boolean; wantReplay?: boolean; now?: Date },
): Promise<RegistrationResult> {
  const checked = checkRegistration(input, { member: opts.member, replayOnly: opts.wantReplay });
  if (!checked.ok) return { ok: false, reason: "invalid", errors: checked.errors };
  const v = checked.values;
  const now = opts.now ?? new Date();
  return db.transaction(async (tx) => {
    // One registration at a time per webinar, so the seat count can't race.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('webinar'), ${webinar.id})`);
    const [existing] = await tx
      .select()
      .from(r)
      .where(and(eq(r.eventId, webinar.id), sql`lower(${r.email}) = ${v.email}`));
    if (existing && !existing.cancelledAt) {
      return {
        ok: true,
        id: existing.id,
        kind: existing.kind as "live" | "replay",
        already: true,
        mobile: existing.mobile,
      };
    }
    let kind: "live" | "replay" = "live";
    if (opts.wantReplay) kind = "replay";
    else if (!webinar.open || webinar.startsAt <= now) return { ok: false, reason: "closed" };
    else if (webinar.capacity !== null && (await seatsTaken(tx, webinar.id)) >= webinar.capacity) {
      return { ok: false, reason: "full" };
    }
    const consent = Boolean(webinar.sponsor) && v.sponsorConsent;
    const values = {
      eventId: webinar.id,
      eventSlug: webinar.slug,
      kind,
      userId: v.userId ?? null,
      name: v.name,
      email: v.email,
      organisation: v.organisation || null,
      role: v.role || null,
      mobile: kind === "live" ? v.mobile || null : null,
      sponsorConsent: consent,
      consentText: consent && webinar.sponsor ? WEBINAR_CONSENT(webinar.sponsor) : null,
      consentVersion: consent ? WEBINAR_CONSENT_VERSION : null,
    };
    // A cancelled registration is brought back rather than duplicated (one per webinar and email).
    const [row] = existing
      ? await tx
          .update(r)
          .set({ ...values, cancelledAt: null, createdAt: now, dayReminderAt: null, hourReminderAt: null })
          .where(eq(r.id, existing.id))
          .returning()
      : await tx.insert(r).values(values).returning();
    if (!row) throw new Error("registration insert returned nothing");
    if (kind === "live") {
      const hour = new Date(webinar.startsAt.getTime() - 3_600_000);
      const day = new Date(webinar.startsAt.getTime() - 86_400_000);
      if (hour > now) {
        await startDeadline(tx, {
          type: REMINDER_TYPE,
          subjectType: "webinar-registration",
          subjectId: row.id,
          dueAt: hour,
          warnAt: day > now ? day : null,
        });
      }
    }
    return { ok: true, id: row.id, kind, already: false, mobile: row.mobile };
  });
}

export async function registrationFor(ex: Executor, eventId: number, email: string) {
  const [row] = await ex
    .select()
    .from(r)
    .where(and(eq(r.eventId, eventId), sql`lower(${r.email}) = ${email.trim().toLowerCase()}`, isNull(r.cancelledAt)));
  return row ?? null;
}

export async function registrationById(ex: Executor, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await ex.select().from(r).where(eq(r.id, id));
  return row ?? null;
}

/** Marks a reminder sent; true only for the first caller, so a retried job never sends it twice. */
export async function claimReminder(ex: Executor, id: string, which: "day" | "hour"): Promise<boolean> {
  const column = which === "day" ? r.dayReminderAt : r.hourReminderAt;
  const rows = await ex
    .update(r)
    .set(which === "day" ? { dayReminderAt: new Date() } : { hourReminderAt: new Date() })
    .where(and(eq(r.id, id), isNull(column), isNull(r.cancelledAt)))
    .returning({ id: r.id });
  return rows.length > 0;
}

// ---- the personal links in the emails (join and replay): signed, so the registration id alone isn't enough

function sign(id: string, purpose: string): string {
  return createHmac("sha256", parseServerEnv().AUTH_SECRET)
    .update(`webinar:${purpose}:${id}`)
    .digest("base64url")
    .slice(0, 32);
}

export function registrationToken(id: string, purpose: "join" | "replay"): string {
  return `${id}.${sign(id, purpose)}`;
}

/** The registration id in a signed token, or null when the token is wrong. */
export function readRegistrationToken(token: string | null | undefined, purpose: "join" | "replay"): string | null {
  const [id, mac] = (token ?? "").split(".");
  if (!id || !mac) return null;
  const expected = Buffer.from(sign(id, purpose));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}

/** When the join link opens. */
export const joinOpensAt = (startsAt: Date) => new Date(startsAt.getTime() - JOIN_OPENS_MINUTES * 60_000);
