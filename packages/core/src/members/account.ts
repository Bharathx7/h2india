import { schema, type Database, type Executor } from "@h2india/db";
import { desc, eq } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import { loadActor } from "../authz/actor";
import { attachFile } from "../files/files";
import { getChoices, getNotifySettings } from "../notify/preferences";
import { PERSONAS, profileProblems, TOPICS, type ProfileFields } from "./rules";

// Profile (545:8, 546:8) and Download my data (step 7.4; used by the data-rights process in step 11.7).

const mp = schema.memberProfiles;
const u = schema.users;

export class ProfileError extends Error {
  constructor(readonly problems: Record<string, string>) {
    super(Object.values(problems)[0] ?? "Check the form");
    this.name = "ProfileError";
  }
}

const text = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const list = (v: unknown, max = 12) =>
  (Array.isArray(v) ? v : [])
    .filter((x): x is string => typeof x === "string" && x.trim() !== "")
    .map((x) => x.trim().slice(0, 60))
    .slice(0, max);

/** Keeps only the fields of the chosen type, cleaned. */
export function cleanProfile(persona: string | null, raw: ProfileFields): ProfileFields {
  const out: ProfileFields = { location: text(raw.location), headline: text(raw.headline, 80) };
  if (persona === "researcher") {
    Object.assign(out, {
      affiliation: text(raw.affiliation),
      lab: text(raw.lab),
      expertise: list(raw.expertise),
      links: (raw.links ?? [])
        .slice(0, 10)
        .map((l) => ({ title: text(l.title, 160) ?? "", url: text(l.url, 300) ?? "" }))
        .filter((l) => l.url),
      openToCollaboration: Boolean(raw.openToCollaboration),
    });
  } else if (persona === "student") {
    Object.assign(out, {
      institution: text(raw.institution),
      programme: text(raw.programme),
      graduationYear: Number.isInteger(raw.graduationYear) ? raw.graduationYear : undefined,
      internships: Boolean(raw.internships),
    });
  } else if (persona === "professional") {
    Object.assign(out, {
      organisation: text(raw.organisation),
      role: text(raw.role),
      expertise: list(raw.expertise),
      speaking: Boolean(raw.speaking),
      consulting: Boolean(raw.consulting),
    });
  }
  if (raw.photoFileId) out.photoFileId = raw.photoFileId;
  return out;
}

export interface ProfileInput {
  name: string;
  persona: string | null;
  interests: string[];
  listed: boolean;
  fields: ProfileFields;
  /** A newly uploaded photo, or null to remove the photo. */
  photo?: { fileId: string } | null;
}

/** Saves the profile. Listing in the people directory changes only here, by the member, and is audited (M24). */
export async function saveProfile(db: Database, userId: string, input: ProfileInput, context?: RequestContext) {
  const persona = PERSONAS.some((p) => p.value === input.persona) ? input.persona : null;
  const fields = cleanProfile(persona, input.fields);
  const problems = profileProblems({ name: input.name, persona, fields });
  if (Object.keys(problems).length) throw new ProfileError(problems);
  const interests = input.interests.filter((t) => TOPICS.some((x) => x.value === t));
  const [before] = await db.select().from(mp).where(eq(mp.userId, userId));
  if (input.photo) {
    await attachFile(db, {
      actor: await loadActor(db, userId),
      fileId: input.photo.fileId,
      kind: "profile_photo",
      attachedType: "member_profile",
      attachedId: userId,
    });
    fields.photoFileId = input.photo.fileId;
  } else if (input.photo === null) {
    delete fields.photoFileId;
  } else if (before?.profile.photoFileId) {
    fields.photoFileId = before.profile.photoFileId as string;
  }
  await db.transaction(async (tx) => {
    await tx
      .update(u)
      .set({ name: input.name.trim().slice(0, 120) })
      .where(eq(u.id, userId));
    await tx
      .insert(mp)
      .values({ userId, persona, topics: interests, listed: input.listed, profile: { ...fields } })
      .onConflictDoUpdate({
        target: mp.userId,
        set: { persona, topics: interests, listed: input.listed, profile: { ...fields }, updatedAt: new Date() },
      });
    if ((before?.listed ?? false) !== input.listed) {
      await audit(tx, {
        actorId: userId,
        action: input.listed ? "member.listed" : "member.unlisted",
        resourceType: "member_profile",
        resourceId: userId,
        before: { listed: before?.listed ?? false },
        after: { listed: input.listed },
        context,
      });
    }
  });
}

/**
 * Download my data (step 7.4): everything this member gave us or chose, and nothing about anyone else. Each section
 * reads only rows with this member's id (or, for the newsletter, their own address).
 */
export async function exportMemberData(db: Executor, userId: string) {
  const [person] = await db
    .select({ name: u.name, email: u.email, mobile: u.mobile, joined: u.createdAt })
    .from(u)
    .where(eq(u.id, userId));
  if (!person) throw new Error("No such account");
  const [profile, follows, saved, alerts, registrations, newsletter, choices, settings] = await Promise.all([
    db.select().from(mp).where(eq(mp.userId, userId)),
    db.select().from(schema.follows).where(eq(schema.follows.userId, userId)),
    db.select().from(schema.savedItems).where(eq(schema.savedItems.userId, userId)),
    db.select().from(schema.alerts).where(eq(schema.alerts.userId, userId)).orderBy(desc(schema.alerts.createdAt)),
    db.select().from(schema.webinarRegistrations).where(eq(schema.webinarRegistrations.userId, userId)),
    db
      .select({
        email: schema.newsletterSubscribers.email,
        status: schema.newsletterSubscribers.status,
        topics: schema.newsletterSubscribers.topics,
      })
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.email, person.email.toLowerCase())),
    getChoices(db, userId),
    getNotifySettings(db, userId),
  ]);
  const p = profile[0];
  return {
    exportedAt: new Date().toISOString(),
    account: { name: person.name, email: person.email, mobile: person.mobile, joined: person.joined.toISOString() },
    profile: p ? { type: p.persona, interests: p.topics, states: p.states, listed: p.listed, fields: p.profile } : null,
    follows: follows.map((f) => ({
      type: f.targetType,
      name: f.label,
      level: f.level,
      since: f.createdAt.toISOString(),
    })),
    saved: saved.map((s) => ({ type: s.targetType, title: s.title, link: s.href, saved: s.createdAt.toISOString() })),
    alerts: alerts.map((a) => ({
      name: a.label,
      type: a.indexUid,
      words: a.query,
      filters: a.filters,
      channels: a.channels,
      frequency: a.frequency,
      on: a.active && !a.pausedAt,
      deleted: a.deletedAt?.toISOString() ?? null,
      created: a.createdAt.toISOString(),
    })),
    eventRegistrations: registrations.map((r) => ({
      event: r.eventSlug,
      kind: r.kind,
      name: r.name,
      email: r.email,
      organisation: r.organisation,
      role: r.role,
      mobile: r.mobile,
      consent: r.consentText,
      registered: r.createdAt.toISOString(),
      cancelled: r.cancelledAt?.toISOString() ?? null,
    })),
    newsletter,
    notificationChoices: choices,
    quietHours: settings,
  };
}

export type MemberExport = Awaited<ReturnType<typeof exportMemberData>>;

/** The same export as CSV: one row per record, with the section it came from. */
export function exportCsv(data: MemberExport): string {
  const rows: string[][] = [["section", "item", "details"]];
  const add = (section: string, item: string, details: unknown) =>
    rows.push([section, item, typeof details === "string" ? details : JSON.stringify(details)]);
  add("account", data.account.name, data.account);
  if (data.profile) add("profile", data.profile.type ?? "", data.profile);
  for (const f of data.follows) add("follows", f.name, f);
  for (const s of data.saved) add("saved", s.title, s);
  for (const a of data.alerts) add("alerts", a.name, a);
  for (const r of data.eventRegistrations) add("event registrations", r.event, r);
  for (const n of data.newsletter) add("newsletter", n.email, n);
  add("notification choices", "", data.notificationChoices);
  add("quiet hours", "", data.quietHours);
  const cell = (v: string) =>
    /[",\n]/.test(v) || /^[=+\-@]/.test(v) ? `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"` : v;
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
